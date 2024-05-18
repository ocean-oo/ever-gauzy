import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_PREFIX } from '@gauzy/ui-sdk/common';
import { environment } from '@env/environment';

const baseUrl = environment.API_BASE_URL;

@Injectable()
export class APIInterceptor implements HttpInterceptor {
	constructor() {}

	intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
		if (baseUrl && request.url.startsWith(`${API_PREFIX}`)) {
			const url = baseUrl + request.url;
			// console.log(`API Request: ${request.url} -> ${url}`);
			request = request.clone({
				url: url
			});
		}
		return next.handle(request);
	}
}
