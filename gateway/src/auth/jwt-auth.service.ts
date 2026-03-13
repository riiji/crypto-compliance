import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface AuthenticatedUser {
  username: string;
}

interface JwtHeader {
  alg: "HS256";
  typ: "JWT";
}

interface JwtPayload {
  iss: string;
  sub: string;
  username: string;
  iat: number;
  exp: number;
}

export interface LoginResponseDto {
  username: string;
  accessToken: string;
  expiresAt: string;
}

@Injectable()
export class JwtAuthService {
  private readonly issuer = "crypto-compliance-gateway";

  private readonly secret = process.env.COMPLIANCE_ADMIN_JWT_SECRET;

  private readonly ttlSeconds = this.parsePositiveInteger(
    process.env.COMPLIANCE_ADMIN_JWT_TTL_SECONDS,
    12 * 60 * 60,
  );

  issueToken(username: string): LoginResponseDto {
    if (!this.secret) {
      throw new InternalServerErrorException(
        "COMPLIANCE_ADMIN_JWT_SECRET is not configured",
      );
    }

    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      throw new UnauthorizedException("Username must not be empty");
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + this.ttlSeconds;
    const header: JwtHeader = {
      alg: "HS256",
      typ: "JWT",
    };
    const payload: JwtPayload = {
      iss: this.issuer,
      sub: normalizedUsername,
      username: normalizedUsername,
      iat: issuedAt,
      exp: expiresAt,
    };

    const encodedHeader = this.encodeSegment(header);
    const encodedPayload = this.encodeSegment(payload);
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const signature = this.createSignature(signingInput);

    return {
      username: normalizedUsername,
      accessToken: `${signingInput}.${signature}`,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }

  verifyToken(rawToken: string): AuthenticatedUser {
    if (!this.secret) {
      throw new InternalServerErrorException(
        "COMPLIANCE_ADMIN_JWT_SECRET is not configured",
      );
    }

    const token = rawToken.trim();
    const segments = token.split(".");
    if (segments.length !== 3) {
      throw new UnauthorizedException("Invalid bearer token");
    }

    const [encodedHeader, encodedPayload, actualSignature] = segments;
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = this.createSignature(signingInput);

    if (!this.isMatchingSignature(expectedSignature, actualSignature)) {
      throw new UnauthorizedException("Invalid bearer token");
    }

    const header = this.decodeSegment<JwtHeader>(encodedHeader);
    const payload = this.decodeSegment<JwtPayload>(encodedPayload);
    if (header.alg !== "HS256" || header.typ !== "JWT") {
      throw new UnauthorizedException("Invalid bearer token");
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      payload.iss !== this.issuer ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= now ||
      payload.username.trim() === "" ||
      payload.sub.trim() === "" ||
      payload.username !== payload.sub
    ) {
      throw new UnauthorizedException("Bearer token is invalid or expired");
    }

    return {
      username: payload.username,
    };
  }

  private createSignature(signingInput: string): string {
    return createHmac("sha256", this.secret!)
      .update(signingInput)
      .digest("base64url");
  }

  private encodeSegment(input: JwtHeader | JwtPayload): string {
    return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
  }

  private decodeSegment<T>(encoded: string): T {
    try {
      const parsed = JSON.parse(
        Buffer.from(encoded, "base64url").toString("utf8"),
      ) as unknown;

      return parsed as T;
    } catch {
      throw new UnauthorizedException("Invalid bearer token");
    }
  }

  private isMatchingSignature(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected, "utf8");
    const actualBuffer = Buffer.from(actual, "utf8");

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
  }

  private parsePositiveInteger(
    raw: string | undefined,
    fallback: number,
  ): number {
    if (!raw) {
      return fallback;
    }

    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }
}
