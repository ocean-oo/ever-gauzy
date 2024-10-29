import { isNotEmpty } from './is-not-empty';
import { ucFirst } from './uc-first';

/*
 * Get average value column in array object
 */
export function average(items: any, column: string) {
	let sum = 0;
	if (items.length > 0) {
		items.forEach((item) => {
			sum += parseFloat(item[column]);
		});
	}
	return sum / items.length;
}

export const ArraySum = function (t, n) {
	return parseFloat(t) + parseFloat(n);
};

/*
 * Retrieve name from email address
 */
export function retrieveNameFromEmail(email: string): string {
	if (email) {
		return ucFirst(email.substring(0, email.lastIndexOf('@')));
	}
	return;
}

/**
 * Remove duplicates from an array
 *
 * @param data
 * @returns
 */
export function removeDuplicates(data: string[]) {
	return [...new Set(data)];
}

/**
 * Check string is null or undefined
 * From https://github.com/typeorm/typeorm/issues/873#issuecomment-502294597
 *
 * @param obj
 * @returns
 */
export function isNullOrUndefined<T>(value: T | null | undefined): value is null | undefined {
	return value === undefined || value === null;
}

/**
 * Checks if a value is not null or undefined.
 * @param value The value to be checked.
 * @returns true if the value is not null or undefined, false otherwise.
 */
export function isNotNullOrUndefined<T>(value: T | undefined | null): value is T {
	return value !== undefined && value !== null;
}

/**
 * Split the `items` array into multiple, smaller arrays of the given `size`.
 *
 * @param {Array} items
 * @param {Number} size
 *
 * @returns {Array[]}
 */
export function chunks(items: any[], size: number): any[] {
	const chunks = [];
	items = [].concat(...items);
	while (items.length) {
		chunks.push(items.splice(0, size));
	}
	return chunks;
}

/**
 * Converts a given input into a boolean value.
 * If the input is `undefined` or `null`, it returns `false`.
 *
 * @param value - The input to convert to a boolean.
 * @returns {boolean} - A boolean representation of the given input.
 */
export const parseToBoolean = (value: any): boolean => {
	if (value === undefined || value === null) {
		return false; // Return false for undefined or null
	}

	try {
		const parsed = JSON.parse(value); // Attempt to parse as JSON
		if (typeof parsed === 'boolean') {
			return parsed; // Return if it's already a boolean
		}

		// Convert numbers: 0 is false, other numbers are true
		if (typeof parsed === 'number') {
			return parsed !== 0;
		}

		// Convert common truthy/falsy strings
		if (typeof parsed === 'string') {
			const lowerCase = parsed.toLowerCase().trim();
			return lowerCase === 'true' || lowerCase === '1'; // Consider 'true' and '1' as true
		}

		return Boolean(parsed); // Fallback to Boolean conversion
	} catch (error) {
		// Handle JSON parse errors
		return false; // Return false on parsing errors
	}
};

/**
 * Trim a string value and return it if not empty, otherwise return undefined
 * @param value - The string value to trim
 * @returns Trimmed string value or undefined if empty
 */
export const trimAndGetValue = (value?: string): string | undefined => {
	return isNotEmpty(value) ? value.trim() : undefined;
};

/**
 * Adds "http://" prefix to a URL if it's missing.
 * @param url - The URL to ensure has the "http://" prefix.
 * @returns The URL with the "http://" prefix.
 */
export const addHttpsPrefix = (url: string, prefix = 'https'): string => {
	if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
		return `${prefix}://${url}`;
	}

	return url;
};

/**
 * Creates a query parameters string from an object of query parameters.
 * @param queryParams An object containing query parameters.
 * @returns A string representation of the query parameters.
 */
export function createQueryParamsString(queryParams: { [key: string]: string | string[] | boolean }): string {
	return Object.entries(queryParams)
		.map(([key, value]) => {
			if (Array.isArray(value)) {
				// Handle array values by joining them with '&'
				return value.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
			} else if (typeof value === 'boolean') {
				// Convert boolean to string explicitly (true/false)
				return `${encodeURIComponent(key)}=${value}`;
			} else {
				// Handle string or other types
				return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
			}
		})
		.join('&');
}
