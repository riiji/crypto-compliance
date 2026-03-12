output "project_id" {
  description = "Project where resources are provisioned."
  value       = var.project_id
}

output "artifact_registry_repository_id" {
  description = "Artifact Registry repository ID used by CI/CD."
  value       = module.artifact_registry.repository_id
}

output "artifact_registry_repository_location" {
  description = "Artifact Registry repository location used by CI/CD."
  value       = module.artifact_registry.location
}

output "network_name" {
  description = "VPC network name."
  value       = module.network.network_name
}

output "subnetwork_name" {
  description = "Primary subnetwork name."
  value       = module.network.subnetwork_name
}

output "gke_cluster_name" {
  description = "GKE cluster name."
  value       = module.gke.cluster_name
}

output "gke_location" {
  description = "GKE cluster location."
  value       = module.gke.location
}

output "gke_endpoint" {
  description = "GKE API server endpoint."
  value       = module.gke.endpoint
}

output "postgres_instance_name" {
  description = "Cloud SQL instance name."
  value       = module.postgres.instance_name
}

output "postgres_host" {
  description = "Cloud SQL private IP address."
  value       = module.postgres.host
}

output "postgres_port" {
  description = "Cloud SQL PostgreSQL port."
  value       = module.postgres.port
}

output "postgres_database_name" {
  description = "Cloud SQL database name for the application."
  value       = module.postgres.database_name
}

output "postgres_user" {
  description = "Cloud SQL user name for the application."
  value       = module.postgres.user_name
}

output "valkey_instance_id" {
  description = "Memorystore for Valkey instance ID."
  value       = module.valkey.instance_id
}

output "valkey_location" {
  description = "Memorystore for Valkey location."
  value       = module.valkey.location
}

output "valkey_host" {
  description = "Memorystore Valkey endpoint address."
  value       = module.valkey.host
}

output "valkey_port" {
  description = "Memorystore Valkey endpoint port."
  value       = module.valkey.port
}

output "github_actions_service_account_email" {
  description = "GitHub Actions deployment service account email."
  value       = module.github_actions_iam.service_account_email
}

output "github_actions_service_account_member" {
  description = "GitHub Actions deployment service account IAM member string."
  value       = module.github_actions_iam.service_account_member
}

output "github_actions_service_account_roles" {
  description = "IAM roles granted to GitHub Actions deployment service account."
  value       = module.github_actions_iam.project_roles
}

output "github_actions_artifact_registry_repository_role" {
  description = "Artifact Registry repository IAM role for GitHub Actions deployment service account."
  value       = module.github_actions_iam.artifact_registry_repository_role
}
