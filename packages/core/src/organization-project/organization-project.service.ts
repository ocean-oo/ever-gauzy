import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { ILike, In, IsNull, SelectQueryBuilder } from 'typeorm';
import {
	ActionTypeEnum,
	ActivityLogEntityEnum,
	ActorTypeEnum,
	FavoriteEntityEnum,
	ID,
	IEmployee,
	IOrganizationGithubRepository,
	IOrganizationProject,
	IOrganizationProjectCreateInput,
	IOrganizationProjectEditByEmployeeInput,
	IOrganizationProjectsFindInput,
	IOrganizationProjectUpdateInput,
	IPagination,
	RolesEnum
} from '@gauzy/contracts';
import { getConfig } from '@gauzy/config';
import { CustomEmbeddedFieldConfig, isNotEmpty } from '@gauzy/common';
import { PaginationParams, TenantAwareCrudService } from '../core/crud';
import { RequestContext } from '../core/context';
import { OrganizationProjectEmployee } from '../core/entities/internal';
import { FavoriteService } from '../core/decorators';
import { ActivityLogEvent } from '../activity-log/events';
import { generateActivityLogDescription } from '../activity-log/activity-log.helper';
import { RoleService } from '../role/role.service';
import { OrganizationProject } from './organization-project.entity';
import { prepareSQLQuery as p } from './../database/database.helper';
import { EmployeeService } from '../employee/employee.service';
import { TypeOrmEmployeeRepository } from '../employee/repository';
import {
	MikroOrmOrganizationProjectEmployeeRepository,
	MikroOrmOrganizationProjectRepository,
	TypeOrmOrganizationProjectEmployeeRepository,
	TypeOrmOrganizationProjectRepository
} from './repository';

@FavoriteService(FavoriteEntityEnum.OrganizationProject)
@Injectable()
export class OrganizationProjectService extends TenantAwareCrudService<OrganizationProject> {
	constructor(
		readonly typeOrmOrganizationProjectRepository: TypeOrmOrganizationProjectRepository,
		readonly mikroOrmOrganizationProjectRepository: MikroOrmOrganizationProjectRepository,
		readonly typeOrmOrganizationProjectEmployeeRepository: TypeOrmOrganizationProjectEmployeeRepository,
		readonly mikroOrmOrganizationProjectEmployeeRepository: MikroOrmOrganizationProjectEmployeeRepository,
		readonly typeOrmEmployeeRepository: TypeOrmEmployeeRepository,
		private readonly _roleService: RoleService,
		private readonly _employeeService: EmployeeService,
		private readonly _eventBus: EventBus
	) {
		super(typeOrmOrganizationProjectRepository, mikroOrmOrganizationProjectRepository);
	}

	/**
	 * Creates an organization project based on the provided input.
	 * @param input - Input data for creating the organization project.
	 * @returns A Promise resolving to the created organization project.
	 * @throws BadRequestException if there is an error in the creation process.
	 */
	async create(input: IOrganizationProjectCreateInput): Promise<IOrganizationProject> {
		const tenantId = RequestContext.currentTenantId() || input.tenantId;
		const employeeId = RequestContext.currentEmployeeId();
		const currentRoleId = RequestContext.currentRoleId();

		const { tags = [], memberIds = [], managerIds = [], ...entity } = input;
		const { organizationId } = entity;

		try {
			// If the employee creates the project, default add as a manager
			try {
				// Check if the current role is EMPLOYEE
				await this._roleService.findOneByIdString(currentRoleId, {
					where: { name: RolesEnum.EMPLOYEE }
				});

				// Add the current employee to the managerIds if they have the EMPLOYEE role and are not already included
				if (!managerIds.includes(employeeId)) {
					// If not included, add the employeeId to the managerIds array
					managerIds.push(employeeId);
				}
			} catch (error) {}

			// Combine memberIds and managerIds into a single array
			const employeeIds = [...memberIds, ...managerIds].filter(Boolean);

			// Retrieves a collection of employees based on specified criteria.
			const employees = await this._employeeService.findActiveEmployeesByEmployeeIds(
				employeeIds,
				organizationId,
				tenantId
			);

			// Find the manager role
			const managerRole = await this._roleService.findOneByWhereOptions({
				name: RolesEnum.MANAGER
			});

			// Create a Set for faster membership checks
			const managerIdsSet = new Set(managerIds);

			// Fetch existing managers for this organization project
			const existingManagers = await this.typeOrmOrganizationProjectEmployeeRepository.findBy({
				employee: { id: In(managerIds), organizationId, tenantId },
				organizationId,
				tenantId
			});

			// Create a Map for faster lookups
			const existingManagersMap = new Map(existingManagers.map((em) => [em.employee.id, em.assignedAt]));

			// Use destructuring to directly extract 'id' from 'employee'
			const projectMembers = employees.map(({ id: employeeId }) => {
				// Check if the employee is a manager
				const isManager = managerIdsSet.has(employeeId);
				// If the employee is a manager, assign the existing manager with the latest assignedAt date
				const assignedAt =
					isManager && !existingManagersMap.has(employeeId)
						? new Date()
						: existingManagersMap.get(employeeId);

				// If the employee is a manager, assign the existing manager with the latest assignedAt date
				return new OrganizationProjectEmployee({
					employeeId,
					organizationId,
					tenantId,
					isManager,
					role: isManager ? managerRole : null,
					assignedAt: assignedAt || null
				});
			});

			// Create the organization team with the prepared members
			const project = await super.create({
				...entity,
				members: projectMembers,
				tags,
				organizationId,
				tenantId
			});

			// Generate the activity log description
			const description = generateActivityLogDescription(
				ActionTypeEnum.Created,
				ActivityLogEntityEnum.OrganizationProject,
				project.name
			);

			// Emit an event to log the activity
			this._eventBus.publish(
				new ActivityLogEvent({
					entity: ActivityLogEntityEnum.OrganizationProject,
					entityId: project.id,
					action: ActionTypeEnum.Created,
					actorType: ActorTypeEnum.User,
					description,
					data: project,
					organizationId,
					tenantId
				})
			);

			return project;
		} catch (error) {
			// Handle errors and return an appropriate error response
			throw new HttpException(`Failed to create organization project: ${error.message}`, HttpStatus.BAD_REQUEST);
		}
	}

	/**
	 * Update an organization project.
	 *
	 * @param id - The ID of the organization project to be updated.
	 * @param input - The updated information for the organization project.
	 * @returns A Promise resolving to the updated organization project.
	 * @throws ForbiddenException if the user lacks permission or if certain conditions are not met.
	 * @throws BadRequestException if there's an error during the update process.
	 */
	async update(id: ID, input: IOrganizationProjectUpdateInput): Promise<IOrganizationProject> {
		const tenantId = RequestContext.currentTenantId() || input.tenantId;
		const { memberIds = [], managerIds = [], organizationId } = input;

		let organizationProject = await super.findOneByIdString(id, {
			where: { organizationId, tenantId }
		});

		try {
			// Retrieve members and managers IDs
			if (isNotEmpty(memberIds) || isNotEmpty(managerIds)) {
				// Combine memberIds and managerIds into a single array
				const employeeIds = [...memberIds, ...managerIds].filter(Boolean);

				// Retrieves a collection of employees based on specified criteria.
				const projectMembers = await this._employeeService.findActiveEmployeesByEmployeeIds(
					employeeIds,
					organizationId,
					tenantId
				);

				// Update nested entity (Organization Project Members)
				await this.updateOrganizationProjectMembers(id, organizationId, projectMembers, managerIds, memberIds);
			}

			const { id: organizationProjectId } = organizationProject;

			// Update the organization project with the prepared members
			return await super.create({
				...input,
				organizationId,
				tenantId,
				id: organizationProjectId
			});
		} catch (error) {
			// Handle errors and return an appropriate error response
			throw new HttpException(`Failed to update organization project: ${error.message}`, HttpStatus.BAD_REQUEST);
		}
	}

	/**
	 * Delete project members by IDs.
	 *
	 * @param memberIds - Array of member IDs to delete
	 * @returns A promise that resolves when all deletions are complete
	 */
	async deleteMemberByIds(memberIds: ID[]): Promise<void> {
		// Map member IDs to deletion promises
		const deletePromises = memberIds.map((memberId: ID) =>
			this.typeOrmOrganizationProjectEmployeeRepository.delete(memberId)
		);

		// Wait for all deletions to complete
		await Promise.all(deletePromises);
	}

	/**
	 * Updates an organization project by managing its members and their roles.
	 *
	 * @param organizationProjectId - ID of the organization project
	 * @param organizationId - ID of the organization
	 * @param employees - Array of employees to be assigned to the project
	 * @param managerIds - Array of employee IDs to be assigned as managers
	 * @param memberIds - Array of employee IDs to be assigned as members
	 * @returns Promise<void>
	 */
	async updateOrganizationProjectMembers(
		organizationProjectId: ID,
		organizationId: ID,
		employees: IEmployee[],
		managerIds: ID[],
		memberIds: ID[]
	): Promise<void> {
		const tenantId = RequestContext.currentTenantId();
		const membersToUpdate = new Set([...managerIds, ...memberIds].filter(Boolean));

		// Find the manager role
		const managerRole = await this._roleService.findOneByWhereOptions({
			name: RolesEnum.MANAGER
		});

		// Fetch existing project members with their roles
		const projectMembers = await this.typeOrmOrganizationProjectEmployeeRepository.find({
			where: { tenantId, organizationId, organizationProjectId }
		});

		// Create a map of existing members for quick lookup
		const existingMemberMap = new Map(projectMembers.map((member) => [member.employeeId, member]));

		// Separate members into removed, updated, and new members
		const removedMembers = projectMembers.filter((member) => !membersToUpdate.has(member.employeeId));
		const updatedMembers = projectMembers.filter((member) => membersToUpdate.has(member.employeeId));
		const newMembers = employees.filter((employee) => !existingMemberMap.has(employee.id));

		// 1. Remove members who are no longer assigned to the project
		if (removedMembers.length) {
			await this.deleteMemberByIds(removedMembers.map((member) => member.id));
		}

		// 2. Update roles for existing members where necessary
		await Promise.all(
			updatedMembers.map(async (member) => {
				const isManager = managerIds.includes(member.employeeId);
				const newRole = isManager ? managerRole : null;

				// Only update if the role has changed
				if (newRole && newRole.id !== member.roleId) {
					await this.typeOrmOrganizationProjectEmployeeRepository.update(member.id, { role: newRole });
				}
			})
		);

		// 3. Add new members to the project
		if (newMembers.length) {
			const newProjectMembers = newMembers.map(
				(employee) =>
					new OrganizationProjectEmployee({
						organizationProjectId,
						employeeId: employee.id,
						tenantId,
						organizationId,
						isManager: managerIds.includes(employee.id),
						roleId: managerIds.includes(employee.id) ? managerRole.id : null
					})
			);

			await this.typeOrmRepository.save(newProjectMembers);
		}
	}

	/**
	 * Finds projects assigned to a specific employee based on the provided options.
	 *
	 * @param employeeId - The ID of the employee to find projects for.
	 * @param input - Filter options for finding organization projects.
	 * @returns A promise that resolves with a list of projects assigned to the employee.
	 */
	async findByEmployee(employeeId: ID, input: IOrganizationProjectsFindInput): Promise<IOrganizationProject[]> {
		const tenantId = RequestContext.currentTenantId() || input.tenantId; // Use the current tenant ID or fallback to input tenantId
		const { organizationId, organizationContactId, organizationTeamId } = input;

		// Create a query to fetch organization projects
		const query = this.typeOrmRepository.createQueryBuilder(this.tableName);
		query.setFindOptions({
			select: {
				id: true,
				name: true,
				imageUrl: true,
				currency: true,
				billing: true,
				public: true,
				owner: true,
				taskListType: true
			}
		});
		query.innerJoin(`${query.alias}.members`, 'project_members').leftJoin(`${query.alias}.teams`, 'project_team');
		query
			.where(`project_members.employeeId = :employeeId`, { employeeId })
			.andWhere(`"${query.alias}"."tenantId" = :tenantId`, { tenantId })
			.andWhere(`"${query.alias}"."organizationId" = :organizationId`, { organizationId });

		// Apply additional filters if organizationContactId is provided
		if (isNotEmpty(organizationContactId)) {
			query.andWhere(`${query.alias}.organizationContactId = :organizationContactId`, { organizationContactId });
		}

		// Apply additional filters if organizationTeamId is provided
		if (isNotEmpty(organizationTeamId)) {
			query.andWhere(`project_team.id = :organizationTeamId`, { organizationTeamId });
		}

		// Get the results
		return query.getMany();
	}

	/**
	 * Overrides the organization project find all method to handle special cases.
	 *
	 * @param options - Pagination parameters with optional filters.
	 * @returns A promise that resolves with the paginated result of organization projects.
	 */
	public async findAll(options?: PaginationParams<OrganizationProject>): Promise<IPagination<OrganizationProject>> {
		// Check and handle the case where `organizationContactId` is explicitly set to 'null'
		if (options?.where?.organizationContactId === 'null') {
			options.where.organizationContactId = IsNull();
		}

		// Call the parent class's findAll method with the modified options
		return super.findAll(options);
	}

	/**
	 * Overrides the organization project pagination method to handle filtering by tags.
	 *
	 * @param options - Pagination parameters with optional filters.
	 * @returns A promise that resolves with the paginated result of organization projects.
	 */
	public async pagination(
		options?: PaginationParams<OrganizationProject>
	): Promise<IPagination<OrganizationProject>> {
		// Check if there is a `where` clause and handle the `tags` filter
		if (options?.where?.tags) {
			options.where.tags = {
				id: In(options.where.tags as string[])
			};
		}

		if (options?.where?.name) {
			options.where.name = ILike(`%${options.where.name}%`);
		}

		// Call the parent class's paginate method with the modified options
		return super.paginate(options);
	}

	/**
	 * Get organization projects associated with a specific repository.
	 *
	 * @param repositoryId - The ID of the repository.
	 * @param options - An object containing organization, tenant, and integration information.
	 * @returns A Promise that resolves to an array of organization projects.
	 */
	public async getProjectsByGithubRepository(
		repositoryId: IOrganizationGithubRepository['repositoryId'],
		options: { organizationId: ID; tenantId: ID; integrationId: ID; projectId?: ID }
	): Promise<IOrganizationProject[]> {
		try {
			const tenantId = RequestContext.currentTenantId() || options.tenantId;
			const { organizationId, projectId, integrationId } = options;

			// Attempt to retrieve the organization projects by the provided parameters.
			const projects = await this.typeOrmRepository.find({
				where: {
					...(projectId ? { id: projectId } : {}),
					organizationId,
					tenantId,
					customFields: {
						repository: {
							repositoryId,
							integrationId,
							organizationId,
							tenantId,
							isActive: true,
							isArchived: false,
							hasSyncEnabled: true
						}
					},
					isActive: true,
					isArchived: false
				}
			});

			// Return the projects
			return projects;
		} catch (error) {
			return [];
		}
	}

	/**
	 * Adds custom joins and selects based on the presence of custom fields.
	 *
	 * @param query - The TypeORM query builder instance.
	 * @param customFields - The array of custom fields.
	 * @returns The modified query builder instance.
	 */
	addCustomFieldJoins<T>(
		query: SelectQueryBuilder<T>,
		customFields: CustomEmbeddedFieldConfig[]
	): SelectQueryBuilder<T> {
		const hasRepositoryField = customFields.some((field: CustomEmbeddedFieldConfig) => field.name === 'repository');

		if (hasRepositoryField) {
			// Join with the `Repository` entity and left join with `Issue` entity
			query.innerJoinAndSelect(`${query.alias}.customFields.repository`, 'repository');
			query.leftJoin('repository.issues', 'issue');

			// Select and count issues, and group the result by project and repository
			query.addSelect('COUNT(issue.id)', 'issueCount');
			query.groupBy(`${query.alias}.id, repository.id`);
		}

		return query;
	}

	/**
	 * Adds custom where conditions based on provided options and tenant ID.
	 *
	 * @param query - The TypeORM query builder instance.
	 * @param tenantId - The tenant ID to be used in the where conditions.
	 * @param options - Additional options containing where conditions.
	 * @returns The modified query builder instance.
	 */
	addWhereConditions<T>(
		query: SelectQueryBuilder<T>,
		options?: { where?: Record<string, any> }
	): SelectQueryBuilder<T> {
		const tenantId = RequestContext.currentTenantId();

		// Define where conditions for the query
		query.where((qb: SelectQueryBuilder<OrganizationProject>) => {
			qb.andWhere(p(`"${qb.alias}"."tenantId" = :tenantId`), { tenantId });

			// Conditionally add repository tenantId condition only if repository is joined
			if (query.expressionMap.joinAttributes.some((ja) => ja.alias.name === 'repository')) {
				qb.andWhere(p(`"repository"."tenantId" = :tenantId`), { tenantId });
			}

			if (options?.where) {
				for (const key of Object.keys(options.where)) {
					qb.andWhere(p(`"${qb.alias}"."${key}" = :${key}`), { [key]: options.where[key] });

					// Conditionally add where conditions for repository if it's joined
					if (query.expressionMap.joinAttributes.some((ja) => ja.alias.name === 'repository')) {
						qb.andWhere(p(`"repository"."${key}" = :${key}`), { [key]: options.where[key] });
					}
				}
			}

			qb.andWhere(p(`"${qb.alias}"."repositoryId" IS NOT NULL`));
		});

		return query;
	}

	/**
	 * Find synchronized organization projects with options and count their associated issues.
	 *
	 * @param options - Query and pagination options (optional).
	 * @returns A paginated list of synchronized organization projects with associated issue counts.
	 */
	async findSyncedProjects(
		options?: PaginationParams<OrganizationProject>
	): Promise<IPagination<OrganizationProject>> {
		// Get the list of custom fields for the specified entity, defaulting to an empty array if none are found
		const customFields = getConfig().customFields?.['OrganizationProject'] ?? [];

		// Create a query builder for the `OrganizationProject` entity
		const query = this.typeOrmRepository.createQueryBuilder(this.tableName);

		// Set find options (skip, take, and relations)
		query.skip(options && options.skip ? options.take * (options.skip - 1) : 0);
		query.take(options && options.take ? options.take : 10);

		// Conditionally add joins based on custom fields
		this.addCustomFieldJoins(query, customFields);

		// Add where conditions
		this.addWhereConditions(query, options);

		// Log the SQL query (for debugging)
		// console.log(await query.getRawMany());

		// Execute the query and return the paginated result
		const [items, total] = await query.getManyAndCount();
		return { items, total };
	}

	async updateByEmployee(input: IOrganizationProjectEditByEmployeeInput) {
		try {
			const { organizationId, addedProjectIds = [], removedProjectIds = [], member } = input;

			// Handle adding projects
			if (addedProjectIds.length > 0) {
				const projectsToAdd = await this.find({
					where: {
						id: In(addedProjectIds),
						organizationId
					},
					relations: {
						members: true
					}
				});

				const updatedProjectsToAdd = projectsToAdd.map((project) => {
					const existingMembers = project.members || [];

					// Verify if member already exists on project
					const isMemberAlreadyInProject = existingMembers.some(
						(existingMember) => existingMember.employeeId === member.employeeId
					);

					if (!isMemberAlreadyInProject) {
						return {
							...project,
							members: [...existingMembers, { ...member, organizationProjectId: project.id }]
						};
					}

					return project; // If member already assigned to project, no change needed
				});

				// save updated projects
				await Promise.all(updatedProjectsToAdd.map(async (project) => await this.save(project)));
			}

			// Handle removing projects
			if (removedProjectIds.length > 0) {
				await this.typeOrmOrganizationProjectEmployeeRepository.delete({
					organizationProjectId: In(removedProjectIds),
					employeeId: member.employeeId
				});
			}

			return true;
		} catch (error) {
			console.error('Error while updating project by member:', error);
			throw new BadRequestException(error);
		}
	}
}
