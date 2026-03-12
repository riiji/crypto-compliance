# Frontend Terraform (GKE)

This folder deploys the frontend service to an existing GKE cluster.

## What it creates

- `kubernetes_deployment_v1` for frontend pods
- `kubernetes_service_v1` for frontend traffic

## Cloud data lookups

- `data.google_container_cluster` for GKE endpoint/CA (Kubernetes provider auth)

## Usage

Tooling baseline:
- Terraform CLI `~> 1.14.6`
- Providers: `hashicorp/google ~> 7.23.0`, `hashicorp/kubernetes ~> 3.0.1`

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
