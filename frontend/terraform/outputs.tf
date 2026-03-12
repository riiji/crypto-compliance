output "namespace" {
  description = "Namespace where resources are created."
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

output "gke_cluster_name" {
  description = "Target GKE cluster name."
  value       = data.google_container_cluster.target.name
}
