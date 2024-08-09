import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
	NbAccordionModule,
	NbActionsModule,
	NbBadgeModule,
	NbButtonModule,
	NbCardModule,
	NbCheckboxModule,
	NbDatepickerModule,
	NbDialogModule,
	NbIconModule,
	NbInputModule,
	NbRouteTabsetModule,
	NbSelectModule,
	NbSpinnerModule,
	NbTabsetModule,
	NbToggleModule,
	NbTooltipModule
} from '@nebular/theme';
import { CKEditorModule } from 'ckeditor4-angular';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxPermissionsModule } from 'ngx-permissions';
import {
	CandidatesService,
	InviteGuard,
	OrganizationEmploymentTypesService,
	OrganizationsService,
	SkillsService
} from '@gauzy/ui-core/core';
import { TranslateModule } from '@ngx-translate/core';
import {
	SmartDataViewLayoutModule,
	EditEmployeeMembershipFormModule,
	EmployeeEndWorkModule,
	EmployeeLocationModule,
	EmployeeMutationModule,
	EmployeeRatesModule,
	EmployeeStartWorkModule,
	ImageUploaderModule,
	InviteMutationModule,
	InviteTableModule,
	LanguageSelectorModule,
	RecurringExpenseBlockModule,
	RecurringExpenseDeleteConfirmationModule,
	RecurringExpenseMutationModule,
	SharedModule,
	SkillsInputModule,
	TableComponentsModule,
	TagsColorInputModule,
	TimeZoneSelectorModule
} from '@gauzy/ui-core/shared';
import {
	EditEmployeeContactComponent,
	EditEmployeeEmploymentComponent,
	EditEmployeeHiringComponent,
	EditEmployeeLocationComponent,
	EditEmployeeMainComponent,
	EditEmployeeProjectsComponent,
	EditEmployeeRatesComponent,
	EditEmployeeProfileComponent,
	EditEmployeeOtherSettingsComponent
} from './edit-employee/edit-employee-profile';
import { EditEmployeeComponent } from './edit-employee/edit-employee.component';
import { EmployeesRoutingModule } from './employees-routing.module';
import { EmployeesComponent } from './employees.component';
import { ManageEmployeeInviteComponent } from './manage-employee-invite/manage-employee-invite.component';
import {
	EmployeeAverageBonusComponent,
	EmployeeAverageExpensesComponent,
	EmployeeAverageIncomeComponent,
	EmployeeBonusComponent,
	EmployeeWorkStatusComponent,
	EmployeeTimeTrackingStatusComponent
} from './table-components';
import { EditEmployeeNetworksComponent } from './edit-employee/edit-employee-profile/edit-employee-networks/edit-employee-networks.component';

const COMPONENTS = [
	EmployeesComponent,
	EmployeeBonusComponent,
	EmployeeAverageIncomeComponent,
	EmployeeAverageExpensesComponent,
	EmployeeAverageBonusComponent,
	EmployeeWorkStatusComponent,
	EmployeeTimeTrackingStatusComponent,
	EditEmployeeComponent,
	EditEmployeeProfileComponent,
	EditEmployeeMainComponent,
	EditEmployeeRatesComponent,
	ManageEmployeeInviteComponent,
	EditEmployeeProjectsComponent,
	EditEmployeeContactComponent,
	EditEmployeeHiringComponent,
	EditEmployeeLocationComponent,
	EditEmployeeEmploymentComponent,
	EditEmployeeNetworksComponent,
	EditEmployeeOtherSettingsComponent
];

@NgModule({
	imports: [
		CommonModule,
		FormsModule,
		ReactiveFormsModule,
		CKEditorModule,
		NbAccordionModule,
		NbActionsModule,
		NbBadgeModule,
		NbButtonModule,
		NbCardModule,
		NbCheckboxModule,
		NbDatepickerModule,
		NbDialogModule.forChild(),
		NbIconModule,
		NbInputModule,
		NbRouteTabsetModule,
		NbSelectModule,
		NbSpinnerModule,
		NbTabsetModule,
		NbToggleModule,
		NbTooltipModule,
		NgSelectModule,
		NgxPermissionsModule.forChild(),
		TranslateModule.forChild(),
		EmployeesRoutingModule,
		SharedModule,
		TableComponentsModule,
		EmployeeMutationModule,
		EmployeeEndWorkModule,
		RecurringExpenseMutationModule,
		ImageUploaderModule,
		InviteMutationModule,
		InviteTableModule,
		RecurringExpenseDeleteConfirmationModule,
		EditEmployeeMembershipFormModule,
		RecurringExpenseBlockModule,
		TagsColorInputModule,
		SkillsInputModule,
		EmployeeLocationModule,
		EmployeeRatesModule,
		EmployeeStartWorkModule,
		LanguageSelectorModule,
		SmartDataViewLayoutModule,
		TimeZoneSelectorModule
	],
	declarations: [...COMPONENTS],
	providers: [OrganizationsService, InviteGuard, CandidatesService, OrganizationEmploymentTypesService, SkillsService]
})
export class EmployeesModule {}
