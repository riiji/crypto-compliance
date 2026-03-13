import {
  UnauthorizedException,
  createParamDecorator,
  type ExecutionContext,
} from "@nestjs/common";
import type { AuthenticatedUser } from "./jwt-auth.service";
import type { AuthenticatedRequest } from "./jwt-auth.guard";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.authUser) {
      throw new UnauthorizedException("Authenticated user is missing");
    }

    return request.authUser;
  },
);
