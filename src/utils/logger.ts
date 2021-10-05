import { DeprecatedLogger } from 'probot/lib/types'

export class Logger {
  constructor(private readonly delegate: DeprecatedLogger) {}

  async error(error: any) {
    this.delegate.error(error)
  }

  async info(error: any) {
    await this.delegate.info(error)
  }

  async fatal(error: any) {
    this.delegate.fatal(error)
  }
}
