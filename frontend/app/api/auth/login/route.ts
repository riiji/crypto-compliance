import { NextResponse } from 'next/server';
import { loginWithUsername, UpstreamApiError } from '@/lib/policy-api';

interface LoginBody {
  username?: string;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof UpstreamApiError) {
    return NextResponse.json(
      { message: error.message, details: error.details ?? null },
      { status: error.status },
    );
  }

  return NextResponse.json(
    { message: 'Unexpected server error' },
    { status: 500 },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as LoginBody;
    const username = body.username?.trim() ?? '';
    if (!username) {
      throw new UpstreamApiError('Username is required', 400);
    }

    const data = await loginWithUsername(username);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
