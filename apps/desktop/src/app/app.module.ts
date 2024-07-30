import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router, RouterModule } from '@angular/router';
import {
	AboutModule,
	ActivityWatchInterceptor,
	AlwaysOnModule,
	APIInterceptor,
	AuthGuard,
	AuthService,
	AuthStrategy,
	DEFAULT_TIMEOUT,
	ElectronService,
	ErrorHandlerService,
	GAUZY_ENV,
	ImageViewerModule,
	LanguageInterceptor,
	LoggerService,
	NoAuthGuard,
	OrganizationInterceptor,
	RecapModule,
	ScreenCaptureModule,
	ServerErrorInterceptor,
	SettingsModule,
	SetupModule,
	Store,
	TenantInterceptor,
	TimeoutInterceptor,
	TimeTrackerModule,
	TokenInterceptor,
	UpdaterModule
} from '@gauzy/desktop-ui-lib';
import { environment as gauzyEnvironment } from '@gauzy/ui-config';
import {
	NbButtonModule,
	NbCardModule,
	NbDatepickerModule,
	NbDialogModule,
	NbDialogService,
	NbLayoutModule,
	NbThemeModule,
	NbToastrModule
} from '@nebular/theme';
import * as Sentry from '@sentry/angular-ivy';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AppService } from './app.service';
import { initializeSentry } from './sentry';

/**
 * Initializes Sentry based on the environment configuration.
 * If a valid Sentry DSN is provided, Sentry is initialized with the specified configuration.
 * If the DSN is set to 'DOCKER_SENTRY_DSN', a warning is logged indicating that the environment
 * is running inside Docker without a Sentry DSN.
 */
if (environment.SENTRY_DSN) {
	if (environment.SENTRY_DSN === 'DOCKER_SENTRY_DSN') {
		console.warn('You are running inside Docker but does not have SENTRY_DSN env set');
	} else {
		console.log(`Enabling Sentry with DSN: ${environment.SENTRY_DSN}`);
		initializeSentry();
	}
}

@NgModule({
	declarations: [AppComponent],
	imports: [
		NbLayoutModule,
		NbDialogModule.forRoot(),
		NbToastrModule.forRoot(),
		NbCardModule,
		NbButtonModule,
		BrowserModule,
		BrowserAnimationsModule,
		RouterModule,
		AppRoutingModule,
		NbThemeModule.forRoot({ name: 'gauzy-light' }),
		SetupModule,
		TimeTrackerModule,
		HttpClientModule,
		ScreenCaptureModule,
		SettingsModule,
		UpdaterModule,
		ImageViewerModule,
		NbDatepickerModule.forRoot(),
		AboutModule,
		AlwaysOnModule,
		RecapModule
	],
	providers: [
		AppService,
		NbDialogService,
		ElectronService,
		LoggerService,
		AuthGuard,
		NoAuthGuard,
		AuthStrategy,
		AuthService,
		Store,
		{
			provide: HTTP_INTERCEPTORS,
			useClass: TokenInterceptor,
			multi: true
		},
		{
			provide: HTTP_INTERCEPTORS,
			useClass: TenantInterceptor,
			multi: true
		},
		{
			provide: HTTP_INTERCEPTORS,
			useClass: OrganizationInterceptor,
			multi: true
		},
		{
			provide: ErrorHandler,
			useValue: Sentry.createErrorHandler({
				showDialog: true
			})
		},
		{
			provide: Sentry.TraceService,
			deps: [Router]
		},
		{
			provide: APP_INITIALIZER,
			useFactory: () => () => {},
			deps: [Sentry.TraceService],
			multi: true
		},
		{
			provide: ErrorHandler,
			useClass: ErrorHandlerService
		},
		{
			provide: HTTP_INTERCEPTORS,
			useClass: ServerErrorInterceptor,
			multi: true
		},
		{
			provide: HTTP_INTERCEPTORS,
			useClass: ActivityWatchInterceptor,
			multi: true
		},
		{
			provide: HTTP_INTERCEPTORS,
			useClass: APIInterceptor,
			multi: true
		},
		{
			provide: HTTP_INTERCEPTORS,
			useClass: LanguageInterceptor,
			multi: true
		},
		{
			provide: HTTP_INTERCEPTORS,
			useClass: TimeoutInterceptor,
			multi: true
		},
		{ provide: DEFAULT_TIMEOUT, useValue: 80000 },
		{
			provide: GAUZY_ENV,
			useValue: {
				...gauzyEnvironment,
				...environment
			}
		}
	],
	bootstrap: [AppComponent]
})
export class AppModule {
	constructor() {}
}
