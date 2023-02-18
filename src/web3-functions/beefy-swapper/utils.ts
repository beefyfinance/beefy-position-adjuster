import { Web3FunctionContext } from '@gelatonetwork/web3-functions-sdk';
import { ContextWithUserArgs, ErrorLike, Secrets, Settings, UserArgs } from './types';
import { Contract, ContractInterface } from 'ethers';
import { Provider } from '@ethersproject/abstract-provider';
import replaceAll from 'string-replace-all';
import { addressBookByChainId } from 'blockchain-addressbook';

export function getContextWithUserArgs(
  context: Web3FunctionContext
): ContextWithUserArgs<UserArgs> {
  const generic = context.userArgs;

  if (!generic.swapper || typeof generic.swapper !== 'string') {
    throw new Error('swapper is required');
  }

  if (!generic.targetToken || typeof generic.targetToken !== 'string') {
    throw new Error('targetToken is required');
  }

  return {
    ...context,
    userArgs: {
      swapper: generic.swapper,
      targetToken: generic.targetToken,
    },
  };
}

export async function getSecrets<T extends Web3FunctionContext>(context: T): Promise<Secrets> {
  const oneInchApiUrl = await context.secrets.get('ONE_INCH_API_URL');

  if (!oneInchApiUrl) {
    throw new Error('Secret ONE_INCH_API_URL is required');
  }

  return {
    oneInchApiUrl,
  };
}

export async function fetchSettings(
  swapperAddress: string,
  swapperInterface: ContractInterface,
  provider: Provider
): Promise<Settings> {
  const swapperContract = new Contract(swapperAddress, swapperInterface, provider);
  const settings = await swapperContract.settings();
  if (settings && 'gasPriceLimit' in settings && 'threshold' in settings) {
    return settings;
  }

  throw new Error('Error fetching settings');
}

export function sanitizeText(message: string, secrets: Record<string, string>): string {
  return Object.entries(secrets).reduce((newMessage, [key, value]) => {
    return replaceAll(newMessage, value, `{secret:${key}}`);
  }, message);
}

export function isErrorLike(value: unknown): value is ErrorLike {
  return typeof value === 'object' && value !== null && 'message' in value;
}

export function valueToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  } else if (value === null) {
    return 'null';
  } else if (typeof value === 'undefined') {
    return 'undefined';
  } else if (isErrorLike(value)) {
    return errorToString(value);
  }

  return JSON.stringify(value);
}

export function sanitizeValue(value: unknown, secrets: Record<string, string>): string {
  return sanitizeText(valueToString(value), secrets);
}

export function errorToString(error: ErrorLike, includeStack: boolean = true): string {
  if (includeStack && error.stack) {
    return `${error.message}\n${error.stack}`;
  }

  return `${error.message}`;
}

export function sanitizeError(
  error: ErrorLike,
  secrets: Record<string, string>,
  includeStack: boolean = true
): string {
  return sanitizeText(errorToString(error, includeStack), secrets);
}

export function isValidChainId(
  chainId: number | string
): chainId is keyof typeof addressBookByChainId {
  return chainId in addressBookByChainId;
}
