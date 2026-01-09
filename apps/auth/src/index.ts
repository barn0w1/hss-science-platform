import { serve } from '@hono/node-server'
import { env } from './config/env.js'
import app from './app.js'

console.log(`Auth Server running on port ${env.PORT}`)

serve({
  fetch: app.fetch,
  port: env.PORT
})