import { TaskRunner } from 'src/tasks/task-manager'

import { TaskLogger } from '../task.logger'

@TaskRunner('wait')
export class Wait {
  private logger: TaskLogger

  async main(task, run, logger) {
    this.logger = logger

    await new Promise<void>((resolve, reject) =>
      setTimeout(() => resolve(), 5000),
    )

    this.logger.log('DONE')
  }
}
