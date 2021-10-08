import { RequestHandler } from '@/models/handler'
import { InstallationContext } from '@/models/context'
import { InstallationReference } from '@/models/github'

export const handleInstallation: RequestHandler<
  InstallationContext,
  InstallationReference
> = async (context: InstallationContext, reference: InstallationReference) => {
  const { eventAction, logger } = context
  if (eventAction === 'created') {
    try {
      await addGitMember(context, reference)
      await setRepositoryPermissions(context, reference)
      await setBranchProtectionRules(context, reference)
    } catch (e) {
      await logger.fatal(`failed to initial configure ${reference}`)
    }
  }
}

// add GIT_USER as admin
async function addGitMember(
  context: InstallationContext,
  reference: InstallationReference
) {
  const { github, logger } = context
  await logger.debug(JSON.stringify(reference))
  await github.addUserToOrganization(process.env.GIT_USER!)
}

// set repository merge methods and other options if possible
async function setRepositoryPermissions(
  context: InstallationContext,
  reference: InstallationReference
) {
  const { github, logger } = context
  await logger.debug(JSON.stringify(reference))
  await github.setRepository({
    allowMergeCommit: true,
    allowSquashMerge: true,
    allowRebaseMerge: false,
  })
}

// add default branch protection rules
async function setBranchProtectionRules(
  context: InstallationContext,
  reference: InstallationReference
) {
  const {
    github,
    config: { mainBranch, releaseBranch },
    logger,
  } = context

  await logger.debug(JSON.stringify(reference))
  await github.setBranchProtection(mainBranch, {
    requirePRBuildSuccess: true,
    onlySquashMerge: true,
    requireReviewAtLeast: 1,
  })
  await github.setBranchProtection(releaseBranch, {
    requirePRBuildSuccess: true,
    blockManualMerge: true,
  })
}
