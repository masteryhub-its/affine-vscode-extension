import { io, type Socket } from 'socket.io-client';
import { credentialHeaders } from '../client/credential-headers';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import type { AffineSync, CreateAffineSyncInput, PushDocUpdateInput } from './affine-sync';
import { socketAuth, spaceAckError, spaceJoinPayload, spacePushDocUpdatePayload } from './socket-protocol';

export interface SocketSyncOptions {
  /** Pauses between connection attempts; replaced in tests. */
  readonly sleep?: (ms: number) => Promise<void>;
}

const MAX_CONNECT_ATTEMPTS = 3;
const CONNECT_RETRY_DELAY_MS = 400;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class SocketAffineSync implements AffineSync {
  private readonly sleep: (ms: number) => Promise<void>;

  public constructor(
    private readonly options: CreateAffineSyncInput,
    syncOptions: SocketSyncOptions = {}
  ) {
    this.sleep = syncOptions.sleep ?? defaultSleep;
  }

  public async pushDocUpdate(input: PushDocUpdateInput): Promise<void> {
    const socket = await this.connectWithRetry();
    try {
      await emitSpaceEvent(socket, 'space:join', spaceJoinPayload(input.workspaceId, this.options.clientVersion));
      await emitSpaceEvent(socket, 'space:push-doc-update', spacePushDocUpdatePayload(input));
    } finally {
      socket.disconnect();
    }
  }

  /** Connecting happens before anything is written, so a failed connection is always safe to try again. */
  private async connectWithRetry(): Promise<Socket> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await connectAffineSocket(this.options);
      } catch (error: unknown) {
        if (attempt >= MAX_CONNECT_ATTEMPTS) {
          throw error;
        }
        await this.sleep(CONNECT_RETRY_DELAY_MS * attempt);
      }
    }
  }
}

async function connectAffineSocket(options: CreateAffineSyncInput): Promise<Socket> {
  const socket = io(options.serverUrl, {
    transports: ['websocket'],
    reconnection: false,
    extraHeaders: { ...credentialHeaders(options.credential) },
    auth: socketAuth(options.credential),
  });
  await waitForConnect(socket);
  return socket;
}

function waitForConnect(socket: Socket): Promise<void> {
  if (socket.connected) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onConnect = (): void => {
      cleanup();
      resolve();
    };
    const onError = (err: Error): void => {
      cleanup();
      socket.disconnect();
      reject(new AffineError(err.message, AffineErrorCode.SYNC_ERROR, { cause: err }));
    };
    const cleanup = (): void => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };
    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
}

async function emitSpaceEvent(socket: Socket, event: 'space:join' | 'space:push-doc-update', payload: unknown): Promise<void> {
  const ack: unknown = await socket.timeout(15_000).emitWithAck(event, payload);
  const message = spaceAckError(ack);
  if (message !== undefined) {
    throw new AffineError(message, AffineErrorCode.SYNC_ERROR);
  }
}
