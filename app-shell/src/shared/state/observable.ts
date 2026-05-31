export type Unsubscribe = () => void

export interface ObservableState<T> {
  getSnapshot(): T
  subscribe(listener: (snapshot: T) => void): Unsubscribe
}

export abstract class ObservableSlice<T> implements ObservableState<T> {
  private listeners = new Set<(snapshot: T) => void>()

  abstract getSnapshot(): T

  subscribe(listener: (snapshot: T) => void): Unsubscribe {
    this.listeners.add(listener)
    listener(this.getSnapshot())

    return () => {
      this.listeners.delete(listener)
    }
  }

  protected emit(): void {
    const snapshot = this.getSnapshot()
    for (const listener of this.listeners) {
      listener(snapshot)
    }
  }
}
