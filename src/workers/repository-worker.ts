import { Application, Context } from 'probot'
import { RepositoryReference } from '@/models/github'
import { WaitQueue } from '@/utils/queue'
import {
  HandlerContext,
  InstallationContext,
  IssueCommentContext,
  PullRequestContext,
  PushContext,
  WorkerContext,
} from '@/models/context'
import { handlePullRequest } from '@/handlers/pull-request'
import { RequestHandler } from '@/models/handler'
import { handleIssueComment } from '@/handlers/issue-comment'
import { Config, DefaultConfig } from '@/models/config'
import { Git } from '@/utils/git'
import { GitHub } from '@/utils/github'
import { handleInstallation } from '@/handlers/installation'
import { Logger } from '@/utils/logger'
import { handlePush } from '@/handlers/push'

export class RepositoryWorkerManager {
  constructor(
    private repositoryWorkerMap: { [key: string]: RepositoryWorker } = {}
  ) {}

  queue(context: WorkerContext, repositoryReference: RepositoryReference) {
    const queueName = this.getRepositoryKey(repositoryReference)
    const repositoryWorker = (this.repositoryWorkerMap[queueName] =
      this.repositoryWorkerMap[queueName] ||
      this.createRepositoryWorker(repositoryReference))
    repositoryWorker.queue(context)
  }

  async createWorkerContext(options: {
    app: Application
    context: Context
    installationId: number | undefined
    issueNumber: number
  }): Promise<WorkerContext> {
    const { app, context, installationId } = options
    const log = app.log
    const createGitHubAPI = async () => {
      return app.auth(installationId, log)
    }

    // parse config
    let config: Config = DefaultConfig
    if (context.name != 'installation') {
      config =
        (await context.config<Config>(
          process.env.CONFIG_FILE || 'marine-otter.yml'
        )) || DefaultConfig
    }

    const logger = new Logger(context.log)

    return {
      createGitHubAPI,
      event: context.name,
      eventAction: context.payload.action,
      payload: context.payload,
      issueNumber: options.issueNumber,
      config,
      logger,
    }
  }

  private createRepositoryWorker(repositoryReference: RepositoryReference) {
    return new RepositoryWorker(
      repositoryReference,
      this.onRepositoryWorkerDrained.bind(this, repositoryReference)
    )
  }

  private getRepositoryKey({ owner, repo }: RepositoryReference) {
    return `${owner}/${repo}`
  }

  private onRepositoryWorkerDrained(repositoryReference: RepositoryReference) {
    const queueName = this.getRepositoryKey(repositoryReference)
    delete this.repositoryWorkerMap[queueName]
  }
}

export class RepositoryWorker {
  private readonly waitQueue: WaitQueue<WorkerContext>

  constructor(public repository: RepositoryReference, onDrain: () => void) {
    this.waitQueue = new WaitQueue<WorkerContext>(
      (context) => `${context}`,
      this.handleWorkContext.bind(this),
      onDrain
    )
  }

  queue(context: WorkerContext) {
    this.waitQueue.stopWaitingFor(context)
    this.waitQueue.queue(context)
  }

  private async handleWorkContext(context: WorkerContext): Promise<void> {
    const {
      context: handlerContext,
      reference,
      handler,
    } = await this.getHandler(context)
    if (handlerContext && reference && handler) {
      try {
        await handler.call(handler, handlerContext, reference)
      } catch (e) {
        console.error('failed to handle', e)
        await context.logger.fatal(e)
      }
    }
  }

  private async getHandler(context: WorkerContext) {
    const { event, eventAction, issueNumber, logger } = context
    let requestContext: HandlerContext | undefined = undefined
    let handler: RequestHandler<any, any> | undefined = undefined
    const requestReference = {
      ...this.repository,
      issue_number: issueNumber,
    } as RepositoryReference

    const git = new Git(
      this.repository.owner,
      this.repository.repo,
      issueNumber
    )
    const githubDelegate =
      (await context.createGitHubAPI()) as unknown as Context['github']
    const github = new GitHub(
      this.repository.owner,
      this.repository.repo,
      issueNumber,
      githubDelegate
    )
    const config = context.config
    const startedAt = new Date()
    switch (event) {
      case 'pull_request':
        {
          requestContext = {
            git,
            config,
            logger,
            github,
            event,
            eventAction,
            startedAt,
            head: context.payload.pull_request.head.ref,
            base: context.payload.pull_request.base.ref,
            merged: context.payload.pull_request.merged,
          } as PullRequestContext
          handler = handlePullRequest
        }
        break
      case 'issue_comment':
        {
          const content = context.payload.comment.body
          const state = context.payload.issue.state
          const hasPullRequest =
            context.payload.issue.html_url.includes('/pull/')
          let pullRequest = undefined
          if (hasPullRequest) {
            pullRequest = await github.getPullRequest()
          }
          requestContext = {
            git,
            config,
            logger,
            github,
            event,
            eventAction,
            startedAt,
            content,
            state,
            hasPullRequest,
            pullRequest,
          } as IssueCommentContext
          handler = handleIssueComment
        }
        break
      case 'push':
        {
          const action = context.payload.created
            ? 'created'
            : context.payload.deleted
            ? 'deleted'
            : 'push'
          requestContext = {
            git,
            config,
            logger,
            github,
            event,
            eventAction: action,
            startedAt,
            ref: context.payload.ref,
          } as PushContext
          handler = handlePush
        }
        break
      case 'installation':
        {
          requestContext = {
            git,
            config,
            logger,
            github,
            event,
            eventAction,
            startedAt,
          } as InstallationContext
          handler = handleInstallation
        }
        break
    }

    return {
      context: requestContext,
      reference: requestReference,
      handler,
    }
  }
}
