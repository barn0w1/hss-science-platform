import { Hono } from 'hono'
import { logger } from 'hono/logger'
import appHandler from './handlers/auth.js'

const app = new Hono()

app.use('*', logger())

app.route('/auth', appHandler)

app.get('/', (c) => c.redirect('/auth/login'))

export default app
