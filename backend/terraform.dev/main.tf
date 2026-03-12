locals {
  default_env = {
    COMPLIANCE_POLICY_HMAC_SECRET = var.policy_hmac_secret
    COMPLIANCE_DB_HOST            = "${var.postgres_service_name}.${var.data_services_namespace}.svc.cluster.local"
    COMPLIANCE_DB_PORT            = tostring(var.postgres_port)
    COMPLIANCE_DB_USER            = var.postgres_user
    COMPLIANCE_DB_PASSWORD        = var.postgres_password
    COMPLIANCE_DB_NAME            = var.postgres_db
    COMPLIANCE_VALKEY_HOST        = "${var.valkey_service_name}.${var.data_services_namespace}.svc.cluster.local"
    COMPLIANCE_VALKEY_PORT        = tostring(var.valkey_port)
  }

  effective_env = merge(local.default_env, var.env)
}

module "service" {
  source = "./modules/dev_service"

  app_name            = var.app_name
  namespace           = var.namespace
  host_repo_path      = var.host_repo_path
  ingress_annotations = var.ingress_annotations
  image               = var.image
  image_pull_policy   = var.image_pull_policy

  service_port = var.service_port
  service_type = var.service_type

  env = local.effective_env

  labels = {
    "app.kubernetes.io/component" = "backend-dev"
    "app.kubernetes.io/part-of"   = "crypto-compliance"
  }
}
