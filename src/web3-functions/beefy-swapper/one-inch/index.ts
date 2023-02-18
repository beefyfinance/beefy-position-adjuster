import { IOneInchApi, RateLimitOptions } from './types';
import PQueue from 'p-queue';
import { RateLimitedOneInchApi } from './RateLimitedOneInchApi';

const DEFAULT_API_URL = 'https://api.1inch.io';

const API_QUEUE_CONFIG: RateLimitOptions = {
  concurrency: 1,
  intervalCap: 1,
  interval: 3000,
  carryoverConcurrencyCount: true,
  autoStart: true,
  timeout: 10 * 1000,
  throwOnTimeout: true,
};

const API_QUEUE_CONFIG_CUSTOM: RateLimitOptions = {
  ...API_QUEUE_CONFIG,
  concurrency: 30,
  intervalCap: 60,
  interval: 1000,
};

const apiByChainId: Record<number, IOneInchApi> = {};
let apiQueue: PQueue | undefined;

export function getOneInchApi(
  apiUrl: string,
  chainId: number,
  rateLimitOptions?: RateLimitOptions
): IOneInchApi {
  if (!apiByChainId[chainId]) {
    if (!apiQueue) {
      apiQueue = new PQueue(
        rateLimitOptions ??
          (apiUrl === DEFAULT_API_URL ? API_QUEUE_CONFIG : API_QUEUE_CONFIG_CUSTOM)
      );
    }

    const baseUrl = `${apiUrl}/v5.0/${chainId}`;
    apiByChainId[chainId] = new RateLimitedOneInchApi(baseUrl, apiQueue);
  }

  return apiByChainId[chainId];
}
