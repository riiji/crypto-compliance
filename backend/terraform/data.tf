resource "kubernetes_namespace_v1" "target" {
  count = var.create_namespace ? 1 : 0

  metadata {
    name = var.namespace
  }
}

data "kubernetes_namespace_v1" "target" {
  count = var.create_namespace ? 0 : 1

  metadata {
    name = var.namespace
  }
}

data "google_sql_database_instance" "postgres" {
  project = var.project_id
  name    = var.postgres_instance_name
}

data "google_memorystore_instance" "valkey" {
  project     = var.project_id
  instance_id = var.valkey_instance_id
  location    = var.valkey_location
}

locals {
  target_namespace = var.create_namespace ? kubernetes_namespace_v1.target[0].metadata[0].name : data.kubernetes_namespace_v1.target[0].metadata[0].name
}
