# Gateway Terraform (GKE)

This folder deploys the HTTP gateway service to an existing GKE cluster and
reads cluster details from root Terraform remote state.

## What it creates

- `kubernetes_deployment_v1` for gateway pods
- `kubernetes_service_v1` for gateway HTTP traffic
- `kubernetes_manifest` `BackendConfig` for `/healthz`
- `kubernetes_ingress_v1` for public HTTP access with a GKE external IP
- Namespace resolution (create or read existing)

## State and data lookups

- `data.terraform_remote_state.root` for GKE cluster name/location
- `data.google_container_cluster` for GKE endpoint/CA (Kubernetes provider auth)

## Usage

Tooling baseline:
- Terraform CLI `~> 1.14.6`
- Providers: `hashicorp/google ~> 7.23.0`, `hashicorp/kubernetes ~> 3.0.1`
- GCS backend uses partial backend config + `backend.hcl`

```bash
cd /home/ubuntu/crypto-compliance/gateway/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
terraform init
terraform plan
terraform apply
```

## Required variables

- `project_id`
- `root_state_bucket`

## Backend target

By default the gateway targets:

```text
<backend_app_name>-grpc-svc.<namespace>.svc.cluster.local:<backend_grpc_port>
```

Override it with `backend_grpc_url` if you need an explicit host:port.

## Public ingress

This stack already creates a public GKE ingress for the gateway. After
`terraform apply`, get the external address with:

```bash
terraform output ingress_load_balancer_ip
terraform output ingress_load_balancer_hostname
```

Use `ingress_host` if you want a host-based rule, and `ingress_annotations` if
you want to attach a reserved global static IP.
