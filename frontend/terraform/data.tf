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

locals {
  target_namespace = var.create_namespace ? kubernetes_namespace_v1.target[0].metadata[0].name : data.kubernetes_namespace_v1.target[0].metadata[0].name
}
