/**
 * Creates a sleep function that pauses execution for a specified time.
 *
 * @param ms - The number of milliseconds to pause.
 * @returns A promise that resolves after the specified time.
 */
export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
