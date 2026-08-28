import { AffineClient } from '../client/affine-client';
import type { AffineCredential, BoundAffineCredential, AffineUser, SecretStore, SignInWithPasswordInput, SignInWithTokenInput } from '../client/affine.types';
import type { HttpClient } from '../client/http.types';
import type { SettingsReader } from '../config/settings.types';
import { ACCESS_TOKEN_SECRET_KEY } from '../constants';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import type { AffineSync, CreateAffineSync, CreateAffineSyncInput } from '../sync/affine-sync';
import { SocketAffineSync } from '../sync/socket-sync';
import { deserializeBoundCredential, serializeBoundCredential } from './credential-codec';

export interface CreateAuthServiceInput {
  readonly secrets: SecretStore;
  readonly settings: SettingsReader;
  readonly http: HttpClient;
  readonly createSync?: CreateAffineSync;
}

export class AuthService {
  public constructor(private readonly input: CreateAuthServiceInput) {}

  public async readCredential(): Promise<AffineCredential | undefined> {
    const raw = await this.input.secrets.get(ACCESS_TOKEN_SECRET_KEY);
    if (raw === undefined || raw.trim().length === 0) {
      return undefined;
    }

    let bound: BoundAffineCredential;
    try {
      bound = deserializeBoundCredential(raw);
    } catch {
      await this.clearCredential();
      return undefined;
    }

    const serverUrl = this.input.settings.read().serverUrl;
    if (bound.serverUrl !== serverUrl) {
      await this.clearCredential();
      return undefined;
    }

    return bound.credential;
  }

  public async writeCredential(credential: AffineCredential): Promise<void> {
    const serverUrl = this.input.settings.read().serverUrl;
    await this.input.secrets.store(ACCESS_TOKEN_SECRET_KEY, serializeBoundCredential({ serverUrl, credential }));
  }

  public async clearCredential(): Promise<void> {
    await this.input.secrets.delete(ACCESS_TOKEN_SECRET_KEY);
  }

  public createClient(credential?: AffineCredential): AffineClient {
    const settings = this.input.settings.read();
    const sync =
      credential === undefined
        ? undefined
        : this.resolveSync({
            serverUrl: settings.serverUrl,
            clientVersion: settings.clientVersion,
            credential,
          });
    return new AffineClient({
      serverUrl: settings.serverUrl,
      clientVersion: settings.clientVersion,
      http: this.input.http,
      credential,
      ...(sync === undefined ? {} : { sync }),
    });
  }

  private resolveSync(input: CreateAffineSyncInput): AffineSync {
    if (this.input.createSync !== undefined) {
      return this.input.createSync(input);
    }
    return new SocketAffineSync(input);
  }

  public async requireClient(): Promise<AffineClient> {
    const credential = await this.readCredential();
    if (credential === undefined) {
      throw new AffineError('Sign in to AFFiNE first', AffineErrorCode.NOT_SIGNED_IN);
    }
    return this.createClient(credential);
  }

  public async signInWithToken(input: SignInWithTokenInput): Promise<AffineUser> {
    const token = input.token.trim();
    if (token.length === 0) {
      throw new AffineError('Access token is required', AffineErrorCode.AUTHENTICATION_FAILED);
    }
    const credential: AffineCredential = { kind: AffineCredentialKind.ACCESS_TOKEN, token };
    const user = await this.createClient(credential).currentUser();
    await this.writeCredential(credential);
    return user;
  }

  public async signInWithPassword(input: SignInWithPasswordInput): Promise<AffineUser> {
    const email = input.email.trim();
    const password = input.password;
    if (email.length === 0 || password.length === 0) {
      throw new AffineError('Email and password are required', AffineErrorCode.AUTHENTICATION_FAILED);
    }
    const credential = await this.createClient().signInWithPassword({ email, password });
    const user = await this.createClient(credential).currentUser();
    await this.writeCredential(credential);
    return user;
  }

  public async currentUser(): Promise<AffineUser | undefined> {
    const credential = await this.readCredential();
    if (credential === undefined) {
      return undefined;
    }
    return this.createClient(credential).currentUser();
  }
}
