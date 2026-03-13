# Frontend Service

The frontend is the operator UI for blacklist and whitelist management.

Related docs:

- [Root setup guide](../README.md)
- [Gateway service](../gateway/README.md)
- [Production Terraform](terraform/)
- [Development Terraform](terraform.dev/)

## What This Service Does

The frontend is a Next.js application. It talks to the HTTP gateway, not to the backend directly.

It gives you:

- Username-based admin login backed by a JWT from the gateway
- Local browser session persistence via `localStorage`
- Blacklist and whitelist views
- Policy mutation actions
- Mutation history views

The frontend expects the gateway HTTP endpoints and uses authenticated admin routes for reads and writes.

## Run It Locally

You need:

- Node.js `24.14.0` or newer
- pnpm `10.32.0`
- A reachable gateway HTTP endpoint

Install dependencies and start the dev server:

```bash
pnpm --dir frontend install
pnpm --dir frontend dev
```

Set `BACKEND_API_BASE_URL` if your gateway is not running at the default local address:

- Default: `http://localhost:3001`

Then open `http://localhost:3000`.

## Development On Kubernetes

After the gateway dev stack is up, deploy the frontend dev stack:

```bash
cd /home/ubuntu/crypto-compliance/frontend/terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

The default example already points `BACKEND_API_BASE_URL` at the gateway dev service. This stack mounts your local `frontend/` folder into the pod and runs the Next.js dev server inside Kubernetes.

The default Kubernetes service name is `crypto-compliance-frontend-dev-svc`.

## Production

Deploy the backend first. Then deploy the gateway. Deploy the frontend last:

```bash
cd /home/ubuntu/crypto-compliance/frontend/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
terraform init -migrate-state -backend-config=backend.hcl
terraform plan
terraform apply
```

Production notes:

- `BACKEND_API_BASE_URL` must point at the gateway service, not the backend service.
- The default example points at `crypto-compliance-gateway-svc`.
- CI/CD updates the frontend deployment after the backend and gateway roll out.

## Verify It

Run the linter:

```bash
pnpm --dir frontend lint
```

Open the UI locally:

```bash
kubectl -n default port-forward svc/crypto-compliance-frontend-dev-svc 3000:3000
```

Then browse to `http://localhost:3000`.
