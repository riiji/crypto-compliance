import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplianceModule } from './compliance/compliance.module';
import { createTypeOrmConfig } from './database/typeorm.config';
import { createBullmqConfig } from './queue/bullmq.config';

@Module({
  imports: [
    SentryModule.forRoot(),
    TypeOrmModule.forRoot(createTypeOrmConfig()),
    BullModule.forRoot(createBullmqConfig()),
    ComplianceModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
