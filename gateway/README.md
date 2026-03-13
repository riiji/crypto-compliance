# Gateway Service

The gateway is the HTTP edge. It accepts HTTP requests, validates headers and bodies, calls the backend over gRPC, and returns HTTP responses.

Related docs:

- [Root setup guide](../README.md)
- [Backend service](../backend/README.md)
- [Production Terraform](terraform/)
- [Development Terraform](terraform.dev/)

## What This Service Does

The gateway exposes these HTTP routes:

- `POST /auth/login`
- `POST|DELETE /compliance/policies/blacklist`
- `POST|DELETE /compliance/policies/whitelist`
- `GET /compliance/admin/policies/blacklist`
- `GET /compliance/admin/policies/whitelist`
- `GET /compliance/admin/policies/history`
- `POST|DELETE /compliance/admin/policies/blacklist`
- `POST|DELETE /compliance/admin/policies/whitelist`
- `GET /healthz`

The gateway does not own compliance logic. The backend does.

## Run It Locally

You need:

- Node.js `24.14.0` or newer
- pnpm `10.32.0`
- A reachable backend gRPC endpoint

Install dependencies:

```bash
pnpm --dir gateway install
```

Set the environment:

- `PORT` defaults to `3001`
- `COMPLIANCE_BACKEND_GRPC_URL` defaults to `127.0.0.1:50051`
- `COMPLIANCE_ADMIN_JWT_SECRET` is required for admin login and bearer validation
- `COMPLIANCE_INTERNAL_HMAC_SECRET` is required to sign trusted gateway-to-backend gRPC mutations

Start the service:

```bash
pnpm --dir gateway start:dev
```

If the backend is running locally on its default port, you usually do not need to set anything else.

## Development On Kubernetes

After the backend dev stack is up, deploy the gateway dev stack:

```bash
cd /home/ubuntu/crypto-compliance/gateway/terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

This stack mounts your local `gateway/` folder into the pod and runs watch mode. It sets `COMPLIANCE_BACKEND_GRPC_URL` automatically.
Set `admin_jwt_secret` and `internal_hmac_secret` in `terraform.tfvars` before you apply.

The default Kubernetes service name is `crypto-compliance-gateway-dev-svc`.

## Production

Deploy the backend first. Then deploy the gateway:

```bash
cd /home/ubuntu/crypto-compliance/gateway/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
terraform init -migrate-state -backend-config=backend.hcl
terraform plan
terraform apply
```

Production notes:

- The gateway owns public HTTP ingress.
- The gateway uses a GKE `Ingress` plus `BackendConfig` for `/healthz`.
- The gateway computes the backend gRPC DNS target automatically.
- The gateway signs trusted admin mutations before forwarding them to the backend gRPC service.
- Override `backend_grpc_url` only if you need a non-default backend target.

## Verify It

Run the test suite:

```bash
pnpm --dir gateway test --runInBand
pnpm --dir gateway build
```

Smoke test the HTTP edge:

```bash
kubectl -n default port-forward svc/crypto-compliance-gateway-dev-svc 3001:3000
curl http://localhost:3001/healthz
```
