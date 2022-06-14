import { Injectable, BadRequestException, NotAcceptableException } from '@nestjs/common';
import { TimeLog } from './time-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, Brackets, WhereExpressionBuilder, DeleteResult, UpdateResult } from 'typeorm';
import { RequestContext } from '../../core/context';
import {
	IManualTimeInput,
	IGetTimeLogInput,
	PermissionsEnum,
	IGetTimeLogConflictInput,
	IDateRange,
	IGetTimeLogReportInput,
	ITimeLog,
	TimeLogType,
	IAmountOwedReport,
	IGetTimeLimitReportInput,
	ITimeLimitReport,
	IProjectBudgetLimitReport,
	OrganizationProjectBudgetTypeEnum,
	IProjectBudgetLimitReportInput,
	IClientBudgetLimitReportInput,
	OrganizationContactBudgetTypeEnum,
	IClientBudgetLimitReport,
	ReportGroupFilterEnum,
	IOrganizationProject,
	IDeleteTimeLog,
	IOrganizationContact,
	ITimeSlot
} from '@gauzy/contracts';
import { CommandBus } from '@nestjs/cqrs';
import { chain, pluck, reduce } from 'underscore';
import { ArraySum, isEmpty, isNotEmpty } from '@gauzy/common';
import { TenantAwareCrudService } from './../../core/crud';
import {
	Employee,
	Organization,
	OrganizationContact,
	OrganizationProject
} from '../../core/entities/internal';
import {
	DeleteTimeSpanCommand,
	GetTimeLogGroupByClientCommand,
	GetTimeLogGroupByDateCommand,
	GetTimeLogGroupByEmployeeCommand,
	GetTimeLogGroupByProjectCommand,
	IGetConflictTimeLogCommand,
	TimeLogCreateCommand,
	TimeLogDeleteCommand,
	TimeLogUpdateCommand
} from './commands';
import { getDateFormat, getDaysBetweenDates } from './../../core/utils';
import { moment } from './../../core/moment-extend';

@Injectable()
export class TimeLogService extends TenantAwareCrudService<TimeLog> {
	constructor(
		private readonly commandBus: CommandBus,

		@InjectRepository(TimeLog)
		private readonly timeLogRepository: Repository<TimeLog>,

		@InjectRepository(Employee)
		private readonly employeeRepository: Repository<Employee>,

		@InjectRepository(OrganizationProject)
		private readonly organizationProjectRepository: Repository<OrganizationProject>,

		@InjectRepository(OrganizationContact)
		private readonly organizationContactRepository: Repository<OrganizationContact>
	) {
		super(timeLogRepository);
	}

	async getTimeLogs(request: IGetTimeLogInput): Promise<ITimeLog[]> {
		return await this.timeLogRepository.find({
			join: {
				alias: 'timeLogs',
				innerJoin: {
					employee: 'timeLogs.employee',
					timeSlots: 'timeLogs.timeSlots'
				}
			},
			relations: [
				'project',
				'task',
				'organizationContact',
				'timeSlots',
				...(RequestContext.hasPermission(
					PermissionsEnum.CHANGE_SELECTED_EMPLOYEE
				)
					? ['employee', 'employee.organization', 'employee.user']
					: [])
			],
			order: {
				startedAt: 'ASC'
			},
			where: (qb: SelectQueryBuilder<TimeLog>) => {
				this.getFilterTimeLogQuery(qb, request);
			}
		});
	}

	async getWeeklyReport(request: IGetTimeLogReportInput) {
		const logs = await this.timeLogRepository.find({
			join: {
				alias: 'timeLogs',
				innerJoin: {
					employee: 'timeLogs.employee',
					timeSlots: 'timeLogs.timeSlots'
				}
			},
			relations: [
				'timeSlots',
				...(
					RequestContext.hasPermission(
						PermissionsEnum.CHANGE_SELECTED_EMPLOYEE
					)
					? ['employee', 'employee.user']
					: []
				)
			],
			order: {
				startedAt: 'ASC'
			},
			where: (qb: SelectQueryBuilder<TimeLog>) => {
				this.getFilterTimeLogQuery(qb, request);
			}
		});

		const { startDate, endDate } = request;
		const days: Array<string> = getDaysBetweenDates(startDate, endDate);

		const weeklyLogs = chain(logs)
			.groupBy('employeeId')
			.map((logs: ITimeLog[]) => {
				/**
				* calculate avarage weekly duration of the employee.
				*/
				const weeklyDuration = reduce(pluck(logs, 'duration'), ArraySum, 0);
				/**
				* calculate average weekly activity of the employee.
				*/
				const slots: ITimeSlot[] = chain(logs).pluck('timeSlots').flatten(true).value();
				const weeklyActivity = (
					(reduce(pluck(slots, 'overall'), ArraySum, 0) * 100) / 
					(reduce(pluck(slots, 'duration'), ArraySum, 0))
				);
				
				const byDate = chain(logs)
					.groupBy((log: ITimeLog) =>
						moment(log.startedAt).format('YYYY-MM-DD')
					)
					.mapObject((logs: ITimeLog[]) => {
						const sum = logs.reduce((iteratee: any, log: ITimeLog) => {
							return iteratee + log.duration;
						}, 0);
						return { sum, logs: logs };
					})
					.value();

				const employee = logs.length > 0 ? logs[0].employee : null;
				const dates: any = {};
				days.forEach((date) => {
					dates[date] = byDate[date] || 0;
				});
				return {
					employee,
					dates,
					sum: weeklyDuration || null,
					activity: parseFloat(
						parseFloat(weeklyActivity + '').toFixed(2)
					)
				};
			})
			.value();

		return weeklyLogs;
	}

	async getDailyReportChartData(request: IGetTimeLogReportInput) {
		const logs = await this.timeLogRepository.find({
			join: {
				alias: 'timeLogs',
				innerJoin: {
					employee: 'timeLogs.employee',
					timeSlots: 'timeLogs.timeSlots'
				}
			},
			order: {
				startedAt: 'ASC'
			},
			where: (qb: SelectQueryBuilder<TimeLog>) => {
				this.getFilterTimeLogQuery(qb, request);
			}
		});
	
		const { startDate, endDate } = request;
		const days: Array<string> = getDaysBetweenDates(startDate, endDate);

		const byDate = chain(logs)
			.groupBy((log) => moment(log.startedAt).format('YYYY-MM-DD'))
			.mapObject((logs: ITimeLog[], date) => {
				const tracked = logs
					.filter((log) => log.logType === TimeLogType.TRACKED)
					.reduce((iteratee: any, log: any) => {
						return iteratee + log.duration;
					}, 0);
				const manual = logs
					.filter((log) => log.logType === TimeLogType.MANUAL)
					.reduce((iteratee: any, log: any) => {
						return iteratee + log.duration;
					}, 0);
				const ideal = logs
					.filter((log) => log.logType === TimeLogType.IDEAL)
					.reduce((iteratee: any, log: any) => {
						return iteratee + log.duration;
					}, 0);
				const resumed = logs
					.filter((log) => log.logType === TimeLogType.RESUMED)
					.reduce((iteratee: any, log: any) => {
						return iteratee + log.duration;
					}, 0);
				return {
					date,
					value: {
						[TimeLogType.TRACKED]: parseFloat(
							(tracked / 3600).toFixed(1)
						),
						[TimeLogType.MANUAL]: parseFloat(
							(manual / 3600).toFixed(1)
						),
						[TimeLogType.IDEAL]: parseFloat(
							(ideal / 3600).toFixed(1)
						),
						[TimeLogType.RESUMED]: parseFloat(
							(resumed / 3600).toFixed(1)
						)
					}
				};
			})
			.value();

		const dates = days.map((date) => {
			if (byDate[date]) {
				return byDate[date];
			} else {
				return {
					date: date,
					value: {
						[TimeLogType.TRACKED]: 0,
						[TimeLogType.MANUAL]: 0,
						[TimeLogType.IDEAL]: 0,
						[TimeLogType.RESUMED]: 0
					}
				};
			}
		});
		return dates;
	}

	async getDailyReport(request: IGetTimeLogReportInput) {
		const logs = await this.timeLogRepository.find({
			join: {
				alias: 'timeLogs',
				innerJoin: {
					employee: 'timeLogs.employee',
					timeSlots: 'timeLogs.timeSlots'
				}
			},
			relations: [
				'project',
				'project.organizationContact',
				'task',
				'timeSlots',
				'organizationContact',
				...(RequestContext.hasPermission(
					PermissionsEnum.CHANGE_SELECTED_EMPLOYEE
				)
					? ['employee', 'employee.user']
					: [])
			],
			order: {
				startedAt: 'ASC'
			},
			where: (qb: SelectQueryBuilder<TimeLog>) => {
				this.getFilterTimeLogQuery(qb, request);
			}
		});

		let dailyLogs;
		switch (request.groupBy) {
			case ReportGroupFilterEnum.employee:
				dailyLogs = await this.commandBus.execute(
					new GetTimeLogGroupByEmployeeCommand(logs)
				);
				break;
			case ReportGroupFilterEnum.project:
				dailyLogs = await this.commandBus.execute(
					new GetTimeLogGroupByProjectCommand(logs)
				);
				break;
			case ReportGroupFilterEnum.client:
				dailyLogs = await this.commandBus.execute(
					new GetTimeLogGroupByClientCommand(logs)
				);
				break;
			default:
				dailyLogs = await this.commandBus.execute(
					new GetTimeLogGroupByDateCommand(logs)
				);
				break;
		}

		return dailyLogs;
	}

	async getOwedAmountReport(
		request: IGetTimeLogReportInput
	): Promise<IAmountOwedReport[]> {
		const timeLogs = await this.timeLogRepository.find({
			join: {
				alias: 'timeLogs',
				innerJoin: {
					employee: 'timeLogs.employee',
					timeSlots: 'timeLogs.timeSlots'
				}
			},
			relations: ['employee', 'employee.user'],
			order: {
				startedAt: 'ASC'
			},
			where: (qb: SelectQueryBuilder<TimeLog>) => {
				this.getFilterTimeLogQuery(qb, request);
			}
		});

		const dailyLogs: any = chain(timeLogs)
			.groupBy((log) => moment(log.startedAt).format('YYYY-MM-DD'))
			.map((byDateLogs: ITimeLog[], date: string) => {
				const byEmployee = chain(byDateLogs)
					.groupBy('employeeId')
					.map((byEmployeeLogs: ITimeLog[]) => {
						const durationSum = byEmployeeLogs.reduce(
							(iteratee: any, log: any) => {
								return iteratee + log.duration;
							},
							0
						);

						const employee =
							byEmployeeLogs.length > 0
								? byEmployeeLogs[0].employee
								: null;

						const amount =
							employee?.billRateValue * (durationSum / 3600);

						return {
							employee,
							amount: parseFloat(amount.toFixed(1)),
							duration: durationSum
						};
					})
					.value();

				return { date, employees: byEmployee };
			})
			.value();

		return dailyLogs;
	}

	async getOwedAmountReportChartData(request: IGetTimeLogReportInput) {
		const timeLogs = await this.timeLogRepository.find({
			join: {
				alias: 'timeLogs',
				innerJoin: {
					employee: 'timeLogs.employee',
					timeSlots: 'timeLogs.timeSlots'
				}
			},
			relations: ['employee', 'employee.user'],
			order: {
				startedAt: 'ASC'
			},
			where: (qb: SelectQueryBuilder<TimeLog>) => {
				this.getFilterTimeLogQuery(qb, request);
			}
		});

		const { startDate, endDate } = request;
		const days: Array<string> = getDaysBetweenDates(startDate, endDate);

		const byDate: any = chain(timeLogs)
			.groupBy((log) => moment(log.startedAt).format('YYYY-MM-DD'))
			.mapObject((byDateLogs: ITimeLog[], date) => {
				const byEmployee = chain(byDateLogs)
					.groupBy('employeeId')
					.map((byEmployeeLogs: ITimeLog[]) => {
						const durationSum = byEmployeeLogs.reduce(
							(iteratee: any, log: any) => {
								return iteratee + log.duration;
							},
							0
						);

						const employee =
							byEmployeeLogs.length > 0
								? byEmployeeLogs[0].employee
								: null;

						const amount =
							employee?.billRateValue * (durationSum / 3600);

						return {
							employee,
							amount: parseFloat(amount.toFixed(1)),
							duration: durationSum
						};
					})
					.value();

				const value = byEmployee.reduce((iteratee: any, obj: any) => {
					return iteratee + obj.amount;
				}, 0);

				return { date, value };
			})
			.value();

		const dates = days.map((date) => {
			if (byDate[date]) {
				return byDate[date];
			} else {
				return {
					date: date,
					value: 0
				};
			}
		});

		return dates;
	}

	async getTimeLimit(request: IGetTimeLimitReportInput) {
		if (!request.duration) {
			request.duration = 'day';
		}
		const timeLogs = await this.timeLogRepository.find({
			join: {
				alias: 'timeLogs',
				innerJoin: {
					employee: 'timeLogs.employee',
					timeSlots: 'timeLogs.timeSlots'
				}
			},
			relations: ['employee', 'employee.user'],
			order: {
				startedAt: 'ASC'
			},
			where: (qb: SelectQueryBuilder<TimeLog>) => {
				this.getFilterTimeLogQuery(qb, request);
			}
		});

		const { startDate, endDate } = request;
		const days: Array<string> = getDaysBetweenDates(startDate, endDate);

		const byDate: any = chain(timeLogs)
			.groupBy((log) => {
				return moment(log.startedAt)
					.startOf(request.duration)
					.format('YYYY-MM-DD');
			})
			.mapObject((byDateLogs: ITimeLog[], date) => {
				const byEmployee = chain(byDateLogs)
					.groupBy('employeeId')
					.map((byEmployeeLogs: ITimeLog[]) => {
						const durationSum = byEmployeeLogs.reduce(
							(iteratee: any, log: any) => {
								return iteratee + log.duration;
							},
							0
						);

						const employee =
							byEmployeeLogs.length > 0
								? byEmployeeLogs[0].employee
								: null;

						let limit = 0;
						if (employee) {
							limit = employee.reWeeklyLimit * 60 * 60;
						}

						if (request.duration === 'day') {
							limit = limit / 5;
						} else if (request.duration === 'month') {
							limit = limit * 4;
						}

						const durationPercentage = (durationSum * 100) / limit;
						return {
							employee,
							duration: durationSum,
							durationPercentage: Number.isFinite(durationPercentage) ? durationPercentage.toFixed(2) : 0,
							limit
						};
					})
					.value();

				return { date, employees: byEmployee };
			})
			.value();

		const dates = days.map((date) => {
			if (byDate[date]) {
				return byDate[date];
			} else {
				return {
					date: date,
					employees: []
				};
			}
		});

		return dates as ITimeLimitReport[];
	}

	async projectBudgetLimit(request: IProjectBudgetLimitReportInput) {
		const { organizationId, employeeIds, startDate, endDate } = request;
		const tenantId = RequestContext.currentTenantId();

		const query = this.organizationProjectRepository.createQueryBuilder('organization_project');
		query.innerJoinAndSelect(`${query.alias}.timeLogs`, 'timeLogs');
		query.innerJoinAndSelect(`timeLogs.employee`, 'employee');
		query.andWhere(
			new Brackets((qb: WhereExpressionBuilder) => {
				qb.andWhere(`"${query.alias}"."organizationId" =:organizationId`, { organizationId });
				qb.andWhere(`"${query.alias}"."tenantId" =:tenantId`, { tenantId });
			})
		);
		query.andWhere(
			new Brackets((qb: WhereExpressionBuilder) => {
				qb.andWhere(`"employee"."organizationId" =:organizationId`, { organizationId });
				qb.andWhere(`"employee"."tenantId" =:tenantId`, { tenantId });
				if (isNotEmpty(employeeIds)) {
					qb.andWhere(`"employee"."id" IN (:...employeeIds)`, {
						employeeIds
					});
				}
			})
		);
		query.andWhere(
			new Brackets((qb: WhereExpressionBuilder) => {
				qb.andWhere(`"timeLogs"."organizationId" =:organizationId`, { organizationId });
				qb.andWhere(`"timeLogs"."tenantId" =:tenantId`, { tenantId });

				const { start, end } = getDateFormat(
					moment.utc(startDate),
					moment.utc(endDate)
				);
				qb.andWhere(`"timeLogs"."startedAt" >= :startDate AND "timeLogs"."startedAt" < :endDate`, {
					startDate: start,
					endDate: end
				});
				if (isNotEmpty(employeeIds)) {
					qb.andWhere(`"timeLogs"."employeeId" IN (:...employeeIds)`, {
						employeeIds
					});
				}
			})
		);

		const organizationProjects = await query.getMany();
		const projects = organizationProjects.map(
			(organizationProject: IOrganizationProject): IProjectBudgetLimitReport => {
				const { budgetType, budget = 0, timeLogs = [] } = organizationProject;

				let spent = 0;
				let spentPercentage = 0;
				let reamingBudget = 0;

				if (
					organizationProject.budgetType ==
					OrganizationProjectBudgetTypeEnum.HOURS
				) {
					spent = timeLogs.reduce(
						(iteratee: any, log: ITimeLog) => {
							return iteratee + (log.duration / 3600);
						},
						0
					);
				} else {
					spent = timeLogs.reduce(
						(iteratee: any, log: ITimeLog) => {
							let amount = 0;
							if (log.employee) {
								amount = ((log.duration / 3600) * log.employee.billRateValue);
							}
							return iteratee + amount;
						},
						0
					);
				}
				
				spentPercentage = (spent * 100) / budget;
				reamingBudget = Math.max(budget - spent, 0);
				
				delete organizationProject['timeLogs'];
				return {
					project: organizationProject,
					budgetType,
					budget,
					spent: parseFloat(spent.toFixed(2)),
					reamingBudget: parseFloat(reamingBudget.toFixed(2)),
					spentPercentage: parseFloat(spentPercentage.toFixed(2))
				};
			}
		);
		return projects;
	}

	async clientBudgetLimit(request: IClientBudgetLimitReportInput) {
		const { organizationId, employeeIds, startDate, endDate } = request;
		const tenantId = RequestContext.currentTenantId();
	
		const query = this.organizationContactRepository.createQueryBuilder('organization_contact');
		query.innerJoinAndSelect(`${query.alias}.timeLogs`, 'timeLogs');
		query.innerJoinAndSelect(`timeLogs.employee`, 'employee');
		query.andWhere(
			new Brackets((qb: WhereExpressionBuilder) => {
				qb.andWhere(`"${query.alias}"."organizationId" =:organizationId`, { organizationId });
				qb.andWhere(`"${query.alias}"."tenantId" =:tenantId`, { tenantId });
			})
		);
		query.andWhere(
			new Brackets((qb: WhereExpressionBuilder) => {
				qb.andWhere(`"employee"."organizationId" =:organizationId`, { organizationId });
				qb.andWhere(`"employee"."tenantId" =:tenantId`, { tenantId });
				if (isNotEmpty(employeeIds)) {
					qb.andWhere(`"employee"."id" IN (:...employeeIds)`, {
						employeeIds
					});
				}
			})
		);
		query.andWhere(
			new Brackets((qb: WhereExpressionBuilder) => {
				qb.andWhere(`"timeLogs"."organizationId" =:organizationId`, { organizationId });
				qb.andWhere(`"timeLogs"."tenantId" =:tenantId`, { tenantId });

				const { start, end } = getDateFormat(
					moment.utc(startDate),
					moment.utc(endDate)
				);
				qb.andWhere(`"timeLogs"."startedAt" >= :startDate AND "timeLogs"."startedAt" < :endDate`, {
					startDate: start,
					endDate: end
				});
				if (isNotEmpty(employeeIds)) {
					qb.andWhere(`"timeLogs"."employeeId" IN (:...employeeIds)`, {
						employeeIds
					});
				}
			})
		);

		const organizationContacts = await query.getMany();		
		return organizationContacts.map(
			(organizationContact: IOrganizationContact): IClientBudgetLimitReport => {
				const { budgetType, budget, timeLogs } = organizationContact;

				let spent = 0;
				let spentPercentage = 0;
				let reamingBudget = 0;

				if (budgetType == OrganizationContactBudgetTypeEnum.HOURS) {
					spent = timeLogs.reduce(
						(iteratee: any, log: ITimeLog) => {
							return iteratee + (log.duration / 3600);
						},
						0
					);
				} else {
					spent = timeLogs.reduce(
						(iteratee: any, log: ITimeLog) => {
							let amount = 0;
							if (log.employee) {
								amount = ((log.duration / 3600) * log.employee.billRateValue);
							}
							return iteratee + amount;
						},
						0
					);
				}

				spentPercentage = (spent * 100) / budget;
				reamingBudget = Math.max(budget - spent, 0);

				delete organizationContact['timeLogs'];
				return {
					organizationContact,
					budgetType,
					budget,
					spent: parseFloat(spent.toFixed(2)),
					reamingBudget: parseFloat(reamingBudget.toFixed(2)),
					spentPercentage: parseFloat(spentPercentage.toFixed(2))
				};
			}
		);
	}

	getFilterTimeLogQuery(
		query: SelectQueryBuilder<TimeLog>,
		request: IGetTimeLogInput
	) {
		const { organizationId, projectIds = [] } = request;
		const tenantId = RequestContext.currentTenantId();

		let employeeIds: string[];
		if (
			RequestContext.hasPermission(
				PermissionsEnum.CHANGE_SELECTED_EMPLOYEE
			)
		) {
			if (isNotEmpty(request.employeeIds)) {
				employeeIds = request.employeeIds;
			}
		} else {
			const user = RequestContext.currentUser();
			employeeIds = [user.employeeId];
		}

		if (isNotEmpty(request.timesheetId)) {
			const { timesheetId } = request;
			query.andWhere('"timesheetId" = :timesheetId', {
				timesheetId
			});
		}
		if (isNotEmpty(request.startDate) && isNotEmpty(request.endDate)) {
			const { start: startDate, end: endDate } = getDateFormat(
				moment.utc(request.startDate),
				moment.utc(request.endDate)
			);
			query.andWhere(`"${query.alias}"."startedAt" >= :startDate AND "${query.alias}"."startedAt" < :endDate`, {
				startDate,
				endDate
			});
		}
		if (isNotEmpty(employeeIds)) {
			query.andWhere(`"${query.alias}"."employeeId" IN (:...employeeIds)`, {
				employeeIds
			});
		}
		if (isNotEmpty(projectIds)) {
			query.andWhere(`"${query.alias}"."projectId" IN (:...projectIds)`, {
				projectIds
			});
		}
		if (isNotEmpty(request.activityLevel)) {
			/**
			 * Activity Level should be 0-100%
			 * So, we have convert it into 10 minutes timeslot by multiply by 6
			 */
			const { activityLevel } = request;
			const start = (activityLevel.start * 6);
			const end = (activityLevel.end * 6);

			query.andWhere(`"timeSlots"."overall" BETWEEN :start AND :end`, {
				start,
				end
			});
		}
		if (isNotEmpty(request.source)) {
			const { source } = request;
			if (source instanceof Array) {
				query.andWhere(`"${query.alias}"."source" IN (:...source)`, {
					source
				});
			} else {
				query.andWhere(`"${query.alias}"."source" = :source`, {
					source
				});
			}
		}
		if (isNotEmpty(request.logType)) {
			const { logType } = request;
			if (logType instanceof Array) {
				query.andWhere(`"${query.alias}"."logType" IN (:...logType)`, {
					logType
				});
			} else {
				query.andWhere(`"${query.alias}"."logType" = :logType`, {
					logType
				});
			}
		}
		query.andWhere(
			new Brackets((qb: WhereExpressionBuilder) => { 
				qb.andWhere(`"${query.alias}"."tenantId" = :tenantId`, { tenantId });
				qb.andWhere(`"${query.alias}"."organizationId" = :organizationId`, { organizationId });
				qb.andWhere(`"${query.alias}"."deletedAt" IS NULL`);
			})
		);
		return query;
	}

	async addManualTime(request: IManualTimeInput): Promise<TimeLog> {
		const tenantId = RequestContext.currentTenantId();
		const { employeeId, startedAt, stoppedAt, organizationId } = request;

		if (!startedAt || !stoppedAt) {
			throw new BadRequestException(
				'Please select valid Date, start time and end time'
			);
		}

		const employee = await this.employeeRepository.findOne(
			employeeId,
			{ relations: ['organization'] }
		);

		const isDateAllow = this.allowDate(
			startedAt,
			stoppedAt,
			employee.organization
		);
		
		if (!isDateAllow) {
			throw new BadRequestException(
				'Please select valid Date, start time and end time'
			);
		}

		const conflicts = await this.checkConflictTime({
			startDate: startedAt,
			endDate: stoppedAt,
			employeeId,
			organizationId,
			tenantId,
			...(request.id ? { ignoreId: request.id } : {})
		});

		if (isNotEmpty(conflicts)) {
			const times: IDateRange = {
				start: new Date(startedAt),
				end: new Date(stoppedAt)
			};
			for await (const timeLog of conflicts)  {
				const { timeSlots = [] } = timeLog;
				for await (const timeSlot of timeSlots) {
					await this.commandBus.execute(
						new DeleteTimeSpanCommand(
							times,
							timeLog,
							timeSlot
						)
					);
				}
			}
		}
		return await this.commandBus.execute(
			new TimeLogCreateCommand(request)
		);
	}

	async updateManualTime(id: string, request: IManualTimeInput): Promise<TimeLog> {
		const tenantId = RequestContext.currentTenantId();
		const { startedAt, stoppedAt, employeeId, organizationId } = request;
		
		if (!startedAt || !stoppedAt) {
			throw new BadRequestException('Please select valid Date start and end time');
		}

		/**
		 * Get Employee
		 */
		const employee = await this.employeeRepository.findOne(employeeId, {
			relations: ['organization']
		});

		/**
		 * Check future date allow
		 */
		const isDateAllow = this.allowDate(
			startedAt,
			stoppedAt,
			employee.organization
		);
		if (!isDateAllow) {
			throw new BadRequestException('Please select valid Date start and end time');
		}

		/**
		 * Check Conflicts TimeLogs
		 */
		const timeLog = await this.timeLogRepository.findOne(id);
		const conflicts = await this.checkConflictTime({
			startDate: startedAt,
			endDate: stoppedAt,
			employeeId,
			organizationId,
			tenantId,
			...(id ? { ignoreId: id } : {})
		});
		if (isNotEmpty(conflicts)) {
			const times: IDateRange = {
				start: new Date(startedAt),
				end: new Date(stoppedAt)
			};
			for await (const timeLog of conflicts)  {
				const { timeSlots = [] } = timeLog;
				for await (const timeSlot of timeSlots) {
					await this.commandBus.execute(
						new DeleteTimeSpanCommand(
							times,
							timeLog,
							timeSlot
						)
					);
				}
			}
		}

		await this.commandBus.execute(
			new TimeLogUpdateCommand(request, timeLog)
		);
		return await this.timeLogRepository.findOne(request.id);
	}

	async deleteTimeLogs(
		query: IDeleteTimeLog
	): Promise<DeleteResult | UpdateResult> {
		let logIds: string | string[] = query.logIds;
		if (isEmpty(logIds)) {
			throw new NotAcceptableException('You can not delete time logs');
		}
		if (typeof logIds === 'string') {
			logIds = [logIds];
		}

		const tenantId = RequestContext.currentTenantId();
		const user = RequestContext.currentUser();
		const { organizationId, forceDelete } = query;
	
		const timeLogs = await this.timeLogRepository.find({
			where: (query: SelectQueryBuilder<TimeLog>) => {
				query.where({
					...(
						RequestContext.hasPermission(
							PermissionsEnum.CHANGE_SELECTED_EMPLOYEE
						) ? {} : {
							employeeId: user.employeeId
						}
					)
				});
				query.andWhere(
					new Brackets((qb: WhereExpressionBuilder) => { 
						qb.andWhere(`"${query.alias}"."tenantId" = :tenantId`, { tenantId });
						qb.andWhere(`"${query.alias}"."organizationId" = :organizationId`, { organizationId });
						qb.andWhere(`"${query.alias}"."id" IN (:...logIds)`, {
							logIds
						});
					})
				);
			},
			relations: ['timeSlots']
		});
		return await this.commandBus.execute(
			new TimeLogDeleteCommand(timeLogs, forceDelete)
		);
	}

	async checkConflictTime(request: IGetTimeLogConflictInput): Promise<ITimeLog[]> {
		return await this.commandBus.execute(
			new IGetConflictTimeLogCommand(request)
		);
	}

	private allowDate(start: Date, end: Date, organization: Organization) {
		if (!moment.utc(start).isBefore(moment.utc(end))) {
			return false;
		}
		if (organization.futureDateAllowed) {
			return true;
		}
		return moment(end).isSameOrBefore(moment());
	}
}
