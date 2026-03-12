# Frontend Terraform (GKE)

This folder deploys the frontend service to an existing GKE cluster.

## What it creates

- `kubernetes_deployment_v1` for frontend pods
- `kubernetes_service_v1` for frontend traffic

## Cloud data lookups

- `data.google_container_cluster` for GKE endpoint/CA (Kubernetes provider auth)

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
- `gke_location`
