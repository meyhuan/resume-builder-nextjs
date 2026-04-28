/**
 * Lightweight scoped logger. Produces tagged, consistently-prefixed messages
 * that are easy to grep across both server and client.
 *
 * In production we only emit warn/error. In development we emit everything.
 * On the client, the same messages also show up in vConsole when enabled,
 * so you can grep a tag like `[m/edit]` to trace a feature end-to-end.
 *
 * Usage:
 *   const log = createLogger('m/edit')
 *   log.info('page enter', { id })
 *   log.warn('unexpected', { reason })
 *   log.error('failed to save', err)
 */

export interface Logger {
  readonly debug: (msg: string, data?: unknown) => void
  readonly info: (msg: string, data?: unknown) => void
  readonly warn: (msg: string, data?: unknown) => void
  readonly error: (msg: string, data?: unknown) => void
}

// const IS_PROD: boolean = process.env.NODE_ENV === 'production'
const IS_PROD: boolean = false

/**
 * @param scope short feature tag, e.g. 'm/edit', 'sso', 'migration'.
 */
export function createLogger(scope: string): Logger {
  const prefix: string = `[${scope}]`
  return {
    debug(msg: string, data?: unknown): void {
      if (IS_PROD) return
      if (data !== undefined) console.debug(prefix, msg, data)
      else console.debug(prefix, msg)
    },
    info(msg: string, data?: unknown): void {
      if (IS_PROD) return
      if (data !== undefined) console.log(prefix, msg, data)
      else console.log(prefix, msg)
    },
    warn(msg: string, data?: unknown): void {
      if (data !== undefined) console.warn(prefix, msg, data)
      else console.warn(prefix, msg)
    },
    error(msg: string, data?: unknown): void {
      if (data !== undefined) console.error(prefix, msg, data)
      else console.error(prefix, msg)
    },
  }
}
