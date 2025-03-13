import _ from 'lodash'
import { format } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import Counter from '@/utils/counter'
import logger from '@/utils/logger'
import colors from '@/utils/colors'

export type TRetryOption<T = any> = {
  name?: string
  ms?: number
  count?: boolean
  fallback?: T
  throwError?: boolean
  hideError?: boolean
  logError?: boolean
}

export function wait(milliseconds = 500, any: any = undefined) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(any)
    }, milliseconds)
  })
}

export async function waitUntil<T>(
  obj: T,
  predicate: _.ListIterateeCustom<T, boolean>,
  milliseconds = 500,
  any = undefined
): Promise<any> {
  if (_.every([obj], predicate)) {
    return any
  } else {
    await wait(milliseconds)
    return waitUntil(obj, predicate, milliseconds, any)
  }
}

export function getTimestamp(t: number) {
  const tStr = `${t}`
  return tStr.length === 13 ? t : t * 1000
}

export function formatDate(timestamp: number, pattern = 'MM/dd/yyyy HH:mm:ss') {
  const time = getTimestamp(timestamp)
  const date = fromZonedTime(new Date(time), process.env.TIMEZONE)
  return format(date, pattern)
}

export function print(title: string, ...rest: any) {
  const time = formatDate(Date.now())
  const logs = _.compact([...rest])

  console.group(`${title}, ${time}`)
  logs.forEach(el => console.log(el))
  console.groupEnd()
  console.log('\n')
}

export async function retryFn<T = any>(
  promise: Promise<T>,
  option?: TRetryOption<T>,
  retry = 2
): Promise<T | undefined> {
  const opt = option || {}
  const { name = 'fn', ms = 1000, logError = true } = opt
  const { count, fallback, throwError } = opt

  const counter = new Counter()

  try {
    const result = await promise

    if (count) {
      const info = `${colors.fg.green}name: ${name}, sec: ${counter.diffSec}${colors.reset}`
      print(`Successfully in ${info}`)
    }

    return result
  } catch (err: any) {
    await wait(ms)

    if (retry >= 0) {
      return retryFn(promise, option, retry - 1)
    }
    const info = `${colors.fg.red}name: ${name}, sec: ${counter.diffSec}${colors.reset}`
    err.stack = `${err.stack} \n    ${info}`

    if (logError) {
      logger.error(err.message)
    }
    if (throwError) {
      throw err
    }
    return fallback
  }
}

export function terminate(close: (err: any) => void, options = { coredump: false, timeout: 500 }) {
  // Exit function
  const exit = (code: number) => {
    options.coredump ? process.abort() : process.exit(code)
  }

  return (code: number, reason: any) => (err: any, promise: any) => {
    if (err && err instanceof Error) {
      // Log error information, use a proper logging library here :)
      logger.error(err)
    }

    // Attempt a graceful shutdown
    close(err)

    setTimeout(() => {
      exit(code)
    }, options.timeout).unref()
  }
}
