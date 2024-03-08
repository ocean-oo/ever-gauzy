import {
	Index,
	RelationId,
	JoinColumn,
	JoinTable
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsNotEmpty,
	IsString,
	IsNumber,
	IsOptional,
	IsDate,
	IsEnum,
	IsBoolean,
	IsUUID
} from 'class-validator';
import {
	IExpense,
	CurrenciesEnum,
	IOrganizationVendor,
	IExpenseCategory,
	ITag,
	IEmployee,
	IOrganizationProject,
	IOrganizationContact,
	ExpenseStatusesEnum
} from '@gauzy/contracts';
import {
	Employee,
	ExpenseCategory,
	InvoiceItem,
	OrganizationContact,
	OrganizationProject,
	OrganizationVendor,
	Tag,
	TenantOrganizationBaseEntity
} from '../core/entities/internal';
import { ColumnNumericTransformerPipe } from './../shared/pipes';
import { MultiORMColumn, MultiORMEntity } from './../core/decorators/entity';
import { MikroOrmExpenseRepository } from './repository/mikro-orm-expense.repository';
import { MultiORMManyToMany, MultiORMManyToOne, MultiORMOneToMany } from '../core/decorators/entity/relations';

@MultiORMEntity('expense', { mikroOrmRepository: () => MikroOrmExpenseRepository })
export class Expense extends TenantOrganizationBaseEntity implements IExpense {

	@ApiProperty({ type: () => Number })
	@IsNumber()
	@IsNotEmpty()
	@Index()
	@MultiORMColumn({
		type: 'numeric',
		transformer: new ColumnNumericTransformerPipe()
	})
	amount: number;

	@ApiPropertyOptional({ type: () => String })
	@IsString()
	@IsOptional()
	@Index()
	@MultiORMColumn({ nullable: true })
	typeOfExpense: string;

	@ApiPropertyOptional({ type: () => String })
	@Index()
	@IsOptional()
	@MultiORMColumn({ nullable: true })
	notes?: string;

	@ApiProperty({ type: () => String, enum: CurrenciesEnum })
	@IsEnum(CurrenciesEnum)
	@IsNotEmpty()
	@Index()
	@MultiORMColumn()
	currency: string;

	@ApiPropertyOptional({ type: () => Date })
	@IsDate()
	@IsOptional()
	@MultiORMColumn({ nullable: true })
	valueDate?: Date;

	@ApiPropertyOptional({ type: () => String })
	@Index()
	@IsOptional()
	@MultiORMColumn({ nullable: true })
	purpose?: string;

	@ApiPropertyOptional({ type: () => String })
	@Index()
	@IsOptional()
	@MultiORMColumn({ nullable: true })
	taxType?: string;

	@ApiPropertyOptional({ type: () => String })
	@Index()
	@IsOptional()
	@MultiORMColumn({ nullable: true })
	taxLabel?: string;

	@ApiProperty({ type: () => Number })
	@IsNumber()
	@Index()
	@IsOptional()
	@MultiORMColumn({
		nullable: true,
		type: 'numeric',
		transformer: new ColumnNumericTransformerPipe()
	})
	rateValue: number;

	@ApiPropertyOptional({ type: () => String })
	@Index()
	@IsOptional()
	@MultiORMColumn({ nullable: true })
	receipt?: string;

	@ApiProperty({ type: () => Boolean })
	@IsBoolean()
	@IsOptional()
	@MultiORMColumn({ nullable: true })
	splitExpense: boolean;

	@ApiPropertyOptional({ type: () => String, maxLength: 256 })
	@IsOptional()
	@MultiORMColumn({ nullable: true })
	reference?: string;

	@ApiPropertyOptional({ type: () => String, enum: ExpenseStatusesEnum })
	@MultiORMColumn({
		type: 'simple-enum',
		nullable: true,
		enum: ExpenseStatusesEnum
	})
	status?: ExpenseStatusesEnum;
	/*
	|--------------------------------------------------------------------------
	| @ManyToOne
	|--------------------------------------------------------------------------
	*/

	/**
	 * Employee
	 */
	@ApiProperty({ type: () => Employee })
	@MultiORMManyToOne(() => Employee, (employee) => employee.expenses, {
		nullable: true,
		onDelete: 'CASCADE'
	})
	@JoinColumn()
	employee?: IEmployee;

	@ApiProperty({ type: () => String, readOnly: true })
	@RelationId((it: Expense) => it.employee)
	@IsString()
	@IsOptional()
	@Index()
	@MultiORMColumn({ nullable: true, relationId: true })
	employeeId?: string;

	/**
	 * OrganizationVendor
	 */
	@ApiProperty({ type: () => OrganizationVendor })
	@MultiORMManyToOne(() => OrganizationVendor, (vendor) => vendor.expenses, {
		onDelete: 'SET NULL'
	})
	@JoinColumn()
	vendor: IOrganizationVendor;

	@ApiProperty({ type: () => String, readOnly: true })
	@RelationId((it: Expense) => it.vendor)
	@IsString()
	@Index()
	@MultiORMColumn({ nullable: true, relationId: true })
	vendorId: string;

	/**
	 * ExpenseCategory
	 */
	@ApiProperty({ type: () => ExpenseCategory })
	@MultiORMManyToOne(() => ExpenseCategory, (category) => category.expenses, {
		onDelete: 'SET NULL'
	})
	@JoinColumn()
	category: IExpenseCategory;

	@ApiProperty({ type: () => String, readOnly: true })
	@RelationId((it: Expense) => it.category)
	@IsString()
	@Index()
	@MultiORMColumn({ nullable: true, relationId: true })
	categoryId: string;

	/**
	 * Organization Project Relationship
	 */
	@ApiProperty({ type: () => OrganizationProject })
	@MultiORMManyToOne(() => OrganizationProject, (project) => project.expenses, {
		/** Indicates if the relation column value can be nullable or not. */
		nullable: true,

		/** Defines the database cascade action on delete. */
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	project?: IOrganizationProject;

	/**
	 * Organization Project ID
	 */
	@ApiPropertyOptional({ type: () => String })
	@IsOptional()
	@IsUUID()
	@RelationId((it: Expense) => it.project)
	@Index()
	@MultiORMColumn({ nullable: true, relationId: true })
	projectId?: string;

	/**
	 * OrganizationContact
	 */
	@ApiProperty({ type: () => OrganizationContact })
	@MultiORMManyToOne(() => OrganizationContact, (contact) => contact.expenses, {
		nullable: true,
		onDelete: 'CASCADE'
	})
	@JoinColumn()
	organizationContact?: IOrganizationContact;

	@ApiPropertyOptional({ type: () => String })
	@RelationId((it: Expense) => it.organizationContact)
	@IsString()
	@IsOptional()
	@Index()
	@MultiORMColumn({ nullable: true, relationId: true })
	organizationContactId?: string;

	/*
	|--------------------------------------------------------------------------
	| @ManyToOne
	|--------------------------------------------------------------------------
	*/

	/**
	 * InvoiceItem
	 */
	@ApiPropertyOptional({ type: () => InvoiceItem, isArray: true })
	@MultiORMOneToMany(() => InvoiceItem, (invoiceItem) => invoiceItem.expense, {
		onDelete: 'SET NULL'
	})
	@JoinColumn()
	invoiceItems?: InvoiceItem[];

	/*
	|--------------------------------------------------------------------------
	| @ManyToMany
	|--------------------------------------------------------------------------
	*/

	/**
	 * Tag
	 */
	@ApiProperty({ type: () => Tag, isArray: true })
	@MultiORMManyToMany(() => Tag, (tag) => tag.expenses, {
		onUpdate: 'CASCADE',
		onDelete: 'CASCADE',
		owner: true,
		pivotTable: 'tag_expense',
	})
	@JoinTable({
		name: 'tag_expense'
	})
	tags?: ITag[];
}
