/**
 * OpenSkillHub SDK — Error class for API errors.
 */
export class OpenSkillHubError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'OpenSkillHubError';
  }
}
