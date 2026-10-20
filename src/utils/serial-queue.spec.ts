import { createSerialQueue } from './serial-queue';

describe('createSerialQueue', () => {
  it('runs tasks one at a time, in the order they were added', async () => {
    const run = createSerialQueue();
    const log: string[] = [];
    const slow = run(async () => {
      log.push('a start');
      await new Promise((resolve) => setTimeout(resolve, 15));
      log.push('a end');
      return 'a';
    });
    const fast = run(() => {
      log.push('b');
      return Promise.resolve('b');
    });
    expect(await Promise.all([slow, fast])).toEqual(['a', 'b']);
    expect(log).toEqual(['a start', 'a end', 'b']);
  });

  it('keeps going after a task fails, and still reports that failure to its caller', async () => {
    const run = createSerialQueue();
    const failing = run(() => Promise.reject(new Error('boom')));
    const next = run(() => Promise.resolve('ok'));
    await expect(failing).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });
});
