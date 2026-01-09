import { serve } from '@hono/node-server'
import { env } from './config/env'
import app from './app'

console.log(`Auth Server running on port ${env.PORT}`)

serve({
  fetch: app.fetch,
  port: env.PORT
})