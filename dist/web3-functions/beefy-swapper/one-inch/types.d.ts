import { Options, QueueAddOptions } from 'p-queue/dist/options';
import { Queue, RunFunction } from 'p-queue/dist/queue';
import PriorityQueue from 'p-queue/dist/priority-queue';
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
export type SwapResponse = {
    fromToken: SwapToken;
    fromTokenAmount: string;
    toToken: SwapToken;
    toTokenAmount: string;
    protocols: string[];
    tx: SwapTx;
};
export type SwapRequest = {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    fromAddress: string;
    slippage: number;
    fee?: string;
    referrerAddress?: string;
    disableEstimate?: boolean;
};
export interface IOneInchApi {
    getSwap(request: SwapRequest): Promise<SwapResponse>;
}
export type RateLimitOptions<QueueType extends Queue<RunFunction, EnqueueOptionsType> = PriorityQueue, EnqueueOptionsType extends QueueAddOptions = QueueAddOptions> = Options<QueueType, EnqueueOptionsType>;
export {};
