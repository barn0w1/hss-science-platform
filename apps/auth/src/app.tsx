import { Hono } from 'hono'
import { logger } from 'hono/logger'
import authRoute from './routes/auth'

const app = new Hono()

app.use('*', logger())

// ルーティングのマウント
app.route('/auth', authRoute)

// ルートアクセスはログインへ
app.get('/', (c) => c.redirect('/auth/login'))

export default app
