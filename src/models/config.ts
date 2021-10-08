export interface Config {
  mainBranch: string
  releaseBranch: string
  enabled?: boolean
  releaseTitleTemplate?: string
  mergeMethod?: string
  blockManualMerge?: boolean
}

class Default implements Config {
  enabled = true
  releaseTitleTemplate = 'Release ${VERSION}'
  mergeMethod = 'merge'
  mainBranch = 'master'
  releaseBranch = 'release'
  blockManualMerge = true
}

export const DefaultConfig = new Default()
