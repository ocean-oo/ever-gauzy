import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { combineLatest, concatMap, map, Observable } from 'rxjs';
import { AutoRefreshService } from '../../+state/auto-refresh/auto-refresh.service';
import { RecapQuery } from '../../+state/recap.query';
import { RecapService } from '../../+state/recap.service';
import { RequestQuery } from '../../+state/request/request.query';
import { IStatisticItem } from '../../shared/ui/statistic/statistic.component';
import { TaskStatisticsAdapter } from '../../shared/utils/adapters/task.adapter';

@UntilDestroy({ checkProperties: true })
@Component({
	selector: 'ngx-tasks',
	templateUrl: './tasks.component.html',
	styleUrls: ['./tasks.component.scss'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class TasksComponent implements OnInit {
	constructor(
		private readonly recapQuery: RecapQuery,
		private readonly requestQuery: RequestQuery,
		private readonly service: RecapService,
		private readonly autoRefreshService: AutoRefreshService
	) {}

	ngOnInit(): void {
		combineLatest([this.recapQuery.range$, this.requestQuery.request$, this.autoRefreshService.refresh$])
			.pipe(
				concatMap(() => this.load()),
				untilDestroyed(this)
			)
			.subscribe();
	}

	public async load(): Promise<void> {
		await this.service.getTasks();
	}
	public get tasks$(): Observable<IStatisticItem[]> {
		return this.recapQuery.state$.pipe(map((state) => state.tasks.map((task) => new TaskStatisticsAdapter(task))));
	}
}
