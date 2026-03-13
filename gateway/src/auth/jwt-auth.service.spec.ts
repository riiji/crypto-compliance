import { UnauthorizedException } from "@nestjs/common";
import { JwtAuthService } from "./jwt-auth.service";

describe("JwtAuthService", () => {
  const originalSecret = process.env.COMPLIANCE_ADMIN_JWT_SECRET;
  let service: JwtAuthService;

  beforeEach(() => {
    process.env.COMPLIANCE_ADMIN_JWT_SECRET = "gateway-test-secret";
    service = new JwtAuthService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.COMPLIANCE_ADMIN_JWT_SECRET;
    } else {
      process.env.COMPLIANCE_ADMIN_JWT_SECRET = originalSecret;
    }
  });

  it("issues and validates a signed token", () => {
    jest.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    const result = service.issueToken("alice");
    const user = service.verifyToken(result.accessToken);

    expect(user).toEqual({
      username: "alice",
    });
    expect(result.expiresAt).toBe("2023-11-15T10:13:20.000Z");
  });

  it("rejects a token with a modified signature", () => {
    const result = service.issueToken("alice");
    const tamperedToken = `${result.accessToken.slice(0, -1)}x`;

    expect(() => service.verifyToken(tamperedToken)).toThrow(
      UnauthorizedException,
    );
  });
});
