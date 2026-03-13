# Crypto Compliance

This repository has three services:

- [`backend/`](backend/README.md) handles compliance checks, policy storage, caching, queueing, and gRPC APIs.
- [`gateway/`](gateway/README.md) exposes HTTP endpoints and forwards requests to the gRPC backend.
- [`frontend/`](frontend/README.md) gives you a web UI for blacklist and whitelist operations.

Runtime path:

```text
Frontend (HTTP UI)
  -> Gateway (HTTP/JSON)
    -> Backend (gRPC)
      -> Provider, Postgres, Valkey
```

Infrastructure directories:

- [`terraform/`](terraform/) provisions shared production infrastructure on GCP.
- [`terraform.dev/`](terraform.dev/) provisions local development data services on Kubernetes.
- [`backend/loadtest/`](backend/loadtest/README.md) contains gRPC load-test tooling.

## Install Prerequisites

### Local machine

Install these first:

- [Git](https://git-scm.com/downloads)
- [Docker Engine](https://docs.docker.com/engine/install/)
- [Node.js](https://nodejs.org/) `24.14.0` or newer
- [K3s](https://k3s.io/) and the [K3s installation guide](https://docs.k3s.io/installation)
- [Terraform CLI](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)

K3s uses containerd by default. You still want Docker for building and inspecting images.

### Clone the repository

Clone the project before you start the local setup:

```bash
cd /home/ubuntu
git clone <repository-url> crypto-compliance
cd /home/ubuntu/crypto-compliance
```

The commands below assume the repository lives at `/home/ubuntu/crypto-compliance`. If you clone it into another directory, adjust the paths in the examples.

### Prepare kubeconfig for K3s

K3s writes its kubeconfig to `/etc/rancher/k3s/k3s.yaml`.

For local development only, make it readable before running local `kubectl` commands:

```bash
sudo chmod 644 /etc/rancher/k3s/k3s.yaml
```

Then copy it into your home directory so Terraform and `kubectl` use the same cluster:

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown "$(id -u)":"$(id -g)" ~/.kube/config
kubectl get nodes
```

If `kubectl get nodes` shows a ready node, continue.

## Local Development On K3s

### 1. Start data services

Start Postgres and Valkey first:

```bash
cd /home/ubuntu/crypto-compliance/terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

You usually only need to change `namespace` and `postgres_password` in [`terraform.dev/terraform.tfvars.example`](terraform.dev/terraform.tfvars.example).

### 2. Start the application services

Deploy the backend first. Set the provider URL and API key in `backend/terraform.dev/terraform.tfvars` before you apply:

```hcl
compliance_api_url = "https://api.example.com/v1/compliance-check"

env = {
  COMPLIANCE_API_KEY = "replace-me"
}
```

Then apply the three dev stacks in this order:

```bash
cd /home/ubuntu/crypto-compliance/backend/terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply

cd /home/ubuntu/crypto-compliance/gateway/terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply

cd /home/ubuntu/crypto-compliance/frontend/terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

These dev stacks mount your local source tree into Kubernetes pods and run the services in watch mode.

### 3. Run backend migrations

After the backend dev pod is ready, run the TypeORM migrations inside the pod:

```bash
kubectl -n default rollout status deployment/crypto-compliance-backend-dev
kubectl -n default exec deployment/crypto-compliance-backend-dev -- sh -lc 'cd /workspace && npm run db:migration:run'
```

To inspect migration status:

```bash
kubectl -n default exec deployment/crypto-compliance-backend-dev -- sh -lc 'cd /workspace && npm run db:migration:show'
```

If you changed `namespace` or `app_name` in `backend/terraform.dev/terraform.tfvars`, adjust the `kubectl` commands accordingly.

### 4. Access the services

Port-forward the services from another terminal:

```bash
kubectl -n default port-forward svc/crypto-compliance-frontend-dev-svc 3000:3000
kubectl -n default port-forward svc/crypto-compliance-gateway-dev-svc 3001:3000
kubectl -n default port-forward svc/crypto-compliance-backend-dev-grpc-svc 50051:50051
```

Now use the stack:

- Open `http://localhost:3000`
- Call `http://localhost:3001/healthz`
- Call the backend with `grpcurl`

Smoke test commands:

```bash
curl http://localhost:3001/healthz
grpcurl -plaintext localhost:50051 list
```

For gRPC performance tests, use [`backend/loadtest/README.md`](backend/loadtest/README.md).

## Production Deployment On GCP

### 1. Install prerequisites

On the machine you use for production provisioning and rollouts, install these first:

- [Git](https://git-scm.com/downloads)
- [Docker Engine](https://docs.docker.com/engine/install/)
- [Terraform CLI](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
- `kubectl`

Authenticate `gcloud` before you run any production Terraform or `kubectl` commands:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_GCP_PROJECT_ID
gcloud auth list
```

If `gcloud auth list` shows the account you want to use, continue.

### 2. Provision shared infrastructure

Apply the bootstrap stack first. It creates the GCS bucket used as the remote Terraform backend for the other production stacks:

```bash
cd /home/ubuntu/crypto-compliance/terraform/bootstrap-state
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Then provision the shared production stack:

```bash
cd /home/ubuntu/crypto-compliance/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
terraform init -migrate-state -backend-config=backend.hcl
terraform plan
terraform apply
```

This root stack creates the GKE cluster, network, Cloud SQL, Memorystore, and the GitHub Actions deployer identity.

### 3. Build and deploy the services

Deployment paths:

- Use GitHub Actions in [`.github/workflows/build-push-images.yml`](.github/workflows/build-push-images.yml) and [`.github/workflows/deploy-gke.yml`](.github/workflows/deploy-gke.yml)
- Build and apply the service stacks manually

Manual rollout order:

1. [`backend/terraform`](backend/terraform/)
2. [`gateway/terraform`](gateway/terraform/)
3. [`frontend/terraform`](frontend/terraform/)

Apply them in that order:

```bash
cd /home/ubuntu/crypto-compliance/backend/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
terraform init -migrate-state -backend-config=backend.hcl
terraform plan
terraform apply

cd /home/ubuntu/crypto-compliance/gateway/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
terraform init -migrate-state -backend-config=backend.hcl
terraform plan
terraform apply

cd /home/ubuntu/crypto-compliance/frontend/terraform
cp terraform.tfvars.example terraform.tfvars
cp backend.hcl.example backend.hcl
terraform init -migrate-state -backend-config=backend.hcl
terraform plan
terraform apply
```

Production notes:

- The backend is internal by default. It exposes gRPC as a Kubernetes service.
- The gateway and frontend each have their own public GKE Ingress resources.
- The frontend talks to the gateway, not to the backend.
- GitHub Actions runs backend migrations before it completes the backend rollout.

### 4. Verify the production stack

Check the rollouts:

```bash
kubectl -n crypto-compliance get deploy,svc,ing
```

To call the backend with `grpcurl`, port-forward the gRPC service:

```bash
kubectl -n crypto-compliance port-forward svc/crypto-compliance-backend-grpc-svc 50051:50051
grpcurl -plaintext localhost:50051 list
```

## FAQ

### Do I need GCP for local development?

No. Use K3s with [`terraform.dev/`](terraform.dev/), [`backend/terraform.dev/`](backend/terraform.dev/), [`gateway/terraform.dev/`](gateway/terraform.dev/), and [`frontend/terraform.dev/`](frontend/terraform.dev/).

### Why does the frontend call the gateway instead of the backend?

Because the backend is gRPC-only. The gateway owns HTTP.

### Where do I set the provider URL and API key?

Set `compliance_api_url` in `backend/terraform.dev/terraform.tfvars` for local Kubernetes development and in `backend/terraform/terraform.tfvars` for production. Set `COMPLIANCE_API_KEY` in the backend environment through the `env` map in those same tfvars files, or inject it through your secret management flow.

### Do I need Docker if K3s already includes containerd?

Yes. Use Docker to build and inspect images.

### How do I test the backend directly?

Port-forward the gRPC service and use `grpcurl`.

### What order should I deploy production services?

Deploy shared infrastructure first. Then deploy backend, gateway, and frontend.
