import { IOneInchApi, SwapRequest, SwapResponse } from './types';
export declare abstract class OneInchApi implements IOneInchApi {
    protected readonly baseUrl: string;
    protected constructor(baseUrl: string);
    protected buildUrl<T extends {}>(path: string, request?: T): string;
    protected get<ResponseType extends {}, RequestType extends {}>(path: string, request?: RequestType): Promise<ResponseType>;
    getSwap(request: SwapRequest): Promise<SwapResponse>;
}
