import { IssueCommentContext } from '@/models/context'
import { DEFAULT_LABEL, IssueCommentReference } from '@/models/github'
import { RequestHandler } from '@/models/handler'
import { VersionManager } from '@/utils/version'

export const handleIssueComment: RequestHandler<
  IssueCommentContext,
  IssueCommentReference
> = async (context: IssueCommentContext, reference: IssueCommentReference) => {
  const { state, hasPullRequest, eventAction, github, pullRequest, logger } =
    context

  if (hasPullRequest) {
    try {
      if (
        state !== 'closed' &&
        eventAction === 'created' &&
        !pullRequest?.merged
      ) {
        await allowManualMerge(context, reference)
        await processRelease(context, reference)
      }
    } catch (e) {
      await github.comment(
        `Failed to execute manual merge or release.\n\`\`\`${e}\`\`\``
      )
      await logger.fatal(e)
    }
  }
}

async function allowManualMerge(
  context: IssueCommentContext,
  // @ts-ignore
  reference: IssueCommentReference
) {
  const { github, content, pullRequest } = context
  const enableManualMerge = RegExp(
    `^!release-bot enable manualMerge$`,
    'g'
  ).test(content)
  if (!enableManualMerge) return
  await github.addLabels([DEFAULT_LABEL.MANUAL_MERGE])
  await github.allowMerge(pullRequest?.head.sha || '')
}

async function processRelease(
  context: IssueCommentContext,
  // @ts-ignore
  reference: IssueCommentReference
) {
  const {
    github,
    config: { mergeMethod, releaseTitleTemplate },
    pullRequest,
    content,
    logger,
  } = context

  if (!content.startsWith('!release-bot release')) return

  if (!checkReleaseBranch(context)) {
    await github.comment(
      `It is not a release able target branch. (base:${context.pullRequest?.base.ref}), release: ${context.config.releaseBranch})`
    )
    return
  }

  if (!pullRequest!.mergeable) {
    await github.comment(
      'The PR cannot be merged. Please check the status or try again later'
    )
    return
  }

  const [, version] =
    RegExp(`^!release-bot release (v.+)$`, 'g').exec(content) || []
  if (!version || !VersionManager.isValid(version)) {
    await github.comment(`Incorrect release version!`)
    return
  }

  // check duplicate version
  const tags = await github.getTags()
  if (tags.find((t) => t === version)) {
    await github.comment('The same version exists. please check the version.')
    return
  }

  await github.addLabels([version])
  // allow merge
  await github.allowMerge(pullRequest?.head.sha || '')

  // merge commit
  try {
    await github.mergePullRequest(
      releaseTitleTemplate!.replace('${VERSION}', version),
      `${pullRequest!.body}`,
      mergeMethod as any
    )
  } catch (e) {
    await github.comment(
      `The merge could not be performed for the following reasons:\n\`\`\`${e}\`\`\``
    )
    await logger.fatal(e)
  }
}

function checkReleaseBranch(context: IssueCommentContext): boolean {
  const { config, pullRequest } = context
  return pullRequest?.base?.ref === config.releaseBranch
}
