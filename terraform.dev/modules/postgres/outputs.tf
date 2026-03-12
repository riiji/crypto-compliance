output "deployment_name" {
  description = "Postgres Deployment name."
  value       = kubernetes_deployment_v1.deployment.metadata[0].name
}

output "service_name" {
  description = "Postgres Service name."
  value       = kubernetes_service_v1.service.metadata[0].name
}

output "host" {
  description = "Postgres DNS host inside cluster."
  value       = "${kubernetes_service_v1.service.metadata[0].name}.${var.namespace}.svc.cluster.local"
}

output "port" {
  description = "Postgres service port."
  value       = kubernetes_service_v1.service.spec[0].port[0].port
}

output "db" {
  description = "Postgres database name."
  value       = var.db
}

output "user" {
  description = "Postgres username."
  value       = var.user
}
