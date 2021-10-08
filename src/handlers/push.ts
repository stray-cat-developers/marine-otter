import { RequestHandler } from '@/models/handler'
import { PushReference } from '@/models/github'
import { PushContext } from '@/models/context'

export const handlePush: RequestHandler<PushContext, PushReference> = async (
  context: PushContext,
  reference: PushReference
) => {
  const { eventAction, logger } = context
  if (eventAction === 'created') {
    try {
      await setBranchProtectionRules(context, reference)
    } catch (e) {
      console.error(`failed to handle push ${reference}`, e)
      await logger.fatal(e)
    }
  }
}

// add default branch protection rules
async function setBranchProtectionRules(
  context: PushContext,
  reference: PushReference
) {
  const {
    github,
    config: { mainBranch, releaseBranch },
    ref,
    logger,
  } = context
  await logger.debug(JSON.stringify(reference))
  if (ref == `refs/heads/${mainBranch}`) {
    await github.setBranchProtection(mainBranch!, {
      requirePRBuildSuccess: true,
      onlySquashMerge: true,
      requireReviewAtLeast: 1,
    })
  }
  if (ref == `refs/heads/${releaseBranch}`) {
    await github.setBranchProtection(releaseBranch!, {
      requirePRBuildSuccess: true,
      blockManualMerge: true,
    })
  }
}
