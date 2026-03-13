module "github_actions_iam" {
  source = "./modules/iam"

  project_id                        = var.project_id
  service_account_id                = local.github_actions.service_account_id
  service_account_display_name      = local.github_actions.service_account_display_name
  service_account_description       = local.github_actions.service_account_description
  project_roles                     = local.github_actions.project_roles
  artifact_registry_repository      = local.github_actions.artifact_registry_repository
  artifact_registry_location        = var.region
  artifact_registry_repository_role = local.github_actions.artifact_registry_repository_role

  depends_on = [module.apis, module.artifact_registry]
}
