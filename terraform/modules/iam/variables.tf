variable "project_id" {
  description = "GCP project ID where IAM resources are managed."
  type        = string
}

variable "service_account_id" {
  description = "Service account ID used by GitHub Actions for deployments."
  type        = string
}

variable "service_account_display_name" {
  description = "Display name for the GitHub Actions service account."
  type        = string
}

variable "service_account_description" {
  description = "Description for the GitHub Actions service account."
  type        = string
}

variable "project_roles" {
  description = "Project-level IAM roles granted to the service account."
  type        = list(string)
}

variable "artifact_registry_repository" {
  description = "Artifact Registry repository name for CI image pushes."
  type        = string
}

variable "artifact_registry_location" {
  description = "Artifact Registry repository location for CI image pushes."
  type        = string
}

variable "artifact_registry_repository_role" {
  description = "Artifact Registry repository role granted to the service account."
  type        = string
}
