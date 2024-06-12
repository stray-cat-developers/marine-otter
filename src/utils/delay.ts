export type CancelablePromise<T> = Promise<T> & { cancel?: () => void }

export function delay(ms: number): CancelablePromise<void> {
  let onCancel = null
  const result: any = new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(undefined)
    }, ms)
    onCancel = () => {
      clearTimeout(timer)
      resolve(undefined)
    }
  })
  result.cancel = onCancel
  return result
}
