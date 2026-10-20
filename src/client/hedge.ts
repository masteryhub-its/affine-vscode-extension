export interface HedgeOptions {
  /** How long to wait for an answer before starting another attempt alongside the first. */
  readonly delayMs: number;
  /** The most attempts that may be started in total. */
  readonly maxAttempts: number;
  /** Whether a failed attempt is worth another try. A false answer ends the whole operation at once. */
  readonly shouldRetry: (error: Error) => boolean;
}

/**
 * Runs an operation that is safe to repeat, and starts another copy beside it whenever the earlier ones are slow.
 * The first copy to answer wins and the others are cancelled. A copy that fails starts the next one immediately.
 *
 * On a connection that sometimes hangs for ten seconds before failing, this turns a ten second stall into about a
 * second, because a healthy connection opens in a fraction of a second. Use it for reads only: a write that is
 * started twice could be applied twice.
 */
export function hedge<T>(start: (signal: AbortSignal) => Promise<T>, options: HedgeOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controllers: AbortController[] = [];
    let started = 0;
    let failed = 0;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (conclude: () => void, winner?: AbortController): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      for (const controller of controllers) {
        if (controller !== winner) {
          controller.abort();
        }
      }
      conclude();
    };

    const schedule = (): void => {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      timer = setTimeout(launch, options.delayMs);
    };

    function launch(): void {
      if (settled || started >= options.maxAttempts) {
        return;
      }
      started += 1;
      const controller = new AbortController();
      controllers.push(controller);
      start(controller.signal).then(
        (value) => {
          finish(() => {
            resolve(value);
          }, controller);
        },
        (reason: unknown) => {
          if (settled) {
            return;
          }
          const error = reason instanceof Error ? reason : new Error(String(reason));
          failed += 1;
          if (!options.shouldRetry(error)) {
            finish(() => {
              reject(error);
            });
            return;
          }
          if (started < options.maxAttempts) {
            launch();
          } else if (failed >= started) {
            finish(() => {
              reject(error);
            });
          }
        }
      );
      if (started < options.maxAttempts) {
        schedule();
      }
    }

    launch();
  });
}
