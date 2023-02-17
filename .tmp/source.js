// src/web3-functions/beefy-swapper/index.ts
import { Web3Function } from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract, utils } from "ethers";
import ky from "ky";
import { addressBookByChainId } from "blockchain-addressbook";
import PQueue from "p-queue";
import {
  Contract as MulticallContract,
  Provider as MulticallProvider
} from "@kargakis/ethers-multicall";
var SWAPPER_ABI = [
  {
    inputs: [],
    name: "settings",
    outputs: [
      {
        internalType: "uint256",
        name: "gasPriceLimit",
        type: "uint256"
      },
      {
        internalType: "uint256",
        name: "threshold",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "_tokens",
        type: "address[]"
      },
      {
        internalType: "bytes[]",
        name: "_data",
        type: "bytes[]"
      }
    ],
    name: "swap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];
var ERC_20 = [
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address"
      }
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "balance",
        type: "uint256"
      }
    ],
    payable: false,
    stateMutability: "view",
    type: "function"
  }
];
var SWAP_MIN_INPUT_AMOUNT = 1e3;
var SWAP_LEAVE = 1;
var SWAP_SLIPPAGE = 1;
var MAX_SWAPS_PER_TX = 3;
var oneInchQueue = new PQueue({
  concurrency: 1,
  intervalCap: 1,
  interval: 1e3,
  carryoverConcurrencyCount: true,
  autoStart: true,
  timeout: 10 * 1e3,
  throwOnTimeout: true
});
Web3Function.onRun(async (context) => {
  const { userArgs, gelatoArgs, provider } = context;
  const swapperAddress = await context.secrets.get("SWAPPER");
  const swapperInterface = new utils.Interface(SWAPPER_ABI);
  const settings = await fetchSettings(swapperAddress, swapperInterface, provider);
  if (!settings) {
    return { canExec: false, message: "Error fetching settings" };
  }
  const { gasPriceLimit, threshold } = settings;
  if (gasPriceLimit.gt(0) && gelatoArgs.gasPrice.gt(gasPriceLimit)) {
    return {
      canExec: false,
      message: `Gas price too high: ${gelatoArgs.gasPrice.toString()} > ${gasPriceLimit.toString()}`
    };
  }
  const TARGET_TOKEN = "USDC";
  const chainId = 10;
  const chainTokensById = addressBookByChainId[chainId].tokens;
  const targetToken = chainTokensById[TARGET_TOKEN];
  const sourceTokens = uniqBy(Object.values(chainTokensById), (t) => t.address).filter(
    (t) => t.address !== targetToken.address
  );
  const tokensWithBalance = (await fetchTokensWithBalance(sourceTokens, provider, chainId, swapperAddress)).filter((tokenAmount) => tokenAmount.amount.gte(SWAP_MIN_INPUT_AMOUNT)).map((tokenAmount) => {
    tokenAmount.amount = tokenAmount.amount.sub(SWAP_LEAVE);
    return tokenAmount;
  });
  if (tokensWithBalance.length === 0) {
    return {
      canExec: false,
      message: `No tokens with balance >=${SWAP_MIN_INPUT_AMOUNT}wei to swap`
    };
  }
  const tokensToCheck = sampleSize(tokensWithBalance, MAX_SWAPS_PER_TX);
  console.log(`Quoting ${tokensToCheck.map((twb) => twb.token.symbol).join(", ")} of ${tokensWithBalance.map((twb) => twb.token.symbol).join(", ")}`);
  const swapInputAddresses = [];
  const swapData = [];
  for (const tokenWithBalance of tokensToCheck) {
    const swap = await fetchSwap(
      chainId,
      swapperAddress,
      tokenWithBalance,
      targetToken,
      SWAP_SLIPPAGE
    );
    if (swap) {
      const outputAmount = BigNumber.from(swap.toTokenAmount);
      if (outputAmount.gt(threshold)) {
        swapInputAddresses.push(tokenWithBalance.token.address);
        swapData.push(swap.tx.data);
        if (swapData.length >= MAX_SWAPS_PER_TX) {
          break;
        }
      }
    }
  }
  if (swapData.length == 0) {
    return { canExec: false, message: "No tokens over swappable threshold" };
  }
  return {
    canExec: true,
    callData: swapperInterface.encodeFunctionData("swap", [swapInputAddresses, swapData])
  };
});
async function fetchSettings(swapperAddress, swapperInterface, provider) {
  try {
    const swapperContract = new Contract(swapperAddress, swapperInterface, provider);
    const settings = await swapperContract.settings();
    if (settings && "gasPriceLimit" in settings && "threshold" in settings) {
      return settings;
    }
  } catch {
  }
  return null;
}
function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}
function sampleSize(items, n) {
  return shuffle(items).slice(0, n);
}
function uniqBy(items, keyFn) {
  return [...new Map(items.map((item) => [keyFn(item), item])).values()];
}
async function fetchSwap(chainId, fromAddress, input, output, slippage = 1) {
  try {
    const params = new URLSearchParams({
      amount: input.amount.toString(),
      fromTokenAddress: input.token.address,
      toTokenAddress: output.address,
      fromAddress,
      slippage: slippage.toString(),
      disableEstimate: "true"
    });
    const url = `https://api.1inch.io/v5.0/${chainId}/swap?${params.toString()}`;
    return await oneInchQueue.add(
      () => ky.get(url, { timeout: 5e3, retry: 0 }).json()
    );
  } catch (err) {
    console.error(err);
    return null;
  }
}
async function fetchTokensWithBalance(tokens, provider, chainId, swapperAddress) {
  const multicall = new MulticallProvider(provider, chainId);
  const calls = tokens.map((token) => {
    const tokenContract = new MulticallContract(token.address, ERC_20);
    return tokenContract.balanceOf(swapperAddress);
  });
  const results = await multicall.all(calls);
  return tokens.map((token, i) => ({
    token,
    amount: BigNumber.from(results[i] || "0")
  }));
}
