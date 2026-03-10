import { Metadata } from '@grpc/grpc-js';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import type { Hero, HeroById } from './hero/hero';
import type { ServerUnaryCall } from '@grpc/grpc-js';
import { Assert } from 'node:assert';

@Controller()
export class HeroesController {
  @GrpcMethod('HeroesService', 'FindOne')
  findOne(
    data: HeroById,
    metadata: Metadata,
    call: ServerUnaryCall<any, any>,
  ): Hero {
    const items: Hero[] = [
      { id: 1, name: 'John' },
      { id: 2, name: 'Doe' },
    ];

    const assert = new Assert();
    let item = items.find(({ id }) => id === data.id);
    assert.notEqual(item, undefined, `Hero with id ${data.id} not found`);

    return items.find(({ id }) => id === data.id)!;
  }
}
