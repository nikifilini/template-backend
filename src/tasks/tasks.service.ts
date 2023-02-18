import { Inject, Injectable, Logger } from '@nestjs/common'
import { TaskRun, Task, Prisma } from '@prisma/client'
import { isEqual } from 'lodash'
import { DateTime } from 'luxon'
import { PrismaService } from 'src/prisma.service'
import { v4 } from 'uuid'

import { TaskManager } from './task-manager'
import { TaskLogger } from './task.logger'

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private taskManager: TaskManager,
    private taskLogger: TaskLogger,
  ) {}

  private readonly logger = new Logger(TasksService.name)

  async find(
    limit: number,
    offset: number,
    search?: Prisma.TaskWhereInput,
  ): Promise<Task[]> {
    return this.prisma.task.findMany({
      take: limit,
      skip: offset,
      orderBy: { updatedAt: 'desc' },
      include: {
        runs: {
          include: {
            subtasks: {
              include: {
                runs: true,
              },
            },
          },
        },
      },
      where: search,
    })
  }

  async findOne(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: { runs: true },
    })
  }

  async findPending(isBig = false) {
    const start = new Date()
    const pendingTasks = await this.prisma.$queryRaw<
      Task[]
    >`SELECT * FROM "task" WHERE status IN ('CREATED', 'ERROR') AND retries < 5 AND (retries = 0 OR "createdAt" > current_timestamp - interval '1 hour') AND "isBig"=${isBig} ORDER BY "createdAt" ASC LIMIT 10000`
    const end = new Date()
    console.log((end.getTime() - start.getTime()) / 1000)
    return pendingTasks
  }

  timer: NodeJS.Timeout = null
  _registerQueue: [
    string,
    any,
    Task | undefined,
    TaskRun | undefined,
    string | undefined,
    boolean | undefined,
  ][] = []
  async registerQueue(
    name: string,
    data: any,
    parent?: Task,
    parentRun?: TaskRun,
    eventId?: string,
    isBig?: boolean,
  ) {
    this._registerQueue.push([name, data, parent, parentRun, eventId, isBig])
  }

  async onModuleInit() {
    const runQueue = async () => {
      const data = this._registerQueue.shift()
      if (data) {
        await this.register(...data)
      }
      this.timer = setTimeout(() => runQueue(), 200)
    }

    await runQueue()
  }

  async register(
    name: string,
    data: any,
    parent?: Task,
    parentRun?: TaskRun,
    eventId?: string,
    isBig?: boolean,
  ) {
    const taskData: Prisma.TaskUncheckedCreateInput = { name, data, eventId }
    if (parent) {
      taskData.parentId = parent.id
      taskData.isBig = isBig !== undefined ? isBig : parent.isBig
    } else {
      taskData.isBig = !!isBig
    }

    if (parentRun) taskData.parentRunId = parentRun.id

    const pending = await this.findPending(isBig)

    const existing = pending.find(
      (p) => p.name === name && isEqual(p.data, data),
    )
    if (existing) {
      this.logger.log(
        `Task ${name}${
          taskData.isBig ? ' (big)' : ''
        } with data ${JSON.stringify(data)} already exists (${existing.id})`,
      )
      return existing
    }

    return this.prisma.task.create({ data: taskData })
  }

  async simpleRun(taskInfo: { name: string; data: any }) {
    const task = taskInfo as Task
    task.id = v4()

    const run = {
      id: v4(),
      taskId: task.id,
      status: 'running',
      createdAt: new Date(),
      updatedAt: new Date(),
      finishedAt: new Date(),
    } as TaskRun

    const logger = new TaskLogger(task.name)
    await this.taskManager.runTask(task, run, logger)
  }

  async runTask(task: Task) {
    let transaction
    task = await this.prisma.task.findUnique({
      where: { id: task.id },
      include: { runs: true },
    })

    let run = await this.prisma.taskRun.create({
      data: {
        taskId: task.id,
        status: 'running',
      },
    })

    task.status = 'RUNNING'
    task.retries += 1
    await this.prisma.task.update({
      where: { id: task.id },
      data: { status: task.status, retries: task.retries },
    })

    const logger = new TaskLogger(task.name)

    const startedAt = DateTime.now().toSeconds()

    try {
      this.logger.log(
        `Running ${task.isBig ? 'BIG' : 'small'} task ${
          task.name
        } ${JSON.stringify(task.data)}`,
      )
      await this.taskManager.runTask(task, run, logger)
      run.status = 'done'
      task.status = 'SUCCESS'
    } catch (err) {
      logger.error(err)
      this.logger.error(err)
      task.status = 'ERROR'
      run.status = 'error'
    } finally {
      run.finishedAt = new Date()
      run = await this.prisma.taskRun.update({
        where: { id: run.id },
        data: { status: run.status, finishedAt: run.finishedAt },
      })
      task = await this.prisma.task.update({
        where: { id: task.id },
        data: { status: task.status, retries: task.retries },
      })
    }

    const finishedAt = DateTime.now().toSeconds()
    this.logger.log(`Task finished, ${Math.round(finishedAt - startedAt)}s`)

    if (transaction) {
      transaction.finish()
    }

    return run.status === 'done'
  }

  async runSubtask(name: string, data: any, parent: Task, parentRun: TaskRun) {
    return this.runTask(await this.register(name, data, parent, parentRun))
  }

  async runQueue() {
    const runFirstTask = async () => {
      const tasks = await this.findPending()
      if (!tasks.length) {
        // eslint-disable-next-line no-console
        console.log('No tasks, waiting...')
        setTimeout(() => runFirstTask(), 5000)
        return
      }
      try {
        await this.runTask(tasks[0])
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err)
      }
      runFirstTask().catch(this.logger.error)
    }
    return runFirstTask()
  }
}
