module "service" {
  source = "./modules/dev_service"

  app_name       = var.app_name
  namespace      = var.namespace
  host_repo_path = var.host_repo_path

  service_port = var.service_port
  service_type = var.service_type
  env          = var.env

  labels = {
    "app.kubernetes.io/component" = "frontend-dev"
    "app.kubernetes.io/part-of"   = "crypto-compliance"
  }
}
