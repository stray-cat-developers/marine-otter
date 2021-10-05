import { RepositoryReference } from '@/models/github'
import { HandlerContext } from '@/models/context'

export type RequestHandler<
  C extends HandlerContext,
  R extends RepositoryReference
> = (context: C, reference: R) => void | Promise<void>
