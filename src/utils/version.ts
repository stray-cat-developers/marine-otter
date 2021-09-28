import { SemVer, sort, parse } from 'semver'

export class VersionManager {
  private readonly current: SemVer | null

  constructor (readonly versions: string[]) {
    this.current = parse(sort(versions).pop())
  }

  get nextMajor () {
    return this.raw?.inc('major')
  }

  get nextMinor () {
    return this.raw?.inc('minor')
  }

  get nextPatch () {
    return this.raw?.inc('patch')
  }

  private get raw () {
    return parse(this.current?.raw)
  }

  static isValid (version: string) {
    return parse(version) !== null
  }
}
