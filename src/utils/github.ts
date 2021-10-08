import { Context } from 'probot'
import {
  CommitStatus,
  DEFAULT_BLOCK_MERGE_STATUS,
  DEFAULT_BRANCH_BUILD_STATUS,
  DEFAULT_PR_BUILD_STATUS,
  MemberRole,
  MergeMethod,
  PullRequest,
} from '@/models/github'

export class GitHub {
  constructor(
    private owner: string,
    private repo: string,
    private issueNumber: number,
    private readonly delegate: Context['github']
  ) {}

  private get reference() {
    return {
      repo: this.repo,
      owner: this.owner,
    }
  }

  async addUserToOrganization(member: string, role: MemberRole = 'admin') {
    await this.delegate.orgs.setMembershipForUser({
      org: this.owner,
      username: member,
      role,
    })
  }

  async getReleaseNotePath(version: string) {
    const { data } = await this.delegate.repos.getReleaseByTag({
      ...this.reference,
      tag: version,
    })
    return data.html_url
  }

  async setRepository({
    allowMergeCommit,
    allowSquashMerge,
    allowRebaseMerge,
  }: {
    allowRebaseMerge?: boolean
    allowMergeCommit?: boolean
    allowSquashMerge?: boolean
  }) {
    await this.delegate.repos.update({
      ...this.reference,
      allow_merge_commit: allowMergeCommit,
      allow_squash_merge: allowSquashMerge,
      allow_rebase_merge: allowRebaseMerge,
    })
  }

  async setBranchProtection(
    branch: string,
    option: {
      onlySquashMerge?: boolean
      blockManualMerge?: boolean
      requireBranchBuildSuccess?: boolean
      requirePRBuildSuccess?: boolean
      requireReviewAtLeast?: number
    }
  ) {
    const requireChecks = []
    if (option.blockManualMerge)
      requireChecks.push(DEFAULT_BLOCK_MERGE_STATUS.context)
    if (option.requireBranchBuildSuccess)
      requireChecks.push(DEFAULT_BRANCH_BUILD_STATUS.context)
    if (option.requirePRBuildSuccess)
      requireChecks.push(DEFAULT_PR_BUILD_STATUS.context)

    await this.delegate.repos.updateBranchProtection({
      ...this.reference,
      branch,
      required_linear_history: option.onlySquashMerge,
      required_status_checks: {
        strict: true,
        contexts: requireChecks,
      },
      enforce_admins: false,
      required_pull_request_reviews:
        option.requireReviewAtLeast || 0 > 0
          ? {
              required_approving_review_count: option.requireReviewAtLeast,
            }
          : null,
      restrictions: null,
      headers: {
        // @see https://developer.github.com/enterprise/2.21/v3/repos/branches/#update-branch-protection
        accept: 'application/vnd.github.luke-cage-preview+json',
      },
    })
  }

  async comment(content: string) {
    await this.delegate.issues.createComment({
      ...this.reference,
      issue_number: this.issueNumber,
      body: content,
    })
  }

  async getPullRequest() {
    const { data: pullRequest } = await this.delegate.pulls.get({
      ...this.reference,
      pull_number: this.issueNumber,
    })
    return pullRequest as unknown as PullRequest
  }

  async mergePullRequest(title: string, content: string, method: MergeMethod) {
    await this.delegate.pulls.merge({
      ...this.reference,
      pull_number: this.issueNumber,
      commit_title: title,
      commit_message: content,
      merge_method: method,
    })
  }

  async getLabels() {
    const { data } = await this.delegate.issues.listLabelsOnIssue({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.issueNumber,
    })
    return data.map((v) => v.name)
  }

  async addLabels(labels: string[]) {
    const currentLabels = await this.getLabels()
    await this.delegate.issues.setLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.issueNumber,
      labels: currentLabels.concat(labels),
    })
  }

  async getTags() {
    const { data } = await this.delegate.repos.listTags({
      owner: this.owner,
      repo: this.repo,
    })
    return data.map((v) => v.name)
  }

  async blockMerge(sha: string) {
    await this.createCommitStatus(
      sha,
      'error',
      DEFAULT_BLOCK_MERGE_STATUS.name,
      DEFAULT_BLOCK_MERGE_STATUS.context,
      DEFAULT_BLOCK_MERGE_STATUS.description
    )
  }

  async allowMerge(sha: string) {
    await this.createCommitStatus(
      sha,
      'success',
      DEFAULT_BLOCK_MERGE_STATUS.name,
      DEFAULT_BLOCK_MERGE_STATUS.context,
      DEFAULT_BLOCK_MERGE_STATUS.description
    )
  }

  async getCommits() {
    const { data } = await this.delegate.pulls.listCommits({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.issueNumber,
    })
    return data.map((v) => v.commit)
  }

  async setPullRequestBody(message: string) {
    await this.delegate.pulls.update({
      owner: this.owner,
      repo: this.repo,
      pull_number: this.issueNumber,
      body: message,
    })
  }

  async createRelease(
    sha: string,
    tag: string,
    title: string,
    content: string
  ) {
    await this.delegate.repos.createRelease({
      ...this.reference,
      target_commitish: sha,
      tag_name: tag,
      name: title,
      body: content,
    })
  }

  private async createCommitStatus(
    sha: string,
    state: CommitStatus,
    name: string,
    context: string,
    description?: string
  ) {
    await this.delegate.repos.createCommitStatus({
      ...this.reference,
      name,
      context,
      description,
      state,
      sha,
    })
  }
}
