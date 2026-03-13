import { NextResponse } from 'next/server';
import {
  fetchPolicyHistory,
  requireAuthorizationHeader,
  UpstreamApiError,
} from '@/lib/policy-api';

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

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authorization = requireAuthorizationHeader(request);
    const url = new URL(request.url);
    const limitRaw = url.searchParams.get('limit');
    const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    const limit =
      parsedLimit && Number.isInteger(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : undefined;

    const data = await fetchPolicyHistory(authorization, limit);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
