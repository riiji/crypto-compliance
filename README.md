# Crypto Compliance Infrastructure Layout

Repository structure:

- `backend/` - NestJS backend service code and Terraform deployment.
- `frontend/` - frontend UI project and Terraform deployment.
- `terraform/` - production/shared infrastructure on Google Cloud (GKE, Cloud SQL Postgres 18, Memorystore for Valkey).
- `terraform.dev/` - lightweight development data services on Kubernetes.

## Version Matrix

- Node.js: `>= 24.14.0` (baseline `24.14.0`)
- pnpm: `>= 10.32.0` (baseline `10.32.0`)
- Terraform CLI: `~> 1.14.6`
- kubectl (upstream client): `v1.34.5`
- Terraform providers:
  - `hashicorp/google ~> 7.23.0`
  - `hashicorp/kubernetes ~> 3.0.1`

## Requirements

- Terraform `~> 1.14.6`
- Google Cloud project with billing enabled
- Credentials configured for Terraform (`GOOGLE_APPLICATION_CREDENTIALS` or `gcloud auth application-default login`)
- Container images published and reachable by GKE

## 1) Provision shared production infra (`terraform/`)

```bash
cd /home/ubuntu/crypto-compliance/terraform
cp terraform.tfvars.example terraform.tfvars
# edit project_id, passwords, sizing, regions/zones
terraform init
terraform plan
terraform apply
```

This creates module-based infrastructure:

- Required GCP API enablement (`google_project_service`)
- VPC + subnet + secondary ranges for GKE
- GKE cluster + node pool
- Cloud SQL PostgreSQL 18 (private IP)
- Memorystore for Valkey

Note: default Cloud SQL edition is `ENTERPRISE` so `db-custom-*` tiers work. If you switch to `ENTERPRISE_PLUS`, use a `db-perf-optimized-N-*` tier.

Use outputs from this stack for app stacks (`gke_cluster_name`, `gke_location`, `postgres_instance_name`, `valkey_instance_id`, etc.).

## 2) Deploy backend to GKE (`backend/terraform`)

```bash
cd /home/ubuntu/crypto-compliance/backend/terraform
cp terraform.tfvars.example terraform.tfvars
# set image, project_id, cluster and datastore instance IDs
terraform init
terraform plan
terraform apply
```

Backend stack resolves at apply time:

- GKE cluster endpoint/CA for Kubernetes provider
- Cloud SQL private IP for `COMPLIANCE_DB_HOST`
- Memorystore endpoint for `COMPLIANCE_VALKEY_HOST`

## 3) Deploy frontend to GKE (`frontend/terraform`)

```bash
cd /home/ubuntu/crypto-compliance/frontend/terraform
cp terraform.tfvars.example terraform.tfvars
# set image and backend URL env
terraform init
terraform plan
terraform apply
```

## Suggested order

1. Root infra (`terraform/`)
2. Backend (`backend/terraform`)
3. Frontend (`frontend/terraform`)

## Development

For Kubernetes hot-reload development workflows:

- `terraform.dev/` (dev Postgres + Valkey)
- `backend/terraform.dev/`
- `frontend/terraform.dev/`

## GitHub Actions CI/CD (GKE)

Workflows:
- `.github/workflows/build-push-images.yml`
- `.github/workflows/deploy-gke.yml`

`build-push-images.yml`:
- Triggered on push to `main` and manually via **Actions** UI.
- Runs backend tests + frontend lint.
- Builds backend/frontend images and pushes to Artifact Registry.
- Manual run supports custom `image_tag` and optional `push_latest`.

`deploy-gke.yml`:
- Triggered manually via **Actions** UI with `image_tag`.
- Also auto-runs after successful **push-triggered** `build-push-images.yml` and deploys the matching short-SHA tag.
- Updates both GKE deployments and waits for rollout.

Required repository secrets:

- `GCP_PROJECT_ID`
- `GCP_SA_KEY`

Recommended repository variables (defaults are set in workflow):

- `GCP_REGION` (default `us-central1`)
- `GCP_ARTIFACT_REPOSITORY` (default `crypto-compliance`)
- `GKE_CLUSTER_NAME` (default `crypto-compliance-gke`)
- `GKE_LOCATION` (default `us-central1-a`)
- `GKE_NAMESPACE` (default `crypto-compliance`)

Expected Kubernetes deployment names:

- backend: `crypto-compliance-backend`
- frontend: `crypto-compliance-frontend`
