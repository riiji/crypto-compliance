# Backend Dev Terraform

Minimal backend dev deployment on Kubernetes.

- Uses `node:24`
- Mounts backend source from host path
- Runs: `corepack enable && pnpm install && pnpm run start:dev`
- Injects default `COMPLIANCE_DB_*` and `COMPLIANCE_VALKEY_*` env vars for
  in-cluster services (overridable via `env`)

## Usage

```bash
cd terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```
