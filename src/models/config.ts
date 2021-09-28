
export interface Config {
  enabled?: boolean
  releaseTitleTemplate?: string
  mergeMethod?: string
  mainBranch?: string
  releaseBranch?: string
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
