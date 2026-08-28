import type { AffineCredential } from '../client/affine.types';

export interface PushDocUpdateInput {
  readonly workspaceId: string;
  readonly docId: string;
  readonly update: Uint8Array;
}

export interface AffineSync {
  pushDocUpdate(input: PushDocUpdateInput): Promise<void>;
}

export interface CreateAffineSyncInput {
  readonly serverUrl: string;
  readonly clientVersion: string;
  readonly credential: AffineCredential;
}

export type CreateAffineSync = (input: CreateAffineSyncInput) => AffineSync;
