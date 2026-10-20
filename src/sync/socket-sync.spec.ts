import { io } from 'socket.io-client';
import { AffineErrorCode } from '../errors/affine-error';
import { AffineCredentialKind } from '../utils/enums/affine-credential-kind.enum';
import { SocketAffineSync } from './socket-sync';

jest.mock('socket.io-client', () => ({ io: jest.fn() }));

type Handler = (error?: Error) => void;

interface FakeSocket {
  connected: boolean;
  once: jest.Mock;
  off: jest.Mock;
  disconnect: jest.Mock;
  timeout: jest.Mock;
  emitWithAck: jest.Mock<Promise<unknown>, [string, unknown]>;
  fire(event: string, error?: Error): void;
}

function fakeSocket(acks: unknown[], connectsImmediately = true): FakeSocket {
  const handlers = new Map<string, Handler>();
  const emitWithAck = jest.fn<Promise<unknown>, [string, unknown]>();
  for (const ack of acks) {
    emitWithAck.mockResolvedValueOnce(ack);
  }
  const socket: FakeSocket = {
    connected: false,
    once: jest.fn((event: string, handler: Handler) => {
      handlers.set(event, handler);
      if (event === 'connect' && connectsImmediately) {
        queueMicrotask(() => handler());
      }
    }),
    off: jest.fn(),
    disconnect: jest.fn(),
    emitWithAck,
    timeout: jest.fn(() => ({ emitWithAck })),
    fire: (event, error) => handlers.get(event)?.(error),
  };
  return socket;
}

const OPTIONS = { serverUrl: 'https://affine.test', clientVersion: '0.26.0', credential: { kind: AffineCredentialKind.ACCESS_TOKEN, token: 'tok' } as const };
const UPDATE = { workspaceId: 'w1', docId: 'd1', update: new Uint8Array([1, 2, 3]) };

function useSocket(socket: FakeSocket): void {
  (io as unknown as jest.Mock).mockReturnValue(socket);
}

describe('SocketAffineSync', () => {
  beforeEach(() => {
    (io as unknown as jest.Mock).mockReset();
  });

  it('joins the workspace, pushes the update, then disconnects', async () => {
    const socket = fakeSocket([{ data: { success: true } }, { data: { accepted: true } }]);
    useSocket(socket);
    await new SocketAffineSync(OPTIONS).pushDocUpdate(UPDATE);
    expect(socket.emitWithAck.mock.calls.map((call) => call[0])).toEqual(['space:join', 'space:push-doc-update']);
    expect(socket.emitWithAck.mock.calls[1]?.[1]).toMatchObject({ spaceId: 'w1', docId: 'd1', update: 'AQID' });
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('connects over websocket only, without reconnection, using the credential', async () => {
    const socket = fakeSocket([{ data: { success: true } }, { data: { accepted: true } }]);
    useSocket(socket);
    await new SocketAffineSync(OPTIONS).pushDocUpdate(UPDATE);
    const [url, config] = (io as unknown as jest.Mock).mock.calls[0] as [string, { transports: string[]; reconnection: boolean; auth: { token: string } }];
    expect(url).toBe('https://affine.test');
    expect(config.transports).toEqual(['websocket']);
    expect(config.reconnection).toBe(false);
    expect(config.auth.token).toBe('tok');
  });

  it('reports a connection that keeps failing as a sync error and closes the socket', async () => {
    const socket = fakeSocket([], false);
    useSocket(socket);
    const pending = new SocketAffineSync(OPTIONS, { sleep: () => Promise.resolve() }).pushDocUpdate(UPDATE);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await new Promise((resolve) => setImmediate(resolve));
      socket.fire('connect_error', new Error('websocket error'));
    }
    await expect(pending).rejects.toMatchObject({ code: AffineErrorCode.SYNC_ERROR, message: 'websocket error' });
    expect(socket.disconnect).toHaveBeenCalled();
    expect(socket.emitWithAck).not.toHaveBeenCalled();
  });

  it('stops before pushing when the join is rejected, and still disconnects', async () => {
    const socket = fakeSocket([{ error: { message: 'not a member' } }]);
    useSocket(socket);
    await expect(new SocketAffineSync(OPTIONS).pushDocUpdate(UPDATE)).rejects.toMatchObject({ code: AffineErrorCode.SYNC_ERROR, message: 'not a member' });
    expect(socket.emitWithAck).toHaveBeenCalledTimes(1);
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('reports a rejected push and still disconnects', async () => {
    const socket = fakeSocket([{ data: { success: true } }, { data: { accepted: false } }]);
    useSocket(socket);
    await expect(new SocketAffineSync(OPTIONS).pushDocUpdate(UPDATE)).rejects.toMatchObject({ code: AffineErrorCode.SYNC_ERROR });
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('explains the client version when the server refuses the session', async () => {
    const socket = fakeSocket([{ data: { success: false } }]);
    useSocket(socket);
    await expect(new SocketAffineSync(OPTIONS).pushDocUpdate(UPDATE)).rejects.toThrow('affine.clientVersion');
  });

  it('surfaces an acknowledgement timeout and still disconnects', async () => {
    const socket = fakeSocket([]);
    socket.emitWithAck.mockRejectedValueOnce(new Error('operation has timed out'));
    useSocket(socket);
    await expect(new SocketAffineSync(OPTIONS).pushDocUpdate(UPDATE)).rejects.toThrow('timed out');
    expect(socket.disconnect).toHaveBeenCalledTimes(1);
  });

  describe('connection retries', () => {
    const noWait = (): Promise<void> => Promise.resolve();

    it('tries again when the connection fails, because nothing has been written yet', async () => {
      const failing = fakeSocket([], false);
      const second = fakeSocket([], false);
      const third = fakeSocket([{ data: { success: true } }, { data: { accepted: true } }]);
      (io as unknown as jest.Mock).mockReturnValueOnce(failing).mockReturnValueOnce(second).mockReturnValueOnce(third);
      const pending = new SocketAffineSync(OPTIONS, { sleep: noWait }).pushDocUpdate(UPDATE);
      await new Promise((resolve) => setImmediate(resolve));
      failing.fire('connect_error', new Error('timeout'));
      await new Promise((resolve) => setImmediate(resolve));
      second.fire('connect_error', new Error('timeout'));
      await pending;
      expect((io as unknown as jest.Mock).mock.calls).toHaveLength(3);
      expect(third.emitWithAck.mock.calls.map((call) => call[0])).toEqual(['space:join', 'space:push-doc-update']);
      expect(failing.disconnect).toHaveBeenCalled();
    });

    it('gives up after three failed connections', async () => {
      const sockets = [fakeSocket([], false), fakeSocket([], false), fakeSocket([], false)];
      for (const socket of sockets) {
        (io as unknown as jest.Mock).mockReturnValueOnce(socket);
      }
      const pending = new SocketAffineSync(OPTIONS, { sleep: noWait }).pushDocUpdate(UPDATE);
      for (const socket of sockets) {
        await new Promise((resolve) => setImmediate(resolve));
        socket.fire('connect_error', new Error('timeout'));
      }
      await expect(pending).rejects.toMatchObject({ code: AffineErrorCode.SYNC_ERROR });
      expect((io as unknown as jest.Mock).mock.calls).toHaveLength(3);
    });

    it('does not repeat a push that was acknowledged with an error', async () => {
      const socket = fakeSocket([{ data: { success: true } }, { error: { message: 'rejected' } }]);
      useSocket(socket);
      await expect(new SocketAffineSync(OPTIONS, { sleep: noWait }).pushDocUpdate(UPDATE)).rejects.toThrow('rejected');
      expect((io as unknown as jest.Mock).mock.calls).toHaveLength(1);
    });
  });
});
