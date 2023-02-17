import { Web3Function, Web3FunctionContext } from '@gelatonetwork/web3-functions-sdk';
import { BigNumber, BigNumberish, Contract, ContractInterface, utils } from 'ethers';
import ky from 'ky';
import { addressBookByChainId } from 'blockchain-addressbook';
import PQueue from 'p-queue'
import {
  Contract as MulticallContract,
  ContractCall,
  Provider as MulticallProvider,
} from '@kargakis/ethers-multicall';
import Token from 'blockchain-addressbook/build/types/token';
import { Provider } from '@ethersproject/abstract-provider';

type TokenWithAmount = {
  token: Token;
  amount: BigNumber;
};

type SwapToken = {
  address: string;
  decimals: number;
  logoURI: string;
  name: string;
  symbol: string;
  tags: string[];
};

type SwapTx = {
  from: string;
  to: string;
  data: string;
  value: string;
  gasPrice: string;
  gas: string;
};

type SwapResponse = {
  fromToken: SwapToken;
  fromTokenAmount: string;
  toToken: SwapToken;
  toTokenAmount: string;
  protocols: string[];
  tx: SwapTx;
};

const SWAPPER_ABI = [
  {
    inputs: [],
    name: 'settings',
    outputs: [
      {
        internalType: 'uint256',
        name: 'gasPriceLimit',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'threshold',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: '_tokens',
        type: 'address[]',
      },
      {
        internalType: 'bytes[]',
        name: '_data',
        type: 'bytes[]',
      },
    ],
    name: 'swap',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

const ERC_20 = [
  {
    constant: true,
    inputs: [
      {
        name: '_owner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: 'balance',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

const SWAP_MIN_INPUT_AMOUNT: BigNumberish = 1000;
const SWAP_LEAVE: BigNumberish = 1;
const SWAP_SLIPPAGE: number = 1;
const MAX_SWAPS_PER_TX: number = 3;

const oneInchQueue = new PQueue({
    concurrency: 1,
    intervalCap: 1,
    interval: 1000,
    carryoverConcurrencyCount: true,
    autoStart: true,
    timeout: 10 * 1000,
    throwOnTimeout: true,
  });

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;
  
  // const swapperAddress = await context.secrets.get("SWAPPER") as string;
  const swapperAddress = userArgs.swapper as string;
  const swapperInterface = new utils.Interface(SWAPPER_ABI);

  const settings = await fetchSettings(swapperAddress, swapperInterface, provider);
  if (!settings) {
    return { canExec: false, message: 'Error fetching settings' };
  }

  const { gasPriceLimit, threshold } = settings;

  // <= 0 means no gas limit
  if (gasPriceLimit.gt(0) && gelatoArgs.gasPrice.gt(gasPriceLimit)) {
    return {
      canExec: false,
      message: `Gas price too high: ${gelatoArgs.gasPrice.toString()} > ${gasPriceLimit.toString()}`,
    };
  }

  // const TARGET_TOKEN = "USDC";
  const TARGET_TOKEN = userArgs.targetToken as string;
  // const chainId = 10;
  const chainId = gelatoArgs.chainId;
  const chainTokensById: Token[] = addressBookByChainId[chainId].tokens;
  const targetToken: Token = chainTokensById[TARGET_TOKEN];
  const sourceTokens: Token[] = uniqBy(Object.values(chainTokensById), t => t.address).filter(
    t => t.address !== targetToken.address,
  );

  const tokensWithBalance = (await fetchTokensWithBalance(sourceTokens, provider, chainId, swapperAddress))
    .filter(tokenAmount => tokenAmount.amount.gte(SWAP_MIN_INPUT_AMOUNT)) // Filter out tokens with balance < min input amount
    .map(tokenAmount => {
      // Leave some amount in the contract (for gas savings)
      tokenAmount.amount = tokenAmount.amount.sub(SWAP_LEAVE);
      return tokenAmount;
    });

  if (tokensWithBalance.length === 0) {
    return {
      canExec: false,
      message: `No tokens with balance >=${SWAP_MIN_INPUT_AMOUNT}wei to swap`,
    };
  }

  const tokensToCheck = sampleSize(tokensWithBalance, MAX_SWAPS_PER_TX);
  console.log(`Quoting ${tokensToCheck.map(twb => twb.token.symbol).join(', ')} of ${tokensWithBalance.map(twb => twb.token.symbol).join(', ')}`);

  const swapInputAddresses: string[] = [];
  const swapData: string[] = [];

  for (const tokenWithBalance of tokensToCheck) {
    const swap = await fetchSwap(
      chainId,
      swapperAddress,
      tokenWithBalance,
      targetToken,
      SWAP_SLIPPAGE,
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
    return { canExec: false, message: 'No tokens over swappable threshold' };
  }

  // Return execution call data
  return {
    canExec: true,
    callData: swapperInterface.encodeFunctionData('swap', [swapInputAddresses, swapData]),
  };
});

async function fetchSettings(swapperAddress: string, swapperInterface: ContractInterface, provider: Provider): Promise<{ gasPriceLimit: BigNumber; threshold: BigNumber } | null> {
  try {
    const swapperContract = new Contract(swapperAddress, swapperInterface, provider);
    const settings = await swapperContract.settings();
    if (settings && 'gasPriceLimit' in settings && 'threshold' in settings) {
      return settings;
    }
  } catch {}

  return null;
}

function shuffle<T>(items: T[]): T[] {
   return [...items].sort(() => Math.random() - 0.5);
}
  
  function sampleSize<T>(items: T[], n: number): T[] {
    return shuffle(items).slice(0, n);
}

function uniqBy<T>(items: T[], keyFn: (item: T) => string | number | symbol): T[] {
  return [...new Map(items.map(item => [keyFn(item), item])).values()];
}

async function fetchSwap(
  chainId: number,
  fromAddress: string,
  input: TokenWithAmount,
  output: Token,
  slippage: number = 1,
) : Promise<SwapResponse | null | void> {
  try {
    const params = new URLSearchParams({
      amount: input.amount.toString(),
      fromTokenAddress: input.token.address,
      toTokenAddress: output.address,
      fromAddress,
      slippage: slippage.toString(),
      disableEstimate: 'true',
    });
    const url = `https://api.1inch.io/v5.0/${chainId}/swap?${params.toString()}`;

    return await oneInchQueue.add(() => ky
        .get(url, { timeout: 5_000, retry: 0 })
        .json<SwapResponse>(),
      );
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function fetchTokensWithBalance(
  tokens: Token[],
  provider: Provider,
  chainId: number,
  swapperAddress: string,
): Promise<TokenWithAmount[]> {
  const multicall = new MulticallProvider(provider, chainId);

  const calls: ContractCall[] = tokens.map(token => {
    const tokenContract = new MulticallContract(token.address, ERC_20);
    return tokenContract.balanceOf(swapperAddress);
  });

  const results = await multicall.all(calls);

  return tokens.map((token, i) => ({
    token,
    amount: BigNumber.from(results[i] || '0'),
  }));
}