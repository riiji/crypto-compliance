# Terraform Bootstrap State (Production)

This stack creates the dedicated GCS bucket used as remote Terraform state for production stacks.
Backend type used by other stacks is `gcs` per HashiCorp docs:
https://developer.hashicorp.com/terraform/language/backend/gcs

## What it creates

- `google_storage_bucket` with:
  - versioning enabled
  - uniform bucket-level access enabled
  - public access prevention enforced
  - `force_destroy = false`

## Usage

```bash
cd /home/ubuntu/crypto-compliance/terraform/bootstrap-state
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```
