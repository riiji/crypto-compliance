output "namespace" {
  description = "Namespace used for dev service."
  value       = var.namespace
}

output "deployment_name" {
  description = "Deployment name."
  value       = kubernetes_deployment_v1.app.metadata[0].name
}

output "service_name" {
  description = "Service name."
  value       = kubernetes_service_v1.app.metadata[0].name
}

output "service_port" {
  description = "Service port."
  value       = kubernetes_service_v1.app.spec[0].port[0].port
}

output "ingress_name" {
  description = "Ingress name."
  value       = kubernetes_ingress_v1.app.metadata[0].name
}
