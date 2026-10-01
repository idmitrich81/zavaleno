const KEY = 'zavaleno.device'

let memory: string | null = null

/**
 * Случайный идентификатор этого браузера: по нему сервер следит, чтобы одно устройство
 * подтверждало точку один раз. Если хранилище недоступно (приватное окно), живёт до перезагрузки.
 */
export function deviceId(): string {
  if (memory) return memory
  try {
    memory = localStorage.getItem(KEY)
    if (!memory) {
      memory = crypto.randomUUID()
      localStorage.setItem(KEY, memory)
    }
  } catch {
    memory ??= crypto.randomUUID()
  }
  return memory
}
