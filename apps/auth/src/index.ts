import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { logger } from 'hono/logger'
import { PORTS } from '@hss/config'

// Routes (Declarative)
import { authRoutes } from './routes/auth.routes.js'

const app = new Hono()

// Global Middleware
app.use('*', logger())

// Default route for health check
app.get('/', (c) => c.text('HSS Auth Service is Running.'))

// Mount routes (Sub-apps)
app.route('/auth', authRoutes)

console.log(`Auth Service running on port ${PORTS.AUTH}`)

serve({
  fetch: app.fetch,
  port: PORTS.AUTH
})
