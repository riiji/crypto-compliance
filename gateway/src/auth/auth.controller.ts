import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
} from "@nestjs/common";
import { z } from "zod";
import { JwtAuthService, type LoginResponseDto } from "./jwt-auth.service";

const loginBodySchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username must not be empty")
    .max(64, "Username is too long"),
});

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly jwtAuthService: JwtAuthService) {}

  @Post("login")
  login(@Body() body: unknown): LoginResponseDto {
    const parsed = loginBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues[0]?.message ?? "Invalid login body",
      );
    }

    const result = this.jwtAuthService.issueToken(parsed.data.username);
    this.logger.log(`Issued admin token for username=${result.username}`);
    return result;
  }
}
