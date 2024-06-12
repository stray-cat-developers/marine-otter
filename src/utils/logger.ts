import { Logger as ProbotLogger } from "probot";

export class Logger {
  constructor(private readonly delegate: ProbotLogger) {
  }

  async error(error: any) {
    this.delegate.error(error);
  }

  async info(message: any) {
    await this.delegate.info(message);
  }

  async debug(message: any) {
    await this.delegate.debug(message);
  }

  async fatal(error: any) {
    this.delegate.fatal(error);
  }
}
