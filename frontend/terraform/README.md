# Frontend Terraform (GKE)

This folder deploys the frontend service to an existing GKE cluster and reads
cluster details from root Terraform remote state.

## What it creates

- `kubernetes_deployment_v1` for frontend pods
- `kubernetes_service_v1` for frontend traffic

## State and data lookups

- `data.terraform_remote_state.root` for GKE cluster name/location
- `data.google_container_cluster` for GKE endpoint/CA (Kubernetes provider auth)

## Usage

Tooling baseline:
- Terraform CLI `~> 1.14.6`
- Providers: `hashicorp/google ~> 7.23.0`, `hashicorp/kubernetes ~> 3.0.1`
- GCS backend uses partial backend config + `backend.hcl` (see HashiCorp guide: https://developer.hashicorp.com/terraform/language/backend/gcs)

```bash
cd /home/ubuntu/crypto-compliance/frontend/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
terraform init
terraform plan
terraform apply
```

To migrate existing local state to GCS:

```bash
terraform init -migrate-state -backend-config=backend.hcl
```

## Required variables

- `project_id`
- `root_state_bucket`
