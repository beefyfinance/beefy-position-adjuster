import { OneInchApi } from './OneInchApi';
import PQueue from 'p-queue';

export class RateLimitedOneInchApi extends OneInchApi {
  constructor(baseUrl: string, protected readonly queue: PQueue) {
    super(baseUrl);
  }

  protected async get<ResponseType extends {}, RequestType extends {}>(
    path: string,
    request?: RequestType
  ): Promise<ResponseType> {
    return (await this.queue.add(() =>
      super.get<ResponseType, RequestType>(path, request)
    )) as ResponseType;
  }
}
