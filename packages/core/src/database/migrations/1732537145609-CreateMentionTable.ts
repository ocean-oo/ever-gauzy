import { Logger } from '@nestjs/common';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { yellow } from 'chalk';
import { DatabaseTypeEnum } from '@gauzy/config';

export class CreateMentionTable1732537145609 implements MigrationInterface {
	name = 'CreateMentionTable1732537145609';

	/**
	 * Up Migration
	 *
	 * @param queryRunner
	 */
	public async up(queryRunner: QueryRunner): Promise<void> {
		Logger.debug(yellow(this.name + ' start running!'), 'Migration');

		switch (queryRunner.connection.options.type) {
			case DatabaseTypeEnum.sqlite:
			case DatabaseTypeEnum.betterSqlite3:
				await this.sqliteUpQueryRunner(queryRunner);
				break;
			case DatabaseTypeEnum.postgres:
				await this.postgresUpQueryRunner(queryRunner);
				break;
			case DatabaseTypeEnum.mysql:
				await this.mysqlUpQueryRunner(queryRunner);
				break;
			default:
				throw Error(`Unsupported database: ${queryRunner.connection.options.type}`);
		}
	}

	/**
	 * Down Migration
	 *
	 * @param queryRunner
	 */
	public async down(queryRunner: QueryRunner): Promise<void> {
		switch (queryRunner.connection.options.type) {
			case DatabaseTypeEnum.sqlite:
			case DatabaseTypeEnum.betterSqlite3:
				await this.sqliteDownQueryRunner(queryRunner);
				break;
			case DatabaseTypeEnum.postgres:
				await this.postgresDownQueryRunner(queryRunner);
				break;
			case DatabaseTypeEnum.mysql:
				await this.mysqlDownQueryRunner(queryRunner);
				break;
			default:
				throw Error(`Unsupported database: ${queryRunner.connection.options.type}`);
		}
	}

	/**
	 * PostgresDB Up Migration
	 *
	 * @param queryRunner
	 */
	public async postgresUpQueryRunner(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(
			`CREATE TABLE "mention" ("deletedAt" TIMESTAMP, "id" uuid NOT NULL DEFAULT gen_random_uuid(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "isActive" boolean DEFAULT true, "isArchived" boolean DEFAULT false, "archivedAt" TIMESTAMP, "tenantId" uuid, "organizationId" uuid, "entityId" character varying NOT NULL, "entity" character varying NOT NULL, "mentionedUserId" uuid NOT NULL, "mentionById" uuid NOT NULL, CONSTRAINT "PK_9b02b76c4b65e3c35c1a545bf57" PRIMARY KEY ("id"))`
		);
		await queryRunner.query(`CREATE INDEX "IDX_2c71b2f53b9162a94e1f02e40b" ON "mention" ("isActive") `);
		await queryRunner.query(`CREATE INDEX "IDX_9597d3f3afbf40e6ffd1b0ebc9" ON "mention" ("isArchived") `);
		await queryRunner.query(`CREATE INDEX "IDX_580d84e23219b07f520131f927" ON "mention" ("tenantId") `);
		await queryRunner.query(`CREATE INDEX "IDX_4f018d32b6d2e2c907833d0db1" ON "mention" ("organizationId") `);
		await queryRunner.query(`CREATE INDEX "IDX_d01675da9ddf57bef5692fca8b" ON "mention" ("entityId") `);
		await queryRunner.query(`CREATE INDEX "IDX_3d6a8e3430779c21f04513cc5a" ON "mention" ("entity") `);
		await queryRunner.query(`CREATE INDEX "IDX_16a2deee0d7ea361950eed1b94" ON "mention" ("mentionedUserId") `);
		await queryRunner.query(`CREATE INDEX "IDX_34b0087a30379c86b470a4298c" ON "mention" ("mentionById") `);
		await queryRunner.query(
			`ALTER TABLE "mention" ADD CONSTRAINT "FK_580d84e23219b07f520131f9271" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "mention" ADD CONSTRAINT "FK_4f018d32b6d2e2c907833d0db11" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE`
		);
		await queryRunner.query(
			`ALTER TABLE "mention" ADD CONSTRAINT "FK_16a2deee0d7ea361950eed1b944" FOREIGN KEY ("mentionedUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
		);
		await queryRunner.query(
			`ALTER TABLE "mention" ADD CONSTRAINT "FK_34b0087a30379c86b470a4298ca" FOREIGN KEY ("mentionById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
		);
	}

	/**
	 * PostgresDB Down Migration
	 *
	 * @param queryRunner
	 */
	public async postgresDownQueryRunner(queryRunner: QueryRunner): Promise<any> {
		await queryRunner.query(`ALTER TABLE "mention" DROP CONSTRAINT "FK_34b0087a30379c86b470a4298ca"`);
		await queryRunner.query(`ALTER TABLE "mention" DROP CONSTRAINT "FK_16a2deee0d7ea361950eed1b944"`);
		await queryRunner.query(`ALTER TABLE "mention" DROP CONSTRAINT "FK_4f018d32b6d2e2c907833d0db11"`);
		await queryRunner.query(`ALTER TABLE "mention" DROP CONSTRAINT "FK_580d84e23219b07f520131f9271"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_34b0087a30379c86b470a4298c"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_16a2deee0d7ea361950eed1b94"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_3d6a8e3430779c21f04513cc5a"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_d01675da9ddf57bef5692fca8b"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_4f018d32b6d2e2c907833d0db1"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_580d84e23219b07f520131f927"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_9597d3f3afbf40e6ffd1b0ebc9"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_2c71b2f53b9162a94e1f02e40b"`);
		await queryRunner.query(`DROP TABLE "mention"`);
	}

	/**
	 * SqliteDB and BetterSQlite3DB Up Migration
	 *
	 * @param queryRunner
	 */
	public async sqliteUpQueryRunner(queryRunner: QueryRunner): Promise<any> {}

	/**
	 * SqliteDB and BetterSQlite3DB Down Migration
	 *
	 * @param queryRunner
	 */
	public async sqliteDownQueryRunner(queryRunner: QueryRunner): Promise<any> {}

	/**
	 * MySQL Up Migration
	 *
	 * @param queryRunner
	 */
	public async mysqlUpQueryRunner(queryRunner: QueryRunner): Promise<any> {}

	/**
	 * MySQL Down Migration
	 *
	 * @param queryRunner
	 */
	public async mysqlDownQueryRunner(queryRunner: QueryRunner): Promise<any> {}
}
