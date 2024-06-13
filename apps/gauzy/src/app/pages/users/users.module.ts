import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
	NbCardModule,
	NbButtonModule,
	NbInputModule,
	NbIconModule,
	NbDialogModule,
	NbTooltipModule,
	NbBadgeModule,
	NbSelectModule,
	NbRouteTabsetModule,
	NbSpinnerModule,
	NbSidebarModule,
	NbLayoutModule,
	NbActionsModule
} from '@nebular/theme';
import { NgxPermissionsModule } from 'ngx-permissions';
import { NgSelectModule } from '@ng-select/ng-select';
import { Angular2SmartTableModule } from 'angular2-smart-table';
import { I18nTranslateModule } from '@gauzy/ui-core/i18n';
import { InviteGuard, OrganizationsService, UsersOrganizationsService } from '@gauzy/ui-core/core';
import { UserIdService } from '@gauzy/ui-core/core';
import {
	CardGridModule,
	EditEmployeeMembershipFormModule,
	EditProfileFormModule,
	GauzyButtonActionModule,
	ImageUploaderModule,
	InviteMutationModule,
	InviteTableModule,
	PaginationV2Module,
	SharedModule,
	TableComponentsModule,
	TagsColorInputModule,
	UserMultiSelectModule,
	UserMutationModule,
	UserOrganizationsMultiSelectModule
} from '@gauzy/ui-core/shared';
import { ThemeModule } from '../../@theme/theme.module';
import { UsersRoutingModule } from './users-routing.module';
import { UsersComponent } from './users.component';
import { EditUserProfileComponent } from './edit-user-profile/edit-user-profile.component';
import { EditUserMutationComponent } from './edit-user-mutation/edit-user-mutation.component';
import { ManageUserInviteComponent } from './manage-user-invite/manage-user-invite.component';
import { OrganizationsModule } from '../organizations/organizations.module';
import { EditUserOrganizationsComponent } from './edit-user-profile/edit-user-organizations/edit-user-organizations.component';
import { EditUserDataComponent } from './edit-user-profile/edit-user-data/edit-user-data.component';
import { EditUserOrganizationsMutationComponent } from './edit-user-profile/edit-user-organizations/edit-user-organizations-mutation/edit-user-organizations-mutation.component';

const COMPONENTS = [
	UsersComponent,
	EditUserProfileComponent,
	ManageUserInviteComponent,
	EditUserMutationComponent,
	EditUserOrganizationsComponent,
	EditUserDataComponent,
	EditUserOrganizationsMutationComponent
];

@NgModule({
	imports: [
		TagsColorInputModule,
		TableComponentsModule,
		NbSidebarModule,
		NbLayoutModule,
		UsersRoutingModule,
		UserMultiSelectModule,
		UserOrganizationsMultiSelectModule,
		OrganizationsModule,
		NbActionsModule,
		ThemeModule,
		NbCardModule,
		FormsModule,
		ReactiveFormsModule,
		NbButtonModule,
		NbInputModule,
		NbIconModule,
		Angular2SmartTableModule,
		NbDialogModule.forChild(),
		UserMutationModule,
		NbTooltipModule,
		NgSelectModule,
		NbSelectModule,
		ImageUploaderModule,
		NbBadgeModule,
		NbRouteTabsetModule,
		I18nTranslateModule.forChild(),
		NbSpinnerModule,
		EditProfileFormModule,
		InviteMutationModule,
		InviteTableModule,
		EditEmployeeMembershipFormModule,
		NgxPermissionsModule.forChild(),
		GauzyButtonActionModule,
		PaginationV2Module,
		CardGridModule,
		SharedModule
	],
	declarations: [...COMPONENTS],
	providers: [OrganizationsService, UsersOrganizationsService, InviteGuard, UserIdService]
})
export class UsersModule {}
