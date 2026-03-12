import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderResponsePayloadToComplianceCheckHistory1773326400000 implements MigrationInterface {
  name = 'AddProviderResponsePayloadToComplianceCheckHistory1773326400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "compliance_check_history" ADD COLUMN "provider_response_payload" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "compliance_check_history" DROP COLUMN "provider_response_payload"`,
    );
  }
}
