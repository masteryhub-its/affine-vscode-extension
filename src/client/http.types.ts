import { HttpMethod } from '../utils/enums/http-method.enum';

export { HttpMethod };

export interface HttpRequest {
  readonly url: string;
  readonly method: HttpMethod;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
  /** True for a request that only reads, even though it is not a GET (for example a GraphQL query). It may then be repeated or run twice at once. */
  readonly safeToRepeat?: boolean;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: ReadonlyMap<string, string>;
  readonly setCookie: readonly string[];
  readonly body: string;
  readonly bodyBytes?: Uint8Array;
}

export type HttpClient = (request: HttpRequest) => Promise<HttpResponse>;
