output "repository_id" {
  description = "Artifact Registry repository ID."
  value       = google_artifact_registry_repository.docker_repository.repository_id
}

output "location" {
  description = "Artifact Registry repository location."
  value       = google_artifact_registry_repository.docker_repository.location
}

output "name" {
  description = "Artifact Registry repository resource name."
  value       = google_artifact_registry_repository.docker_repository.name
}
