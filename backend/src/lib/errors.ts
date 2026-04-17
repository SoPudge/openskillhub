// ─── Error Codes ────────────────────────────────────────
export enum ErrorCode {
  // General
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Auth
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_APIKEY_INVALID = 'AUTH_APIKEY_INVALID',
  AUTH_USER_CONFLICT = 'AUTH_USER_CONFLICT',

  // Skills
  SKILL_NOT_FOUND = 'SKILL_NOT_FOUND',
  SKILL_NAME_TAKEN = 'SKILL_NAME_TAKEN',
  SKILL_NOT_AUTHOR = 'SKILL_NOT_AUTHOR',

  // Versions
  VERSION_NOT_FOUND = 'VERSION_NOT_FOUND',
  VERSION_CONFLICT = 'VERSION_CONFLICT',

  // Packages
  PACKAGE_NOT_FOUND = 'PACKAGE_NOT_FOUND',
  PACKAGE_CONFLICT = 'PACKAGE_CONFLICT',
  PACKAGE_INVALID_ZIP = 'PACKAGE_INVALID_ZIP',
  PACKAGE_PATH_TRAVERSAL = 'PACKAGE_PATH_TRAVERSAL',
  PACKAGE_NO_SKILL_MD = 'PACKAGE_NO_SKILL_MD',

  // Teams
  TEAM_NOT_FOUND = 'TEAM_NOT_FOUND',
  TEAM_SLUG_TAKEN = 'TEAM_SLUG_TAKEN',
  TEAM_NOT_MEMBER = 'TEAM_NOT_MEMBER',
  TEAM_NOT_ADMIN = 'TEAM_NOT_ADMIN',
  TEAM_NOT_OWNER = 'TEAM_NOT_OWNER',
  TEAM_MEMBER_EXISTS = 'TEAM_MEMBER_EXISTS',
  TEAM_OWNER_LEAVE = 'TEAM_OWNER_LEAVE',

  // Users
  USER_NOT_FOUND = 'USER_NOT_FOUND',
}

// ─── AppError ───────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// ─── Prisma Error Mapping ───────────────────────────────
interface PrismaKnownError {
  code: string;
  meta?: { target?: string[] | string; cause?: string };
}

export function mapPrismaError(err: PrismaKnownError): AppError | null {
  switch (err.code) {
    case 'P2002': // Unique constraint violation
      return new AppError(409, ErrorCode.VALIDATION_FAILED, 'Resource already exists');
    case 'P2025': // Record not found
      return new AppError(404, ErrorCode.NOT_FOUND, 'Resource not found');
    case 'P2003': // Foreign key constraint
      return new AppError(400, ErrorCode.VALIDATION_FAILED, 'Referenced resource not found');
    default:
      return null;
  }
}
