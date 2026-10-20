import { hedge } from './hedge';

interface Control {
  readonly attempt: number;
  readonly signal: AbortSignal;
  resolve(value: string): void;
  reject(error: Error): void;
}

/** A fake operation whose attempts the test settles by hand. */
interface ControlledOperation {
  readonly start: (signal: AbortSignal) => Promise<string>;
  readonly attempts: Control[];
}

function controlled(): ControlledOperation {
  const attempts: Control[] = [];
  const start = (signal: AbortSignal): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      attempts.push({ attempt: attempts.length + 1, signal, resolve, reject });
      signal.addEventListener('abort', () => reject(new Error('aborted')));
    });
  return { start, attempts };
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const always = (): boolean => true;

describe('hedge', () => {
  it('returns the first answer and never starts a second attempt when it arrives in time', async () => {
    const op = controlled();
    const result = hedge(op.start, { delayMs: 60, maxAttempts: 3, shouldRetry: always });
    op.attempts[0]?.resolve('fast');
    await expect(result).resolves.toBe('fast');
    await wait(100);
    expect(op.attempts).toHaveLength(1);
  });

  it('starts another attempt when the first is slow, and uses whichever answers first', async () => {
    const op = controlled();
    const result = hedge(op.start, { delayMs: 20, maxAttempts: 3, shouldRetry: always });
    await wait(40);
    expect(op.attempts.length).toBeGreaterThanOrEqual(2);
    op.attempts[1]?.resolve('second');
    await expect(result).resolves.toBe('second');
    expect(op.attempts[0]?.signal.aborted).toBe(true);
  });

  it('keeps the first attempt going, so a slow but healthy connection still wins if it answers first', async () => {
    const op = controlled();
    const result = hedge(op.start, { delayMs: 20, maxAttempts: 3, shouldRetry: always });
    await wait(30);
    op.attempts[0]?.resolve('slow but fine');
    await expect(result).resolves.toBe('slow but fine');
    expect(op.attempts[0]?.signal.aborted).toBe(false);
    expect(op.attempts[1]?.signal.aborted).toBe(true);
  });

  it('starts the next attempt at once when one fails, without waiting for the delay', async () => {
    const op = controlled();
    const result = hedge(op.start, { delayMs: 10_000, maxAttempts: 3, shouldRetry: always });
    op.attempts[0]?.reject(new Error('timed out'));
    await wait(5);
    expect(op.attempts).toHaveLength(2);
    op.attempts[1]?.resolve('recovered');
    await expect(result).resolves.toBe('recovered');
  });

  it('gives up with the last error once every attempt has failed', async () => {
    const op = controlled();
    const result = hedge(op.start, { delayMs: 10_000, maxAttempts: 3, shouldRetry: always });
    for (let i = 0; i < 3; i += 1) {
      await wait(5);
      op.attempts[i]?.reject(new Error(`failure ${i + 1}`));
    }
    await expect(result).rejects.toThrow('failure 3');
    expect(op.attempts).toHaveLength(3);
  });

  it('stops at once on an error that waiting will not fix', async () => {
    const op = controlled();
    const result = hedge(op.start, { delayMs: 10_000, maxAttempts: 3, shouldRetry: (error) => error.message !== 'certificate' });
    op.attempts[0]?.reject(new Error('certificate'));
    await expect(result).rejects.toThrow('certificate');
    expect(op.attempts).toHaveLength(1);
  });

  it('cancels attempts still in flight when it gives up on a fatal error', async () => {
    const op = controlled();
    const result = hedge(op.start, { delayMs: 10, maxAttempts: 3, shouldRetry: (error) => error.message !== 'certificate' });
    await wait(25);
    op.attempts[0]?.reject(new Error('certificate'));
    await expect(result).rejects.toThrow('certificate');
    expect(op.attempts.every((control) => control.signal.aborted || control.attempt === 1)).toBe(true);
  });

  it('does not start more attempts than allowed', async () => {
    const op = controlled();
    const result = hedge(op.start, { delayMs: 10, maxAttempts: 2, shouldRetry: always });
    await wait(60);
    expect(op.attempts).toHaveLength(2);
    op.attempts[0]?.resolve('done');
    await result;
  });

  it('ignores a losing attempt that fails after a winner was chosen', async () => {
    const op = controlled();
    const result = hedge(op.start, { delayMs: 10, maxAttempts: 3, shouldRetry: always });
    await wait(25);
    op.attempts[1]?.resolve('winner');
    await expect(result).resolves.toBe('winner');
    expect(() => op.attempts[0]?.reject(new Error('late failure'))).not.toThrow();
    await wait(5);
  });
});
