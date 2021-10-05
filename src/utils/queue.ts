import { CancelablePromise, delay } from '@/utils/delay'

type WaitTask = { type: 'wait'; id: string; delay: number }
type WorkTask<T> = { type: 'work'; id: string; work: T }
type WaitQueueTask<T> = WaitTask | WorkTask<T>

export class WaitQueue<T> {
  private taskQueue: WaitQueueTask<T>[] = []
  private taskIds: Set<string> = new Set()
  private runner: Promise<void> | null = null
  private runningTask: {
    task: WaitQueueTask<T>
    promise: CancelablePromise<void>
  } | null = null

  constructor(
    private getId: (work: T) => string,
    private worker: (work: T) => Promise<void>,
    private drain: () => void
  ) {}

  queueFirst(work: T, delay = 0) {
    this.queueTaskFirst(this.createTasks(work, delay))
  }

  queueLast(work: T, delay = 0) {
    this.queueTaskLast(this.createTasks(work, delay))
  }

  stopWaitingFor(work: T) {
    const workId = this.getId(work)
    if (
      this.runningTask !== null &&
      this.runningTask.task.type === 'wait' &&
      this.runningTask.task.id === workId &&
      this.runningTask.promise.cancel
    ) {
      this.runningTask.promise.cancel()
    }
  }

  queue(work: T) {
    this.queueLast(work)
  }

  currentTask(): WaitQueueTask<T> | null {
    return this.runningTask && this.runningTask.task
  }

  getQueuedTasks(): WaitQueueTask<T>[] {
    return this.taskQueue.map((task) => task)
  }

  private startOrResume() {
    if (this.runner !== null) {
      return
    }
    this.runner = this.run().then()
  }

  private async run() {
    while (await this.runNextTask()) this.runner = null
    this.drain()
  }

  private async runNextTask(): Promise<boolean> {
    const nextTask = this.taskQueue.shift()
    if (nextTask === undefined) {
      return false
    }
    await this.runTask(nextTask)
    return true
  }

  private async runTask(task: WaitQueueTask<T>) {
    const promise = this.getTaskPromise(task)
    if (task.type === 'work') {
      this.taskIds.delete(task.id)
    }
    this.runningTask = {
      task,
      promise,
    }
    await promise
    this.runningTask = null
  }

  private getTaskPromise(task: WaitQueueTask<T>) {
    switch (task.type) {
      case 'wait':
        return delay(task.delay)
      case 'work':
        return this.worker(task.work)
      default:
        throw new Error(`Unknown task: ${task}`)
    }
  }

  private queueTaskFirst(tasks: WaitQueueTask<T>[]) {
    this.taskQueue.unshift(...tasks)
    this.startOrResume()
  }

  private queueTaskLast(tasks: WaitQueueTask<T>[]) {
    this.taskQueue.push(...tasks)
    this.startOrResume()
  }

  private createTasks(work: T, delay = 0): WaitQueueTask<T>[] {
    const result: WaitQueueTask<T>[] = []
    const id = this.getId(work)

    if (this.taskIds.has(id)) {
      return result
    } else {
      this.taskIds.add(id)
    }

    if (delay > 0) {
      result.push({ type: 'wait', delay, id })
    }
    result.push({ type: 'work', id, work })
    return result
  }
}
