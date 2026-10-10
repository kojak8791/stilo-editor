/** Error thrown by Stilo for invalid configuration or API misuse. */
export class StiloError extends Error {
  constructor(message: string) {
    super(`[stilo] ${message}`);
    this.name = 'StiloError';
  }
}

/** Placeholder for functions whose implementation is assigned to a task. */
export function notImplemented(name: string): never {
  throw new StiloError(`${name} is not implemented yet.`);
}
