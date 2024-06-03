import 'module-alias/register'
import { Probot } from 'probot'
import { Router } from 'express'
import { addListeners } from '@/initialize'

import { config } from 'dotenv-flow'

config({ silent: true })

export = ({ app, getRouter }: { app: Probot; getRouter: () => Router }) => {
  addListeners(app, getRouter())
}
