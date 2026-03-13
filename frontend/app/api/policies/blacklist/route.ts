import { NextResponse } from 'next/server';
import {
  fetchPolicyList,
  mutatePolicy,
  requireAuthorizationHeader,
  UpstreamApiError,
} from '@/lib/policy-api';

interface PolicyMutationBody {
  address?: string;
  network?: string;
  confirmPolicySwitch?: boolean;
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

function validateBody(body: PolicyMutationBody): {
  address: string;
  network: string;
  confirmPolicySwitch: boolean;
} {
  const address = body.address?.trim() ?? '';
  const network = body.network?.trim() ?? '';

  if (!address) {
    throw new UpstreamApiError('Address is required', 400);
  }

  if (!network) {
    throw new UpstreamApiError('Network is required', 400);
  }

  if (
    body.confirmPolicySwitch !== undefined &&
    typeof body.confirmPolicySwitch !== 'boolean'
  ) {
    throw new UpstreamApiError('confirmPolicySwitch must be a boolean', 400);
  }

  return {
    address,
    network,
    confirmPolicySwitch: body.confirmPolicySwitch ?? false,
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const authorization = requireAuthorizationHeader(request);
    const data = await fetchPolicyList('blacklist', authorization);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const authorization = requireAuthorizationHeader(request);
    const body = (await request.json()) as PolicyMutationBody;
    const validated = validateBody(body);

    const data = await mutatePolicy({
      policy: 'blacklist',
      action: 'add',
      address: validated.address,
      network: validated.network,
      authorization,
      confirmPolicySwitch: validated.confirmPolicySwitch,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const authorization = requireAuthorizationHeader(request);
    const body = (await request.json()) as PolicyMutationBody;
    const validated = validateBody(body);

    const data = await mutatePolicy({
      policy: 'blacklist',
      action: 'remove',
      address: validated.address,
      network: validated.network,
      authorization,
      confirmPolicySwitch: validated.confirmPolicySwitch,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return errorResponse(error);
  }
}
