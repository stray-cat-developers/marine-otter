import { DEFAULT_LABEL, PullRequestReference } from '@/models/github'
import { PullRequestContext } from '@/models/context'
import { VersionManager } from '@/utils/version'

export async function handlePullRequest(
  context: PullRequestContext,
  pullRequestReference: PullRequestReference
) {
  const {
    eventAction,
    logger,
    base,
    config: { releaseBranch },
    github,
  } = context
  if (base === releaseBranch) {
    try {
      if (
        eventAction === 'opened' ||
        eventAction === 'reopened' ||
        eventAction === 'synchronize'
      ) {
        await blockManualMerge(context, pullRequestReference)
        await prepareReleaseNote(context)
      }
      if (eventAction === 'opened' || eventAction === 'reopened') {
        await addHelpComments(context, pullRequestReference)
        await addNextVersionHint(context, pullRequestReference)
        await pullFromBase(context, pullRequestReference)
      }
      if (eventAction === 'closed') {
        await pushTag(context, pullRequestReference)
        await pushMergedCommitIntoMainBranch(context, pullRequestReference)
        await clearClosedIssue(context, pullRequestReference)
      }
    } catch (e) {
      await github.comment(`Failed PR tagging. reason:\n\`\`\`${e}\`\`\``)
      await logger.fatal(e)
    }
  }
}

// set commits as pull request's body
async function prepareReleaseNote(context: PullRequestContext) {
  const { github } = context
  const commits = await github.getCommits()
  let preReleaseNote = ''
  commits.forEach((c) => (preReleaseNote += `${c.message.split('\n')[0]}\n`))
  await github.setPullRequestBody(preReleaseNote)
}

// block manual merge
async function blockManualMerge(
  context: PullRequestContext,
  // @ts-ignore
  reference: PullRequestReference
) {
  const {
    github,
    config: { blockManualMerge },
  } = context
  if (!blockManualMerge) return

  // check manual merge allowed
  const labels = await github.getLabels()
  if (labels.includes(DEFAULT_LABEL.MANUAL_MERGE)) return

  // get current pull request
  const pullRequest = await github.getPullRequest()
  // add check `block merge`
  await github.blockMerge(pullRequest.head.sha)
}

// synchronize head and base
async function pullFromBase(
  context: PullRequestContext,
  // @ts-ignore
  reference: PullRequestReference
) {
  const { git, base, head, github } = context
  let message
  let error
  try {
    // clone head branch
    await git.clone(head!)
  } catch (e) {
    message = `${head} Failed clone.`
    error = e
  }
  if (!error)
    try {
      // pull base into head
      await git.pull(base!)
    } catch (e) {
      message = `${base} Failed pull.`
      error = e
    }
  if (!error)
    try {
      // push to head branch
      await git.push()
    } catch (e) {
      message = `${head} Failed push.`
      error = e
    }
  if (!error) {
    await git.clear()
  }
  // if there was an error, alert
  if (message || error) {
    console.error(message, error)
    await github.comment(`${message}\n\`\`\`${error}\`\`\``)
  } else {
    await github.comment(`${head}에서 ${base} 브랜치를 pull하였습니다`)
  }
}

// when pr opened, add help comment
async function addHelpComments(
  context: PullRequestContext,
  // @ts-ignore
  reference: PullRequestReference
) {
  const {
    github,
    config: { mergeMethod },
  } = context
  const labels = await github.getLabels()
  if (labels.includes(DEFAULT_LABEL.BOT)) return
  // add help comment
  await github.comment(
    `## 간편한 배포를 도와주는 Release Bot 입니다. :)
### 다음과 같은 기능을 지원합니다. 
 **버전 태깅, 머지, 릴리즈노트 추가**

1. 버전 태깅 & 머지
\`!release-bot release v(MAJOR).(MINOR).(PATCH)\`
ex) \`!release-bot release v1.1.1\`

ex) version이 v1.0.0이고 
PR의 내용이 feature: blahblah 인 경우 아래와 같이 ${mergeMethod} commit하고 버전 태깅 후 release 합니다.
커밋 이름 : Release v1.0.0
커밋 내용 : feature: blahblah

2. 릴리즈노트 추가
머지(1)시 해당 PR의 내용을 릴리즈노트로 추가하고 태그를 push 합니다.
`
  )

  // push label
  await github.addLabels([DEFAULT_LABEL.BOT])
}

async function addNextVersionHint(
  context: PullRequestContext,
  // @ts-ignore
  reference: PullRequestReference
) {
  const { github, merged } = context
  if (merged) return

  const tags = await github.getTags()
  const versions = tags.filter((t) => VersionManager.isValid(t))
  if (versions.length === 0) {
    await github.comment(
      `## 배포할 버전을 추천드립니다.
      \n버전을 생성하는 것은 [유의적 버전](https://semver.org/lang/ko/) 문서를 참고하세요.
      \nMajor: v1.0.0 (개편)
      \nMinor: v0.1.0 (New Feature)
      \nPatch: v0.0.1 (버그 수정, 작은 기능 수정)`
    )
    return
  }
  const versionManager = new VersionManager(versions)
  const { nextMajor, nextMinor, nextPatch } = versionManager

  // comment version hint
  await github.comment(
    `## 배포할 버전을 추천드립니다.
      \nMajor: v${nextMajor}
      \nMinor: v${nextMinor}
      \nPatch: v${nextPatch}`
  )
}

// when pr merged, push tag, publish release note
async function pushTag(
  context: PullRequestContext,
  // @ts-ignore
  reference: PullRequestReference
) {
  const {
    merged,
    github,
    config: { releaseTitleTemplate },
    logger,
  } = context
  if (!merged) return

  const labels = await github.getLabels()
  const version = labels.find((v) => VersionManager.isValid(v))
  if (!version) {
    await github.comment(
      '배포해야할 버전을 찾을 수 없습니다. 버전을 확인해주세요'
    )
    return
  }
  const { body, merge_commit_sha } = await github.getPullRequest()
  try {
    const releaseTitle = releaseTitleTemplate!.replace('${VERSION}', version)
    await github.createRelease(merge_commit_sha!, version, releaseTitle, body)
    await github.comment(`sha:${merge_commit_sha}에 대한 ${version} 태깅`)
    const releaseNoteLink = await github.getReleaseNotePath(version)
    await github.comment(
      `릴리즈노트 [${releaseTitle}](${releaseNoteLink})가 생성되었습니다.`
    )
  } catch (e) {
    await github.comment(
      `sha:${merge_commit_sha}에 대한 ${version} 태깅에 실패하였습니다\n\`\`\`${e}\`\`\``
    )
    await logger.fatal(e)
  }
}

async function pushMergedCommitIntoMainBranch(
  context: PullRequestContext,
  // @ts-ignore
  reference: PullRequestReference
) {
  const {
    git,
    github,
    base,
    config: { mainBranch },
    merged,
    logger,
  } = context
  if (!merged) return
  try {
    await git.clear()
    await git.clone(mainBranch!)
    await git.pull(base!)
    await git.push()
    await github.comment(`${base}와 ${mainBranch} 브랜치를 동기화하였습니다.`)
    await git.clear()
  } catch (e) {
    await github.comment(
      `${base}와 ${mainBranch} 브랜치를 동기화 할 수 없습니다.\n\`\`\`${e}\`\`\`
  `
    )
    await logger.fatal(e)
  }
}

async function clearClosedIssue(
  context: PullRequestContext,
  // @ts-ignore
  reference: PullRequestReference
) {
  const { git } = context
  await git.clear()
}
