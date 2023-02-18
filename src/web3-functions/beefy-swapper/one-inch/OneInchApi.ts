import ky from 'ky';
import { IOneInchApi, SwapRequest, SwapResponse } from './types';

export abstract class OneInchApi implements IOneInchApi {
  protected constructor(protected readonly baseUrl: string) {}

  protected buildUrl<T extends {}>(path: string, request?: T): string {
    const url = `${this.baseUrl}${path}`;
    const params = request ? new URLSearchParams(request).toString() : '';
    return params ? `${url}?${params}` : url;
  }

  protected async get<ResponseType extends {}, RequestType extends {}>(
    path: string,
    request?: RequestType
  ): Promise<ResponseType> {
    const url = this.buildUrl(path, request);

    return await ky
      .get(url, {
        timeout: 5_000,
        retry: 0,
        headers: { Accept: 'application/json' },
      })
      .json<ResponseType>();
  }

  async getSwap(request: SwapRequest): Promise<SwapResponse> {
    return await this.get('/swap', request);
  }
}
