output "namespace" {
  description = "Namespace where dev data services are deployed."
  value       = var.namespace
}

output "postgres_deployment_name" {
  description = "Postgres Deployment name."
  value       = module.postgres.deployment_name
}

output "postgres_service_name" {
  description = "Postgres Service name."
  value       = module.postgres.service_name
}

output "postgres_host" {
  description = "Postgres DNS host inside cluster."
  value       = module.postgres.host
}

output "postgres_port" {
  description = "Postgres service port."
  value       = module.postgres.port
}

output "postgres_db" {
  description = "Postgres database name."
  value       = module.postgres.db
}

output "postgres_user" {
  description = "Postgres username."
  value       = module.postgres.user
}

output "valkey_deployment_name" {
  description = "Valkey Deployment name."
  value       = module.valkey.deployment_name
}

output "valkey_service_name" {
  description = "Valkey Service name."
  value       = module.valkey.service_name
}

output "valkey_host" {
  description = "Valkey DNS host inside cluster."
  value       = module.valkey.host
}

output "valkey_port" {
  description = "Valkey service port."
  value       = module.valkey.port
}
