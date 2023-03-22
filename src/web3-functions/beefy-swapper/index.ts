import { Web3Function, Web3FunctionContext } from '@gelatonetwork/web3-functions-sdk';
import { BigNumber, BigNumberish, utils } from 'ethers';
import { addressBookByChainId } from 'blockchain-addressbook';
import {
  Contract as MulticallContract,
  ContractCall,
  Provider as MulticallProvider,
} from '@kargakis/ethers-multicall';
import Token from 'blockchain-addressbook/build/types/token';
import { Provider } from '@ethersproject/abstract-provider';
import {
  ContextWithUserArgs,
  Secrets,
  TokenAmount,
  UserArgs,
  Web3FunctionResultSuccess,
} from './types';
import { erc20Abi, swapperAbi } from './abi';
import { getOneInchApi } from './one-inch';
import { SwapResponse } from './one-inch/types';
import { uniqBy, chunk } from 'lodash';
import {
  fetchSettings,
  getContextWithUserArgs,
  getSecrets,
  isErrorLike,
  isValidChainId,
  sanitizeError,
  sanitizeValue,
} from './utils';
import { installConsoleSanitizer } from './console';

const SWAP_MIN_INPUT_AMOUNT: BigNumberish = 1000;
const SWAP_LEAVE: BigNumberish = 1;
const SWAP_SLIPPAGE: number = 1;
const MAX_SWAPS_PER_TX: number = 3;
const BALANCE_BATCH_SiZE: number = 256;

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const secrets = await getSecrets(context);
  installConsoleSanitizer(secrets);

  try {
    // any console.log() or error thrown from here *should* be automatically sanitized
    const contextWithUserArgs = getContextWithUserArgs(context);
    return await run(contextWithUserArgs, secrets);
  } catch (e: unknown) {
    // console.error(e);
    return {
      canExec: false,
      message: isErrorLike(e) ? sanitizeError(e, secrets, false) : sanitizeValue(e, secrets),
    };
  }
});

async function run(
  context: ContextWithUserArgs<UserArgs>,
  secrets: Secrets
): Promise<Web3FunctionResultSuccess> {
  const { userArgs, gelatoArgs, provider } = context;
  const { oneInchApiUrl } = secrets;
  const { swapper: swapperAddress, targetToken: targetTokenId } = userArgs;
  const { chainId } = gelatoArgs;
  const chainIdKey = chainId.toString();

  if (!isValidChainId(chainIdKey)) {
    throw new Error(`Unsupported chainId: ${chainId}`);
  }

  const swapperInterface = new utils.Interface(swapperAbi);
  const settings = await fetchSettings(swapperAddress, swapperInterface, provider);
  if (!settings) {
    throw new Error('Error fetching settings');
  }

  const { gasPriceLimit, threshold } = settings;
  // <= 0 means no gas limit
  if (gasPriceLimit.gt(0) && gelatoArgs.gasPrice.gt(gasPriceLimit)) {
    throw new Error(
      `Gas price too high: ${gelatoArgs.gasPrice.toString()} > ${gasPriceLimit.toString()}`
    );
  }

  const chainTokensById: Record<string, Token> = addressBookByChainId[chainIdKey].tokens;
  const targetToken: Token = chainTokensById[targetTokenId];
  if (!targetToken) {
    throw new Error(`Unsupported target token: ${targetTokenId} for chainId: ${chainIdKey}`);
  }

  const sourceTokens: Token[] = uniqBy(Object.values(chainTokensById), t => t.address).filter(
    t => t.address !== targetToken.address
  );

  const tokensWithBalance = (
    await fetchTokensWithBalance(sourceTokens, provider, chainId, swapperAddress)
  )
    .filter(tokenAmount => tokenAmount.amount.gte(SWAP_MIN_INPUT_AMOUNT)) // Filter out tokens with balance < min input amount
    .map(tokenAmount => {
      // Leave some amount in the contract (for gas savings)
      tokenAmount.amount = tokenAmount.amount.sub(SWAP_LEAVE);
      return tokenAmount;
    });

  if (tokensWithBalance.length === 0) {
    throw new Error(`No tokens with balance >=${SWAP_MIN_INPUT_AMOUNT}wei to swap`);
  }

  console.log(`Quoting ${tokensWithBalance.map(twb => twb.token.symbol).join(', ')}`);

  const swapInputAddresses: string[] = [];
  const swapData: string[] = [];

  for (const tokenWithBalance of tokensWithBalance) {
    const swap = await fetchSwap(
      oneInchApiUrl,
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
    throw new Error(
      `No tokens over swappable threshold ${utils.formatUnits(threshold, targetToken.decimals)} ${
        targetToken.symbol
      }`
    );
  }

  // Return execution call data
  return {
    canExec: true,
    callData: swapperInterface.encodeFunctionData('swap', [swapInputAddresses, swapData]),
  };
}

async function fetchSwap(
  apiUrl: string,
  chainId: number,
  fromAddress: string,
  input: TokenAmount,
  output: Token,
  slippage: number = 1
): Promise<SwapResponse | null | void> {
  try {
    const api = getOneInchApi(apiUrl, chainId);
    return api.getSwap({
      amount: input.amount.toString(),
      fromTokenAddress: input.token.address,
      toTokenAddress: output.address,
      fromAddress,
      slippage,
      disableEstimate: true,
    });
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function fetchTokensWithBalance(
  tokens: Token[],
  provider: Provider,
  chainId: number,
  swapperAddress: string
): Promise<TokenAmount[]> {
  const multicall = new MulticallProvider(provider, chainId);

  const calls: ContractCall[] = tokens.map(token => {
    const tokenContract = new MulticallContract(token.address, erc20Abi);
    return tokenContract.balanceOf(swapperAddress);
  });

  const results = (
    await Promise.all(chunk(calls, BALANCE_BATCH_SiZE).map(chunk => multicall.all(chunk)))
  ).flat();

  return tokens.map((token, i) => ({
    token,
    amount: BigNumber.from(results[i] || '0'),
  }));
}
