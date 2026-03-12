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
    condition     = try(data.terraform_remote_state.root.outputs.project_id, "") == var.project_id
    error_message = "Root remote state project_id must match frontend project_id."
  }
}

data "google_client_config" "current" {}

locals {
  normalized_gke_location = trimsuffix(trimspace(data.terraform_remote_state.root.outputs.gke_location), "-")
}

data "google_container_cluster" "target" {
  project  = var.project_id
  name     = data.terraform_remote_state.root.outputs.gke_cluster_name
  location = local.normalized_gke_location
}

provider "kubernetes" {
  host = "https://${data.google_container_cluster.target.endpoint}"

  token                  = data.google_client_config.current.access_token
  cluster_ca_certificate = base64decode(data.google_container_cluster.target.master_auth[0].cluster_ca_certificate)
}
