interface PendingRead<T> {
  readonly resolve: (result: IteratorResult<T>) => void;
  readonly reject: (error: unknown) => void;
}

export class AsyncQueue<T> implements AsyncIterable<T> {
  readonly #values: T[] = [];
  readonly #readers: PendingRead<T>[] = [];
  #ended = false;
  #error: unknown;

  push(value: T): void {
    if (this.#ended) {
      return;
    }

    const reader = this.#readers.shift();
    if (reader !== undefined) {
      reader.resolve({ done: false, value });
      return;
    }

    this.#values.push(value);
  }

  end(error?: unknown): void {
    if (this.#ended) {
      return;
    }

    this.#ended = true;
    this.#error = error;

    for (const reader of this.#readers.splice(0)) {
      if (error === undefined) {
        reader.resolve({ done: true, value: undefined });
      } else {
        reader.reject(error);
      }
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => this.#next(),
    };
  }

  #next(): Promise<IteratorResult<T>> {
    const value = this.#values.shift();
    if (value !== undefined) {
      return Promise.resolve({ done: false, value });
    }

    if (this.#ended) {
      if (this.#error !== undefined) {
        return Promise.reject(this.#error);
      }
      return Promise.resolve({ done: true, value: undefined });
    }

    return new Promise((resolve, reject) => {
      this.#readers.push({ resolve, reject });
    });
  }
}
