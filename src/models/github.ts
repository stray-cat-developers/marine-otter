export interface RepositoryReference {
  owner: string
  repo: string
}

export interface PullRequestReference extends RepositoryReference {
  issue_number: number
}

export interface IssueCommentReference extends RepositoryReference {
  issue_number: number
}

export type InstallationReference = RepositoryReference

export type PushReference = RepositoryReference

export const DEFAULT_BLOCK_MERGE_STATUS = {
  name: 'block-manual-merge',
  description: 'block-manual-merge',
  context: 'release-bot',
}

export const DEFAULT_PR_BUILD_STATUS = {
  context: 'continuous-integration/jenkins/pr-merge',
}

export const DEFAULT_BRANCH_BUILD_STATUS = {
  context: 'continuous-integration/jenkins/branch',
}

export type PullRequestEventAction = 'opened' | 'closed' | 'synchronize'

export type IssueCommentEventAction = 'created' | 'deleted' | 'edited'

export type InstallationEventAction = 'created' | 'deleted'

export type EventAction = PullRequestEventAction &
  IssueCommentEventAction &
  InstallationEventAction

export type CommitStatus = 'success' | 'error' | 'pending'

export type MergeMethod = 'merge' | 'squash'

export type MemberRole = 'admin' | 'member'

export const DEFAULT_LABEL = {
  MANUAL_MERGE: 'merge:manual',
  BOT: 'release',
}
