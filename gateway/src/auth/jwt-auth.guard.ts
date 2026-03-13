import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtAuthService, type AuthenticatedUser } from "./jwt-auth.service";

export interface AuthenticatedRequest {
  headers?: Record<string, string | string[] | undefined>;
  authUser?: AuthenticatedUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtAuthService: JwtAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorizationHeader = this.readAuthorizationHeader(request.headers);
    if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Bearer token is required");
    }

    const token = authorizationHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedException("Bearer token is required");
    }

    request.authUser = this.jwtAuthService.verifyToken(token);
    return true;
  }

  private readAuthorizationHeader(
    headers: Record<string, string | string[] | undefined> | undefined,
  ): string | null {
    if (!headers) {
      return null;
    }

    const raw = headers.authorization;
    const first = Array.isArray(raw) ? raw[0] : raw;
    if (!first) {
      return null;
    }

    return first.trim();
  }
}
