import { io, type Socket } from 'socket.io-client';
import { credentialHeaders } from '../client/credential-headers';
import { AffineError, AffineErrorCode } from '../errors/affine-error';
import type { AffineSync, CreateAffineSyncInput, PushDocUpdateInput } from './affine-sync';
import { socketAuth, spaceAckError, spaceJoinPayload, spacePushDocUpdatePayload } from './socket-protocol';

export class SocketAffineSync implements AffineSync {
  public constructor(private readonly options: CreateAffineSyncInput) {}

  public async pushDocUpdate(input: PushDocUpdateInput): Promise<void> {
    const socket = await connectAffineSocket(this.options);
    try {
      await emitSpaceEvent(socket, 'space:join', spaceJoinPayload(input.workspaceId, this.options.clientVersion));
      await emitSpaceEvent(socket, 'space:push-doc-update', spacePushDocUpdatePayload(input));
    } finally {
      socket.disconnect();
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
