import { Role } from '../../../generated/prisma/enums.js';

export interface AuthenticatedUser {
  sub: number;
  email: string;
  rol: Role;
}

export type RequestWithUser = Request & {
  user: AuthenticatedUser;
};
