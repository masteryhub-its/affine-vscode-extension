import { CLIENT_VERSION_HEADER, GRAPHQL_PATH } from '../constants';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { parseAffineErrorCode } from '../utils/affine-error-code';
import { GraphqlExtensionCode } from '../utils/enums/graphql-extension-code.enum';
import { HttpMethod } from '../utils/enums/http-method.enum';
import type { AffineCredential, GraphQLErrorBody, GraphQLRequestInput, GraphQLResponse } from './affine.types';
import { credentialHeaders } from './credential-headers';
import type { HttpClient, HttpResponse } from './http.types';

export interface GraphQLClientOptions {
  readonly serverUrl: string;
  readonly clientVersion: string;
  readonly http: HttpClient;
  readonly credential: AffineCredential | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseGraphQLErrors(value: unknown): readonly GraphQLErrorBody[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const errors: GraphQLErrorBody[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item['message'] !== 'string') {
      continue;
    }
    const extensionsRaw = item['extensions'];
    const extensions = isRecord(extensionsRaw)
      ? {
          code: typeof extensionsRaw['code'] === 'string' ? extensionsRaw['code'] : undefined,
          status: typeof extensionsRaw['status'] === 'number' ? extensionsRaw['status'] : undefined,
        }
      : undefined;
    errors.push({ message: item['message'], extensions });
  }
  return errors;
}

function parseGraphQLResponse<T>(body: string): GraphQLResponse<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body) as unknown;
  } catch (cause: unknown) {
    throw new AffineError('AFFiNE returned a non-JSON GraphQL response', AffineErrorCode.UNEXPECTED_RESPONSE, { cause });
  }
  if (!isRecord(parsed)) {
    throw new AffineError('AFFiNE returned an unexpected GraphQL payload', AffineErrorCode.UNEXPECTED_RESPONSE);
  }
  const data = 'data' in parsed ? (parsed['data'] as T | null) : null;
  return {
    data,
    errors: parseGraphQLErrors(parsed['errors']),
  };
}

const GRAPHQL_WRONG_SIGN_IN_CREDENTIALS: ReadonlySet<string> = new Set([GraphqlExtensionCode.WRONG_SIGN_IN_CREDENTIALS]);

function graphqlErrorCode(errors: readonly GraphQLErrorBody[]): AffineErrorCode {
  const code = errors[0]?.extensions?.code;
  if (code !== undefined && GRAPHQL_WRONG_SIGN_IN_CREDENTIALS.has(code)) {
    return AffineErrorCode.AUTHENTICATION_FAILED;
  }
  const parsed = parseAffineErrorCode(code);
  if (parsed === AffineErrorCode.AUTHENTICATION_REQUIRED) {
    return AffineErrorCode.AUTHENTICATION_REQUIRED;
  }
  return AffineErrorCode.GRAPHQL_ERROR;
}

export class GraphQLClient {
  public constructor(private readonly options: GraphQLClientOptions) {}

  public withCredential(credential: AffineCredential): GraphQLClient {
    return new GraphQLClient({ ...this.options, credential });
  }

  public async request<T>(input: GraphQLRequestInput): Promise<T> {
    const response = await this.post(input);
    if (response.status === 401) {
      throw new AffineError('Authentication required', AffineErrorCode.AUTHENTICATION_REQUIRED);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new AffineError(`AFFiNE GraphQL request failed with HTTP ${response.status}`, AffineErrorCode.HTTP_ERROR);
    }

    const payload = parseGraphQLResponse<T>(response.body);
    if (payload.errors !== undefined && payload.errors.length > 0) {
      const first = payload.errors[0];
      const message = first?.message ?? 'AFFiNE GraphQL request failed';
      throw new AffineError(message, graphqlErrorCode(payload.errors));
    }
    if (payload.data === null) {
      throw new AffineError('AFFiNE GraphQL response contained no data', AffineErrorCode.UNEXPECTED_RESPONSE);
    }
    return payload.data;
  }

  private async post(input: GraphQLRequestInput): Promise<HttpResponse> {
    return this.options.http({
      url: `${this.options.serverUrl}${GRAPHQL_PATH}`,
      method: HttpMethod.POST,
      headers: {
        'Content-Type': 'application/json',
        [CLIENT_VERSION_HEADER]: this.options.clientVersion,
        ...credentialHeaders(this.options.credential),
      },
      body: JSON.stringify({
        query: input.query,
        variables: input.variables === undefined ? {} : input.variables,
      }),
    });
  }
}
