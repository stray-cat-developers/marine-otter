import simpleGit, { SimpleGit } from 'simple-git'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, rmdirSync } from 'fs'
import { isProduction } from '@/utils/env'

export class Git {
  private gitClient: SimpleGit
  private gitHost = process.env.GIT_HOST
  private user = process.env.GIT_USER
  private password = process.env.GIT_TOKEN
  private readonly baseDir: string

  constructor(
    protected owner: string,
    protected repository: string,
    protected issueNumber: number
  ) {
    this.issueNumber = issueNumber
    this.baseDir = join(
      process.cwd(),
      'git-workspaces',
      owner,
      repository,
      '' + issueNumber
    )
    mkdirSync(this.baseDir, { recursive: true })
    this.gitClient = simpleGit({
      baseDir: this.baseDir,
    })
    if (isProduction()) {
      this.gitClient.raw([
        'config',
        '--global',
        'user.name',
        process.env.APP_NAME || '',
      ])
      this.gitClient.raw([
        'config',
        '--global',
        'user.email',
        process.env.GIT_USER_EMAIL || '',
      ])
      this.gitClient.raw(['config', '--global', 'push.default', 'simple'])
    }
  }

  async pull(branch: string, remote = 'origin') {
    return this.gitClient.pull(remote, branch)
  }

  async push(force = false) {
    const option = force ? { '--force': null } : undefined

    return this.gitClient.push(undefined, undefined, option)
  }

  async clear() {
    if (existsSync(this.baseDir)) {
      rmdirSync(this.baseDir, { recursive: true })
      mkdirSync(this.baseDir, { recursive: true })
    }
  }

  async clone(branch: string) {
    if (readdirSync(this.baseDir).length != 0) return

    return this.gitClient.clone(this.auth(), this.baseDir, {
      '-b': null,
      [branch]: null,
      '--single-branch': null,
    })
  }

  private auth() {
    return `https://${this.user}:${this.password}@${this.gitHost}/${this.owner}/${this.repository}`
  }
}
