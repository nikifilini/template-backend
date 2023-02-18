import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { createClient } from 'redis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  client = createClient({
    url: process.env.REDIS_URL,
  })

  async onModuleInit() {
    await this.client.connect()
  }

  async onModuleDestroy() {
    await this.client?.quit()
  }
}
