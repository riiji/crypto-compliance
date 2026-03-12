output "deployment_name" {
  description = "Valkey Deployment name."
  value       = kubernetes_deployment_v1.this.metadata[0].name
}

output "service_name" {
  description = "Valkey Service name."
  value       = kubernetes_service_v1.this.metadata[0].name
}

output "host" {
  description = "Valkey DNS host inside cluster."
  value       = "${kubernetes_service_v1.this.metadata[0].name}.${var.namespace}.svc.cluster.local"
}

output "port" {
  description = "Valkey service port."
  value       = kubernetes_service_v1.this.spec[0].port[0].port
}
