# Crypto Compliance Infrastructure Layout

Repository structure:

- `backend/` - NestJS backend service code and Terraform deployment.
- `gateway/` - NestJS HTTP gateway and Terraform deployment.
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

## 1) Bootstrap production Terraform state bucket (`terraform/bootstrap-state/`)

```bash
cd /home/ubuntu/crypto-compliance/terraform/bootstrap-state
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## 2) Provision shared production infra (`terraform/`)

```bash
cd /home/ubuntu/crypto-compliance/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
# edit project_id, postgres_password, and region/zone
# update terraform/main.tf if you want to change fixed stack defaults
terraform init -migrate-state -backend-config=backend.hcl
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

This root stack is the source of truth for backend/gateway/frontend production lookups through `terraform_remote_state`.
GCS backend is configured via partial `backend "gcs"` and `backend.hcl` per HashiCorp docs:
https://developer.hashicorp.com/terraform/language/backend/gcs

## 3) Deploy backend to GKE (`backend/terraform`)

```bash
cd /home/ubuntu/crypto-compliance/backend/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
# set image, project_id, root_state_bucket, and secrets
terraform init -migrate-state -backend-config=backend.hcl
terraform plan
terraform apply
```

Backend stack resolves at apply time:

- GKE cluster endpoint/CA from root state outputs
- Postgres connection defaults from root state outputs
- Valkey connection defaults from root state outputs

## 4) Deploy gateway to GKE (`gateway/terraform`)

```bash
cd /home/ubuntu/crypto-compliance/gateway/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
# set image, project_id, root_state_bucket, and ingress settings
terraform init -migrate-state -backend-config=backend.hcl
terraform plan
terraform apply
```

Gateway stack resolves the backend gRPC DNS target automatically unless you
override `backend_grpc_url`.

## 5) Deploy frontend to GKE (`frontend/terraform`)

```bash
cd /home/ubuntu/crypto-compliance/frontend/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
# set image, project_id, root_state_bucket, and env
terraform init -migrate-state -backend-config=backend.hcl
terraform plan
terraform apply
```

## Suggested order

1. Bootstrap state bucket (`terraform/bootstrap-state/`)
2. Root infra (`terraform/`)
3. Backend (`backend/terraform`)
4. Gateway (`gateway/terraform`)
5. Frontend (`frontend/terraform`)

## Development

For Kubernetes hot-reload development workflows:

- `terraform.dev/` (dev Postgres + Valkey)
- `backend/terraform.dev/`
- `gateway/terraform.dev/`
- `frontend/terraform.dev/`

## GitHub Actions CI/CD (GKE)

Workflows:
- `.github/workflows/build-push-images.yml`
- `.github/workflows/deploy-gke.yml`

`build-push-images.yml`:
- Triggered on push to `main` and manually via **Actions** UI.
- Runs backend tests, gateway tests, and frontend lint.
- Builds backend/gateway/frontend images and pushes to Artifact Registry.
- Manual run supports custom `image_tag` and optional `push_latest`.

`deploy-gke.yml`:
- Triggered manually via **Actions** UI with `image_tag`.
- Also auto-runs after successful **push-triggered** `build-push-images.yml` and deploys the matching short-SHA tag.
- Updates backend image, runs backend TypeORM migrations against production DB, then waits for backend rollout.
- Updates gateway deployment and waits for rollout.
- Updates frontend deployment and waits for rollout.

Required repository secrets:

- `GCP_PROJECT_ID`
- `GCP_SA_KEY`

GitHub Actions deployer service account is now provisioned by root Terraform:

- output: `github_actions_service_account_email`
- default roles:
  - `roles/container.developer`
  - `roles/serviceusage.serviceUsageConsumer`
- Artifact Registry repository is created by root Terraform module:
  - defaults: `crypto-compliance` in `us-central1`
- explicit repository IAM binding:
  - repository: `crypto-compliance` in the configured `region`
  - role: `roles/artifactregistry.writer`

Create a JSON key for that service account and store it as `GCP_SA_KEY`:

```bash
cd /home/ubuntu/crypto-compliance/terraform
gcloud iam service-accounts keys create ./github-actions-sa-key.json \
  --iam-account "$(terraform output -raw github_actions_service_account_email)"
```

Recommended repository variables (defaults are set in workflow):

- `GCP_REGION` (default `us-central1`)
- `GCP_ARTIFACT_REPOSITORY` (default `crypto-compliance`)
- `GKE_CLUSTER_NAME` (default `crypto-compliance-gke`)
- `GKE_LOCATION` (default `us-central1-a`)
- `GKE_NAMESPACE` (default `crypto-compliance`)

Expected Kubernetes deployment names:

- backend: `crypto-compliance-backend`
- gateway: `crypto-compliance-gateway`
- frontend: `crypto-compliance-frontend`
