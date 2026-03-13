# Frontend Terraform (GKE)

This folder deploys the frontend service to an existing GKE cluster and reads
cluster details from root Terraform remote state.

## What it creates

- `kubernetes_deployment_v1` for frontend pods
- `kubernetes_service_v1` for frontend traffic
- `kubernetes_manifest` `BackendConfig` for frontend health checks
- `kubernetes_ingress_v1` for public HTTP access with a GKE external IP
- Namespace resolution (create or read existing)

## State and data lookups

- `data.terraform_remote_state.root` for GKE cluster name/location
- `data.google_container_cluster` for GKE endpoint/CA (Kubernetes provider auth)

If the root remote state does not yet export `gke_cluster_name` and
`gke_location`, either re-apply the root stack or set `gke_cluster_name` and
`gke_location` explicitly in frontend Terraform variables.

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

## Public ingress

This stack creates a public GKE ingress for the frontend. After `terraform apply`,
get the external address with:

```bash
terraform output ingress_load_balancer_ip
terraform output ingress_load_balancer_hostname
```

Use `ingress_host` if you want a host-based rule, and `ingress_annotations` if
you want to attach a reserved global static IP.
