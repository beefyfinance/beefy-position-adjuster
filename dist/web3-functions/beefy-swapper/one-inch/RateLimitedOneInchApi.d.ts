import { OneInchApi } from './OneInchApi';
import PQueue from 'p-queue';
export declare class RateLimitedOneInchApi extends OneInchApi {
    protected readonly queue: PQueue;
    constructor(baseUrl: string, queue: PQueue);
    protected get<ResponseType extends {}, RequestType extends {}>(path: string, request?: RequestType): Promise<ResponseType>;
}
