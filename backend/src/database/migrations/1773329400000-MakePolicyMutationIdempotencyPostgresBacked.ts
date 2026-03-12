import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePolicyMutationIdempotencyPostgresBacked1773329400000 implements MigrationInterface {
  name = 'MakePolicyMutationIdempotencyPostgresBacked1773329400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "compliance_policy_mutation_history" ADD COLUMN "request_hash" character varying(64)`,
    );
    await queryRunner.query(
      `UPDATE "compliance_policy_mutation_history" SET "idempotency_key" = NULL WHERE "idempotency_key" = ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_policy_mutation_history" ALTER COLUMN "idempotency_key" DROP NOT NULL`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_compliance_policy_mutation_history_idempotency_key"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_compliance_policy_mutation_history_idempotency_key" ON "compliance_policy_mutation_history" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."idx_compliance_policy_mutation_history_idempotency_key"`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_compliance_policy_mutation_history_idempotency_key" ON "compliance_policy_mutation_history" ("idempotency_key") `,
    );
    await queryRunner.query(
      `UPDATE "compliance_policy_mutation_history" SET "idempotency_key" = '' WHERE "idempotency_key" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_policy_mutation_history" ALTER COLUMN "idempotency_key" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_policy_mutation_history" DROP COLUMN "request_hash"`,
    );
  }
}
