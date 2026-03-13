# Backend Terraform (GKE)

This folder deploys the backend service to an existing GKE cluster and reads
infrastructure values from root Terraform remote state.

## What it creates

- `kubernetes_deployment_v1` for backend pods
- `kubernetes_service_v1` for backend gRPC traffic
- Namespace resolution (create or read existing)

## State and data lookups

- `data.terraform_remote_state.root` for:
  - GKE cluster name/location
  - Postgres host/port/db/user
  - Valkey host/port
- `data.google_container_cluster` for GKE endpoint/CA (Kubernetes provider auth)

## Usage

Tooling baseline:
- Terraform CLI `~> 1.14.6`
- Providers: `hashicorp/google ~> 7.23.0`, `hashicorp/kubernetes ~> 3.0.1`
- GCS backend uses partial backend config + `backend.hcl` (see HashiCorp guide: https://developer.hashicorp.com/terraform/language/backend/gcs)

```bash
cd /home/ubuntu/crypto-compliance/backend/terraform
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
- `postgres_password`

## gRPC exposure

By default the backend is deployed as an internal `ClusterIP` gRPC service.
Set `service_type = "LoadBalancer"` if you want direct external gRPC access.

Apply and read gRPC outputs:

```bash
terraform apply
terraform output grpc_service_name
terraform output grpc_load_balancer_ip
terraform output grpc_load_balancer_hostname
```
