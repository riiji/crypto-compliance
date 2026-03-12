output "network_name" {
  description = "VPC network name."
  value       = google_compute_network.vpc.name
}

output "network_self_link" {
  description = "VPC network self link."
  value       = google_compute_network.vpc.self_link
}

output "subnetwork_name" {
  description = "Primary subnetwork name."
  value       = google_compute_subnetwork.primary.name
}

output "subnetwork_self_link" {
  description = "Primary subnetwork self link."
  value       = google_compute_subnetwork.primary.self_link
}

output "pods_secondary_range_name" {
  description = "Pods secondary range name."
  value       = var.pods_secondary_name
}

output "services_secondary_range_name" {
  description = "Services secondary range name."
  value       = var.services_secondary_name
}
