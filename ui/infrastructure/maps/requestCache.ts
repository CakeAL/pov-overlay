export const aborted = () => new DOMException('地图请求已取消。', 'AbortError');
export const isAborted = (reason: unknown) => reason instanceof DOMException && reason.name === 'AbortError';
interface Task<T> {
  key: string; load: () => Promise<T>; promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void;
  users: number; state: 'queued' | 'running'; generation: number;
}
/** Resolved LRU and in-flight requests are separate: waiting jobs can never evict active requests. */
export class MapRequestCache<T> {
  private values = new Map<string, { value: T; expires: number }>();
  private pending = new Map<string, Task<T>>();
  private queue: Task<T>[] = [];
  private active = 0; private generation = 0; private lastStart = 0;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private capacity: number, private concurrency: () => number, private interval = () => 0) {}
  peek(key: string): T | undefined {
    const cached = this.values.get(key);
    if (!cached) return undefined;
    if (cached.expires <= Date.now()) { this.values.delete(key); return undefined; }
    this.values.delete(key); this.values.set(key, cached);
    return cached.value;
  }
  get(key: string, load: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(aborted());
    const value = this.peek(key);
    if (value !== undefined) return Promise.resolve(value);
    let task = this.pending.get(key);
    if (!task) {
      let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
      const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
      // A queued task can lose all subscribers before the microtask attaching their handlers.
      void promise.catch(() => {});
      task = { key, load, promise, resolve, reject, users: 0, state: 'queued', generation: this.generation };
      this.pending.set(key, task); this.queue.push(task);
    }
    const result = this.subscribe(task, signal);
    this.pump();
    return result;
  }
  clear() {
    this.generation++; this.values.clear();
    for (const task of [...this.queue]) this.discard(task);
    for (const [key, task] of this.pending) if (task.state === 'running') this.pending.delete(key);
    // Running native requests finish into their subscribers, but cannot repopulate the new cache.
  }
  private discard(task: Task<T>) {
    if (task.state !== 'queued') return;
    const index = this.queue.indexOf(task); if (index >= 0) this.queue.splice(index, 1);
    if (this.pending.get(task.key) === task) this.pending.delete(task.key);
    task.reject(aborted());
  }
  private subscribe(task: Task<T>, signal?: AbortSignal): Promise<T> {
    task.users++;
    return new Promise<T>((resolve, reject) => {
      let live = true;
      const release = () => {
        if (!live) return false;
        live = false; task.users--; signal?.removeEventListener('abort', cancel);
        if (task.users === 0 && task.state === 'queued') this.discard(task);
        return true;
      };
      const cancel = () => { if (release()) reject(aborted()); };
      signal?.addEventListener('abort', cancel, { once: true });
      task.promise.then(value => { if (release()) resolve(value); }, reason => { if (release()) reject(reason); });
    });
  }
  private pump() {
    clearTimeout(this.timer);
    while (this.active < Math.max(1, this.concurrency()) && this.queue.length) {
      const delay = Math.max(0, this.lastStart + this.interval() - Date.now());
      if (delay > 0) { this.timer = setTimeout(() => this.pump(), delay); return; }
      const task = this.queue.shift()!;
      if (task.users === 0) { this.discard(task); continue; }
      task.state = 'running'; this.active++; this.lastStart = Date.now();
      void Promise.resolve().then(task.load).then(value => {
        if (task.generation === this.generation) {
          this.values.set(task.key, { value, expires: Date.now() + 15 * 60_000 });
          while (this.values.size > this.capacity) this.values.delete(this.values.keys().next().value!);
        }
        task.resolve(value);
      }, task.reject).finally(() => {
        if (this.pending.get(task.key) === task) this.pending.delete(task.key);
        this.active--; this.pump();
      });
    }
  }
}
