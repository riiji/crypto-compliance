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

data "terraform_remote_state" "root" {
  backend = "gcs"

  config = {
    bucket = var.root_state_bucket
    prefix = var.root_state_prefix
  }
}

locals {
  root_outputs     = data.terraform_remote_state.root.outputs
  target_namespace = var.create_namespace ? kubernetes_namespace_v1.target[0].metadata[0].name : data.kubernetes_namespace_v1.target[0].metadata[0].name
}

check "root_project_matches_gateway_project" {
  assert {
    condition     = try(local.root_outputs.project_id, "") == var.project_id
    error_message = "Root remote state project_id must match gateway project_id."
  }
}
