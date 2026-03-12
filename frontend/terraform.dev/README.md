# Frontend Dev Terraform

Minimal frontend dev deployment on Kubernetes.

- Uses `node:24.14.0`
- Mounts frontend source from host path
- Runs: `corepack enable && pnpm install && pnpm dev --hostname 0.0.0.0 --port 3000`

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
