output "service_account_email" {
  description = "GitHub Actions deployment service account email."
  value       = google_service_account.deployer.email
}

output "service_account_member" {
  description = "GitHub Actions deployment service account IAM member string."
  value       = "serviceAccount:${google_service_account.deployer.email}"
}

output "project_roles" {
  description = "Project-level IAM roles granted to the service account."
  value       = sort(keys(google_project_iam_member.project_role_bindings))
}

output "artifact_registry_repository_role" {
  description = "Artifact Registry repository IAM role granted to the service account."
  value       = google_artifact_registry_repository_iam_member.repository_role_binding.role
}
