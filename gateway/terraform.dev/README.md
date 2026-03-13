# Gateway Dev Terraform

Minimal gateway dev deployment on Kubernetes.

- Uses `node:24.14.0`
- Can use an Artifact Registry image via `image` in `terraform.tfvars`
- Mounts gateway source from host path
- Runs: `corepack enable && pnpm install && pnpm run start:dev`
- Injects `COMPLIANCE_BACKEND_GRPC_URL` automatically for the backend dev service
- Injects `COMPLIANCE_ADMIN_JWT_SECRET` and `COMPLIANCE_INTERNAL_HMAC_SECRET`

Tooling baseline:
- Terraform CLI `~> 1.14.6`
- Provider: `hashicorp/kubernetes ~> 3.0.1`

## Usage

```bash
cd /home/ubuntu/crypto-compliance/gateway/terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```
