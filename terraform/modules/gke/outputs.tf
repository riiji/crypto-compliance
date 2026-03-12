output "cluster_name" {
  description = "GKE cluster name."
  value       = google_container_cluster.this.name
}

output "location" {
  description = "GKE cluster location."
  value       = google_container_cluster.this.location
}

output "endpoint" {
  description = "GKE control plane endpoint."
  value       = google_container_cluster.this.endpoint
}

output "cluster_ca_certificate" {
  description = "Base64-encoded cluster CA certificate."
  value       = google_container_cluster.this.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "node_pool_name" {
  description = "Primary node pool name."
  value       = google_container_node_pool.primary.name
}
