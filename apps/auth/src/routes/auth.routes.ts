import { Hono } from 'hono'
import * as AuthController from '../controllers/auth.js'
import { redirectIfAuthenticated } from '../middlewares/session.middleware.js'

const app = new Hono()

// Routes Definition (Declarative)

// GET /auth/login -> Show Page
// If already logged in, redirect immediately
app.get('/login', redirectIfAuthenticated, AuthController.showLoginPage)

// GET /auth/discord -> Start OAuth
// If already logged in, redirect immediately
app.get('/discord', redirectIfAuthenticated, AuthController.startDiscordAuth)

// GET /auth/callback -> Handle Return
app.get('/callback', AuthController.handleDiscordCallback)

export const authRoutes = app
