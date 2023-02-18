import { forwardRef, Module } from '@nestjs/common'
import { UsersModule } from 'src/users/users.module'

import { Wait } from './one-time/wait.task'
import { TaskManager } from './task-manager'
import { TaskLogger } from './task.logger'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'
import { TestTask } from './test.task'

// insert new imports here

require('dotenv').config()

const chConfig: Record<string, any> = {
  name: 'CLICKHOUSE',
  host: process.env.CH_HOST ?? '127.0.0.1',
  port: process.env.CH_PORT ? parseInt(process.env.CH_PORT) : 8123,
  database: process.env.CH_DATABASE,
}

if (process.env.CH_USERNAME) {
  chConfig.username = process.env.CH_USERNAME
  chConfig.password = process.env.CH_PASSWORD
}

@Module({
  imports: [UsersModule],
  providers: [
    TasksService,
    TestTask,
    TaskManager,
    Wait,
    TaskLogger,
    // insert new tasks here
  ],
  controllers: [TasksController],
  exports: [TasksService],
})
export class TasksModule {}
