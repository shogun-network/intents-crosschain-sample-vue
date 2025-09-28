/* eslint-disable @typescript-eslint/no-explicit-any */
export function serializeBigIntsToStrings<T>(obj: T): T {
  if (typeof obj === 'bigint') {
    return obj.toString() as unknown as T
  }

  if (typeof obj === 'string' && /^\d+n$/.test(obj)) {
    return obj.slice(0, -1) as unknown as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeBigIntsToStrings(item)) as unknown as T
  }

  if (obj && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeBigIntsToStrings(value)
    }
    return result as T
  }

  return obj
}
