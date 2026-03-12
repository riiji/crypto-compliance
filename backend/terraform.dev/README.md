# Backend Dev Terraform

Minimal backend dev deployment on Kubernetes.

- Uses `node:24.14.0`
- Can use an Artifact Registry image via `image` in `terraform.tfvars`
- Mounts backend source from host path
- Runs: `corepack enable && pnpm install && pnpm run start:dev`
- Injects default `COMPLIANCE_DB_*` and `COMPLIANCE_VALKEY_*` env vars for
  in-cluster services (overridable via `env`)
- Ingress is enabled by default to avoid `kubectl port-forward`

Tooling baseline:
- Terraform CLI `~> 1.14.6`
- Provider: `hashicorp/kubernetes ~> 3.0.1`

## Usage

```bash
cd terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

## Ingress (no port-forward)

Ingress settings are fixed in the module:
- class: `traefik`
- host: unset (hostless rule)
- HTTP path: `/` with `Prefix`
- gRPC path: `/compliance.ComplianceService` with `Prefix`
- gRPC backend service uses Traefik `h2c`

Apply and check output:

```bash
terraform output ingress_name
terraform output grpc_service_name
terraform output grpc_ingress_path
```
