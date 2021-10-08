import 'module-alias/register'
import { Application } from 'probot'
import { Router } from 'express'
import { addListeners } from '@/initialize'

import { config } from 'dotenv-flow'

config({ silent: true })

export = ({
  app,
  getRouter,
}: {
  app: Application
  getRouter: () => Router
}) => {
  addListeners(app, getRouter())
}
