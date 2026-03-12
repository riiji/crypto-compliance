resource "google_service_account" "deployer" {
  account_id   = var.service_account_id
  display_name = var.service_account_display_name
  description  = var.service_account_description
  project      = var.project_id
}

resource "google_project_iam_member" "project_role_bindings" {
  for_each = toset(var.project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_artifact_registry_repository_iam_member" "repository_role_binding" {
  project    = var.project_id
  location   = var.artifact_registry_location
  repository = var.artifact_registry_repository
  role       = var.artifact_registry_repository_role
  member     = "serviceAccount:${google_service_account.deployer.email}"
}
