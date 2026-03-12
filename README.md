# Crypto Compliance Infrastructure Layout

Repository structure:

- `backend/` - NestJS backend service code and Terraform deployment.
- `frontend/` - frontend UI project and Terraform deployment.
- `terraform/` - production/shared infrastructure on Google Cloud (GKE, Cloud SQL Postgres 18, Memorystore for Valkey).
- `terraform.dev/` - lightweight development data services on Kubernetes.

## Requirements

- Terraform `>= 1.5`
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

Workflow: `.github/workflows/deploy-gke.yml`

On push to `main`, it:

- Runs backend tests and frontend lint
- Builds backend and frontend container images
- Pushes both images to Artifact Registry
- Updates both Kubernetes deployments in GKE and waits for rollout

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
