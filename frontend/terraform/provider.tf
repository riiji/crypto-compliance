provider "google" {
  project = var.project_id
  region  = var.region
}

data "terraform_remote_state" "root" {
  backend = "gcs"

  config = {
    bucket = var.root_state_bucket
    prefix = var.root_state_prefix
  }
}

check "root_project_matches_frontend_project" {
  assert {
    condition     = local.remote_root_project_id == "" || local.remote_root_project_id == var.project_id
    error_message = "Root remote state project_id must match frontend project_id."
  }
}

data "google_client_config" "current" {}

locals {
  root_outputs = data.terraform_remote_state.root.outputs

  remote_root_project_id  = trimspace(try(local.root_outputs.project_id, ""))
  gke_cluster_name        = trimspace(try(local.root_outputs.gke_cluster_name, ""))
  gke_location            = trimspace(try(local.root_outputs.gke_location, ""))
  normalized_gke_location = trimsuffix(local.gke_location, "-")

  has_gke_cluster_details = local.gke_cluster_name != "" && local.gke_location != ""
}

check "gke_cluster_details_available" {
  assert {
    condition     = local.has_gke_cluster_details
    error_message = "Root remote state ${var.root_state_bucket}/${var.root_state_prefix} does not export gke_cluster_name and gke_location. Apply the root Terraform stack in /Users/yegorchebkasov/crypto-compliance/terraform without -target to refresh the root outputs."
  }
}

data "google_container_cluster" "target" {
  count = local.has_gke_cluster_details ? 1 : 0

  project  = var.project_id
  name     = local.gke_cluster_name
  location = local.normalized_gke_location
}

provider "kubernetes" {
  host = local.has_gke_cluster_details ? "https://${data.google_container_cluster.target[0].endpoint}" : "https://example.invalid"

  token                  = data.google_client_config.current.access_token
  cluster_ca_certificate = local.has_gke_cluster_details ? base64decode(data.google_container_cluster.target[0].master_auth[0].cluster_ca_certificate) : ""
}
