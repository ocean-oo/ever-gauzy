import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IOrganizationProjectModule, IPagination, ID } from '@gauzy/contracts';
import { API_PREFIX } from '@gauzy/ui-core/common';
import { CrudService } from '../crud';

@Injectable({
	providedIn: 'root'
})
export class OrganizationProjectModuleService extends CrudService<IOrganizationProjectModule> {
	private static readonly API_URL = `${API_PREFIX}/organization-project-module`;

	constructor(http: HttpClient) {
		super(http, OrganizationProjectModuleService.API_URL);
	}

	/**
	 * Find project modules for an employee based on pagination parameters.
	 * @param params - The pagination parameters for filtering employee project modules.
	 * @returns An Observable that emits the paginated list of employee project modules.
	 */
	getEmployeeProjectModules(params: HttpParams): Observable<IPagination<IOrganizationProjectModule>> {
		return this.http.get<IPagination<IOrganizationProjectModule>>(`${this.API_URL}/employee`, { params });
	}

	/**
	 * Retrieve project modules associated with a team using pagination parameters.
	 * @param params - The pagination parameters for filtering team project modules.
	 * @returns An Observable that emits the paginated list of team project modules.
	 */
	findTeamProjectModules(params: HttpParams): Observable<IPagination<IOrganizationProjectModule>> {
		return this.http.get<IPagination<IOrganizationProjectModule>>(`${this.API_URL}/team`, { params });
	}

	/**
	 * Retrieve project modules associated with a specific employee.
	 * @param employeeId - The unique identifier of the employee.
	 * @param params - Additional query parameters for filtering.
	 * @returns An Observable that emits the paginated list of project modules for the specified employee.
	 */
	findByEmployee(employeeId: ID, params: HttpParams): Observable<IPagination<IOrganizationProjectModule>> {
		return this.http.get<IPagination<IOrganizationProjectModule>>(`${this.API_URL}/employee/${employeeId}`, {
			params
		});
	}

	/**
	 * Find a specific project module by its unique identifier.
	 * @param id - The unique identifier of the project module.
	 * @param params - Additional query parameters if required.
	 * @returns An Observable that emits the found project module.
	 */
	findById(id: ID, params: HttpParams): Observable<IOrganizationProjectModule> {
		return this.http.get<IOrganizationProjectModule>(`${this.API_URL}/${id}`, { params });
	}
}
