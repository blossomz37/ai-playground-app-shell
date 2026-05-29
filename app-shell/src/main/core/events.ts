type Cb = (payload: unknown) => void

const listeners = new Map<string, Set<Cb>>()

export const events = {
  on(event: string, cb: Cb): { dispose(): void } {
    if (!listeners.has(event)) listeners.set(event, new Set())
    listeners.get(event)!.add(cb)
    return { dispose() { listeners.get(event)?.delete(cb) } }
  },

  emit(event: string, payload: unknown): void {
    listeners.get(event)?.forEach(cb => cb(payload))
  },

  off(event: string, cb: Cb): void {
    listeners.get(event)?.delete(cb)
  }
}
