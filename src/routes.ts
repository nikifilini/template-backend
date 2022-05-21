import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { Router } from './utils/router'

const r = new Router()

r.resource('auth', AuthModule)
r.resource('users', UsersModule)

const routes = r.routes
export default routes
