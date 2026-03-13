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

  explicit_gke_cluster_name = var.gke_cluster_name == null ? "" : trimspace(var.gke_cluster_name)
  explicit_gke_location     = var.gke_location == null ? "" : trimspace(var.gke_location)

  remote_root_project_id  = trimspace(try(local.root_outputs.project_id, ""))
  remote_gke_cluster_name = trimspace(try(local.root_outputs.gke_cluster_name, ""))
  remote_gke_location     = trimspace(try(local.root_outputs.gke_location, ""))

  effective_gke_cluster_name = local.explicit_gke_cluster_name != "" ? local.explicit_gke_cluster_name : local.remote_gke_cluster_name
  effective_gke_location     = local.explicit_gke_location != "" ? local.explicit_gke_location : local.remote_gke_location
  normalized_gke_location    = trimsuffix(local.effective_gke_location, "-")

  has_gke_cluster_details = local.effective_gke_cluster_name != "" && local.effective_gke_location != ""
}

check "gke_cluster_details_available" {
  assert {
    condition     = local.has_gke_cluster_details
    error_message = "GKE cluster details are unavailable in root remote state ${var.root_state_bucket}/${var.root_state_prefix}. Re-apply the root Terraform stack so it exports gke_cluster_name and gke_location, or set gke_cluster_name and gke_location in frontend Terraform variables."
  }
}

data "google_container_cluster" "target" {
  count = local.has_gke_cluster_details ? 1 : 0

  project  = var.project_id
  name     = local.effective_gke_cluster_name
  location = local.normalized_gke_location
}

provider "kubernetes" {
  host = local.has_gke_cluster_details ? "https://${data.google_container_cluster.target[0].endpoint}" : "https://example.invalid"

  token                  = data.google_client_config.current.access_token
  cluster_ca_certificate = local.has_gke_cluster_details ? base64decode(data.google_container_cluster.target[0].master_auth[0].cluster_ca_certificate) : ""
}
