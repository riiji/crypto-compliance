# Backend Terraform (GKE)

This folder deploys the backend service to an existing GKE cluster and auto-resolves
Cloud SQL + Memorystore for Valkey connection endpoints.

## What it creates

- `kubernetes_deployment_v1` for backend pods
- `kubernetes_service_v1` for backend traffic
- Namespace resolution (create or read existing)

## Cloud data lookups

- `data.google_container_cluster` for GKE endpoint/CA (Kubernetes provider auth)
- `data.google_sql_database_instance` for Postgres private IP
- `data.google_memorystore_instance` for Valkey endpoint address/port

## Usage

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Required variables

- `project_id`
- `gke_cluster_name`
- `gke_location` (exact region/zone, e.g. `us-central1` or `us-central1-a`; avoid trailing `-`)
- `postgres_instance_name`
- `postgres_password`
- `valkey_instance_id`
- `valkey_location`
