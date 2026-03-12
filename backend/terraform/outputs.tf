output "namespace" {
  description = "Namespace used for deployment."
  value       = local.target_namespace
}

output "deployment_name" {
  description = "Kubernetes Deployment name."
  value       = kubernetes_deployment_v1.app.metadata[0].name
}

output "service_name" {
  description = "Kubernetes Service name."
  value       = kubernetes_service_v1.app.metadata[0].name
}

output "service_port" {
  description = "Service port."
  value       = kubernetes_service_v1.app.spec[0].port[0].port
}

output "service_cluster_ip" {
  description = "Service cluster IP."
  value       = kubernetes_service_v1.app.spec[0].cluster_ip
}

output "gke_cluster_name" {
  description = "Target GKE cluster name."
  value       = data.google_container_cluster.target.name
}

output "postgres_host" {
  description = "Resolved Cloud SQL host used by backend defaults."
  value       = local.postgres_host
}

output "valkey_host" {
  description = "Resolved Memorystore Valkey host used by backend defaults."
  value       = local.valkey_host
}
