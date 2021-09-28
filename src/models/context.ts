import { ProbotOctokit } from 'probot/lib/octokit/probot-octokit'
import { EventPayloads } from '@octokit/webhooks/dist-types/generated/event-payloads'
import { Config } from '@/models/config'
import { Git } from '@/utils/git'
import { EventAction, PullRequest } from '@/models/github'
import { GitHub } from '@/utils/github'
import { Logger } from '@/utils/logger'

export interface WorkerContext {
  createGitHubAPI: () => Promise<InstanceType<typeof ProbotOctokit>>,
  event: string,
  payload: EventPayloads.WebhookPayloadPullRequest & EventPayloads.WebhookPayloadIssueComment & EventPayloads.WebhookPayloadPush
  eventAction: string
  issueNumber: number
  config: Config
  logger: Logger
}

export interface HandlerContext {
  git: Git
  github: GitHub
  event: string
  config: Config
  logger: Logger
  eventAction: EventAction
  startedAt: Date
}

export interface PullRequestContext extends HandlerContext {
  merged: boolean
  head: string,
  base: string
}

export interface IssueCommentContext extends HandlerContext {
  content: string
  state: string
  hasPullRequest: boolean
  pullRequest?: PullRequest
}

export interface InstallationContext extends HandlerContext {

}

export interface PushContext extends HandlerContext {
  ref: string
}
