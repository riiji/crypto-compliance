# Crypto Compliance Frontend

Next.js app for managing compliance blacklist/whitelist entries.

## Features

- View blacklist and whitelist entries
- Add and remove addresses in both lists
- View policy mutation history

Frontend mutations go through unsigned admin policy endpoints.
The HTTP surface is provided by the separate `gateway/` service, which forwards
requests to the gRPC backend.

## Requirements

- Node.js `>= 24.14.0` (baseline `24.14.0`)
- pnpm `>= 10.32.0` (baseline `10.32.0`)

## Required Environment Variables

- `BACKEND_API_BASE_URL` (default: `http://localhost:3001`)

## Local Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Kubernetes

- Production Terraform: `frontend/terraform`
- Dev Terraform (node:24.14.0 + host mount): `frontend/terraform.dev`

See README files inside those directories for usage.
