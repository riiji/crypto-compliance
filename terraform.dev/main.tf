module "postgres" {
  source = "./modules/postgres"

  namespace = var.namespace
  name      = var.postgres.name
  image     = var.postgres.image
  port      = var.postgres.port
  db        = var.postgres.db
  user      = var.postgres.user
  password  = var.postgres_password

  service_type = var.postgres.service_type
  env          = var.postgres.env
  labels       = var.labels
}

module "valkey" {
  source = "./modules/valkey"

  namespace = var.namespace
  name      = var.valkey.name
  image     = var.valkey.image
  port      = var.valkey.port

  service_type = var.valkey.service_type
  env          = var.valkey.env
  labels       = var.labels
}
