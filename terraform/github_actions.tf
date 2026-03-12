module "github_actions_iam" {
  source = "./modules/iam"

  project_id                        = var.project_id
  service_account_id                = var.github_actions_service_account_id
  service_account_display_name      = var.github_actions_service_account_display_name
  service_account_description       = var.github_actions_service_account_description
  project_roles                     = var.github_actions_service_account_roles
  artifact_registry_repository      = var.github_actions_artifact_registry_repository
  artifact_registry_location        = var.github_actions_artifact_registry_location
  artifact_registry_repository_role = var.github_actions_artifact_registry_repository_role

  depends_on = [module.apis, module.artifact_registry]
}
