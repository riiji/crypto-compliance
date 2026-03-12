import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoMigration1773245886946 implements MigrationInterface {
  name = 'AutoMigration1773245886946';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "compliance_address_policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" character varying(191) NOT NULL, "network" character varying(64) NOT NULL, "policy" character varying(16) NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "uq_compliance_address_policies_network_address_policy" UNIQUE ("network", "address", "policy"), CONSTRAINT "PK_438773ebae34b91b8bee8621679" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_compliance_address_policies_list" ON "compliance_address_policies" ("policy", "network", "address") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_compliance_address_policies_lookup" ON "compliance_address_policies" ("network", "address") `,
    );
    await queryRunner.query(
      `CREATE TABLE "compliance_check_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" character varying(191) NOT NULL, "network" character varying(64) NOT NULL, "status" character varying(16) NOT NULL, "risk_score" double precision, "signals" jsonb, "checked_at" TIMESTAMP WITH TIME ZONE, "assessment_source" character varying(16) NOT NULL, "retrieval_source" character varying(16) NOT NULL, "is_high_risk" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_279ca5aa5a683b0fdea6887052e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_compliance_check_history_lookup" ON "compliance_check_history" ("network", "address", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."compliance_check_records_source_enum" AS ENUM('provider', 'cache', 'blacklist', 'whitelist')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."compliance_check_records_decision_enum" AS ENUM('high_risk', 'low_risk', 'unknown')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."compliance_check_records_provider_status_enum" AS ENUM('ready', 'in_progress', 'not_requested')`,
    );
    await queryRunner.query(
      `CREATE TABLE "compliance_check_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" character varying(191) NOT NULL, "normalized_address" character varying(191) NOT NULL, "network" character varying(64) NOT NULL, "source" "public"."compliance_check_records_source_enum" NOT NULL, "decision" "public"."compliance_check_records_decision_enum" NOT NULL, "provider_status" "public"."compliance_check_records_provider_status_enum" NOT NULL DEFAULT 'not_requested', "final_risk_score" double precision, "provider_risk_score" double precision, "stolen_coins_score" double precision, "high_risk_by_provider_score" boolean NOT NULL DEFAULT false, "high_risk_by_stolen_coins" boolean NOT NULL DEFAULT false, "checked_at" TIMESTAMP WITH TIME ZONE NOT NULL, "provider_response_id" uuid, "cached_from_check_id" uuid, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4dff5073e80702633ebd042037c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_check_records_source_checked_at" ON "compliance_check_records" ("source", "checked_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_check_records_cache_lookup" ON "compliance_check_records" ("normalized_address", "network", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_check_records_history_lookup" ON "compliance_check_records" ("normalized_address", "network", "checked_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "compliance_check_signals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "check_id" uuid NOT NULL, "category" character varying(64) NOT NULL, "score" double precision NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ca4af50722ea274d02b7600b343" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_check_signals_category_score" ON "compliance_check_signals" ("category", "score") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_check_signals_category" ON "compliance_check_signals" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_check_signals_check_id" ON "compliance_check_signals" ("check_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "compliance_policy_mutation_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" character varying(191) NOT NULL, "network" character varying(64) NOT NULL, "policy" character varying(16) NOT NULL, "action" character varying(16) NOT NULL, "changed" boolean NOT NULL, "idempotency_key" character varying(128) NOT NULL, "requested_by" character varying(64), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_fbd0f1343582142a02eeaadf5d6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_compliance_policy_mutation_history_idempotency_key" ON "compliance_policy_mutation_history" ("idempotency_key") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_compliance_policy_mutation_history_policy" ON "compliance_policy_mutation_history" ("policy", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_compliance_policy_mutation_history_created_at" ON "compliance_policy_mutation_history" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."compliance_provider_responses_status_enum" AS ENUM('ready', 'in_progress', 'not_requested')`,
    );
    await queryRunner.query(
      `CREATE TABLE "compliance_provider_responses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "address" character varying(191) NOT NULL, "normalized_address" character varying(191) NOT NULL, "network" character varying(64) NOT NULL, "status" "public"."compliance_provider_responses_status_enum" NOT NULL DEFAULT 'in_progress', "risk_score" double precision, "signals" jsonb, "checked_at" TIMESTAMP WITH TIME ZONE, "payload" jsonb NOT NULL, "received_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e1ada364919bf475bfabf7e245a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_provider_responses_checked_at" ON "compliance_provider_responses" ("checked_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_provider_responses_address_network_received_at" ON "compliance_provider_responses" ("normalized_address", "network", "received_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_check_records" ADD CONSTRAINT "FK_c4dff4304b40fed6384f21ced6d" FOREIGN KEY ("provider_response_id") REFERENCES "compliance_provider_responses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_check_records" ADD CONSTRAINT "FK_9302086addb3770dc46fb8e5482" FOREIGN KEY ("cached_from_check_id") REFERENCES "compliance_check_records"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_check_signals" ADD CONSTRAINT "FK_cc7ca2ca82acefec8fd3f7cd2a0" FOREIGN KEY ("check_id") REFERENCES "compliance_check_records"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "compliance_check_signals" DROP CONSTRAINT "FK_cc7ca2ca82acefec8fd3f7cd2a0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_check_records" DROP CONSTRAINT "FK_9302086addb3770dc46fb8e5482"`,
    );
    await queryRunner.query(
      `ALTER TABLE "compliance_check_records" DROP CONSTRAINT "FK_c4dff4304b40fed6384f21ced6d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_provider_responses_address_network_received_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_provider_responses_checked_at"`,
    );
    await queryRunner.query(`DROP TABLE "compliance_provider_responses"`);
    await queryRunner.query(
      `DROP TYPE "public"."compliance_provider_responses_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_compliance_policy_mutation_history_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_compliance_policy_mutation_history_policy"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_compliance_policy_mutation_history_idempotency_key"`,
    );
    await queryRunner.query(`DROP TABLE "compliance_policy_mutation_history"`);
    await queryRunner.query(`DROP INDEX "public"."idx_check_signals_check_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_check_signals_category"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_check_signals_category_score"`,
    );
    await queryRunner.query(`DROP TABLE "compliance_check_signals"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_check_records_history_lookup"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_check_records_cache_lookup"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_check_records_source_checked_at"`,
    );
    await queryRunner.query(`DROP TABLE "compliance_check_records"`);
    await queryRunner.query(
      `DROP TYPE "public"."compliance_check_records_provider_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."compliance_check_records_decision_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."compliance_check_records_source_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_compliance_check_history_lookup"`,
    );
    await queryRunner.query(`DROP TABLE "compliance_check_history"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_compliance_address_policies_lookup"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_compliance_address_policies_list"`,
    );
    await queryRunner.query(`DROP TABLE "compliance_address_policies"`);
  }
}
