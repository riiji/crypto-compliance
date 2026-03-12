# Root Terraform Dev

This directory deploys minimal data services for development.

Resources:

- `module.postgres` (`./modules/postgres`)
- `module.valkey` (`./modules/valkey`)

## Usage

```bash
cd terraform.dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform apply
```

Defaults are built in for most Postgres/Valkey settings. You usually only need to set `namespace` and `postgres_password`.

## Outputs

- `postgres_host`
- `postgres_port`
- `postgres_db`
- `postgres_user`
- `valkey_host`
- `valkey_port`
