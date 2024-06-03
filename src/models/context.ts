import { ProbotOctokit } from 'probot/lib/octokit/probot-octokit'
import { Config } from '@/models/config'
import { Git } from '@/utils/git'
import { EventAction } from '@/models/github'
import { GitHub } from '@/utils/github'
import { Logger } from '@/utils/logger'
import {
  IssueCommentEvent,
  PullRequest,
  PullRequestEvent,
  PushEvent,
} from '@octokit/webhooks-types'

export type WorkerContextEventPayload = PullRequestEvent &
  IssueCommentEvent &
  PushEvent

export interface WorkerContext {
  createGitHubAPI: () => Promise<InstanceType<typeof ProbotOctokit>>
  event: string
  payload: WorkerContextEventPayload
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
  head: string
  base: string
}

export interface IssueCommentContext extends HandlerContext {
  content: string
  state: string
  hasPullRequest: boolean
  pullRequest?: PullRequest
}

export type InstallationContext = HandlerContext

export interface PushContext extends HandlerContext {
  ref: string
}
