import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

/** Reusable select for public user fields (avoids repeating in every query) */
export const USER_SELECT = { id: true, username: true, displayName: true } as const;
