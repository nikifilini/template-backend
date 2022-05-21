import { Module } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './prisma.module'
import routes from './routes'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    PrismaModule,
    RouterModule.register(routes),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
