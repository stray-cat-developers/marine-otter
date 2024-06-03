import { Router } from 'express'
import { Probot, Context } from 'probot'
import { RepositoryWorkerManager } from '@/workers/repository-worker'
import { RepositoryReference } from '@/models/github'

export const addListeners = (app: Probot, router: Router) => {
  const repositoryWorkerManager = new RepositoryWorkerManager()

  async function enqueue(
    app: Probot,
    context: Context,
    installationId: number | undefined,
    repository: RepositoryReference,
    workNumbers: number[]
  ) {
    for (const workNumber of workNumbers) {
      const workerContext = await repositoryWorkerManager.createWorkerContext({
        app,
        context,
        installationId,
        issueNumber: workNumber,
      })
      repositoryWorkerManager.queue(workerContext, {
        owner: repository.owner,
        repo: repository.repo,
      })
    }
  }

  app.on(
    [
      'pull_request.opened',
      'pull_request.synchronize',
      'pull_request.reopened',
      'pull_request.closed',
    ],
    async (context) => {
      await enqueue(
        app,
        context,
        context.payload.installation?.id,
        {
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
        },
        [context.payload.pull_request.number]
      )
    }
  )

  app.on(['push'], async (context) => {
    await enqueue(
      app,
      context,
      context.payload.installation?.id,
      {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        // push는 issue가 아니므로 -1로 한다.
      },
      [-1]
    )
  })

  app.on(['issue_comment'], async (context) => {
    await enqueue(
      app,
      context,
      context.payload.installation?.id,
      {
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
      },
      [context.payload.issue.number]
    )
  })

  app.on(['installation.created'], async (context) => {
    for (const repository of context.payload?.repositories ?? []) {
      const [owner, repo] = repository.full_name.split('/')
      await enqueue(
        app,
        context,
        context.payload.installation?.id,
        {
          owner,
          repo,
          // installation은 issue가 아니므로 -1로 한다.
        },
        [-1]
      )
    }
  })

  router.get('/health', (_, res) => {
    res.send('OK')
  })
}
