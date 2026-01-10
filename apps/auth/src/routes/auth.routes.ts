import { Hono } from 'hono'
import * as AuthController from '../controllers/auth.controller.js'

const app = new Hono()

// Routes Definition (Declarative)

// GET /auth/login -> Show Page
app.get('/login', AuthController.showLoginPage)

// GET /auth/discord -> Start OAuth
app.get('/discord', AuthController.startDiscordAuth)

// GET /auth/callback -> Handle Return
app.get('/callback', AuthController.handleDiscordCallback)

export const authRoutes = app
