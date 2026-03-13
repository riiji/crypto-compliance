# Backend Service

The backend owns the compliance domain. It talks to the provider, writes history, evaluates risk, manages cache and idempotency, and exposes gRPC.

Related docs:

- [Root setup guide](../README.md)
- [Production Terraform](terraform/)
- [Development Terraform](terraform.dev/)
- [gRPC load testing](loadtest/README.md)

## What This Service Does

The backend exposes these gRPC methods:

- `CheckAddressCompliance`
- `ListCompliancePolicies`
- `ListCompliancePolicyMutationHistory`
- `SecureMutateCompliancePolicy`
- `TrustedMutateCompliancePolicy`

It also owns:

- Postgres persistence for compliance history and policy mutations
- Valkey-backed cache and locks
- BullMQ provider execution
- gRPC server reflection for `grpcurl` and similar tools

The backend does not expose HTTP. The [`gateway/`](../gateway/README.md) service owns HTTP.

## Run It Locally

You need:

- Node.js `24.14.0` or newer
- pnpm `10.32.0`
- Postgres
- Valkey
- A `COMPLIANCE_API_KEY`
- A `COMPLIANCE_API_URL`

Install dependencies and run migrations:

```bash
pnpm --dir backend install
pnpm --dir backend db:migration:run
```

Set the required environment variables:

- `COMPLIANCE_DB_HOST`
- `COMPLIANCE_DB_PORT`
- `COMPLIANCE_DB_USER`
- `COMPLIANCE_DB_PASSWORD`
- `COMPLIANCE_DB_NAME`
- `COMPLIANCE_VALKEY_HOST`
- `COMPLIANCE_VALKEY_PORT`
- `COMPLIANCE_API_KEY`
- `COMPLIANCE_API_URL`

Useful optional variables:

- `COMPLIANCE_GRPC_PORT`
- `COMPLIANCE_POLICY_HMAC_SECRET`
- `COMPLIANCE_INTERNAL_HMAC_SECRET`
- `COMPLIANCE_INTERNAL_SIGNATURE_MAX_PAST_SECONDS`
- `COMPLIANCE_INTERNAL_SIGNATURE_MAX_FUTURE_SECONDS`
- `COMPLIANCE_CACHE_TTL_SECONDS`

Start the service:

```bash
pnpm --dir backend start:dev
```

The default gRPC port is `50051`.

## Development On Kubernetes

Once the shared dev data services are up, deploy the backend dev stack:

```bash
cd /home/ubuntu/crypto-compliance/backend/terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

Before you apply, set the provider URL and API key in `terraform.tfvars`:

```hcl
compliance_api_url = "https://api.example.com/v1/compliance-check"

env = {
  COMPLIANCE_API_KEY = "replace-me"
}
```

This stack mounts your local `backend/` folder into the pod and runs watch mode. The gRPC service appears as `crypto-compliance-backend-dev-grpc-svc` by default.

## Production

Apply the shared production stack first. Then deploy the backend service:

```bash
cd /home/ubuntu/crypto-compliance/backend/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
terraform init -migrate-state -backend-config=backend.hcl
terraform plan
terraform apply
```

Production notes:

- The backend service is internal by default.
- `service_type` defaults to `ClusterIP`.
- Set `service_type = "LoadBalancer"` only if you want direct external gRPC access.
- The gateway uses the backend gRPC service DNS name by default.
- Trusted admin mutations require a matching internal HMAC signature from the gateway.

## Verify It

Run the test suite:

```bash
pnpm --dir backend test --runInBand
pnpm --dir backend build
```

Verify gRPC reflection:

```bash
kubectl -n default port-forward svc/crypto-compliance-backend-dev-grpc-svc 50051:50051
grpcurl -plaintext localhost:50051 list
```

For throughput checks, use [loadtest/README.md](loadtest/README.md).
