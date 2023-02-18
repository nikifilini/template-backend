import { Module } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { AuthModule } from './auth/auth.module'
import { GlobalStuffModule } from './globalStuff/globalStuff.module'
import { PrismaModule } from './prisma.module'
import routes from './routes'
import { TasksModule } from './tasks/tasks.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    GlobalStuffModule,
    PrismaModule,
    RouterModule.register(routes),
    AuthModule,
    UsersModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
