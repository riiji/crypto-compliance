locals {
  # Memorystore expects projects/{project}/global/networks/{name}, not URL-style self link.
  network_resource = startswith(var.network_self_link, "https://") ? replace(var.network_self_link, "https://www.googleapis.com/compute/v1/", "") : var.network_self_link
}

resource "google_compute_subnetwork" "psc" {
  name          = var.psc_subnet_name
  ip_cidr_range = var.psc_subnet_cidr
  region        = var.location
  network       = local.network_resource
}

resource "google_network_connectivity_service_connection_policy" "psc_policy" {
  name          = "${var.instance_id}-policy"
  location      = var.location
  service_class = "gcp-memorystore"
  network       = local.network_resource

  psc_config {
    subnetworks = [google_compute_subnetwork.psc.id]
  }
}

resource "google_memorystore_instance" "instance" {
  instance_id = var.instance_id
  location    = var.location

  shard_count   = var.shard_count
  replica_count = var.replica_count
  node_type     = var.node_type

  mode                        = var.mode
  engine_version              = var.engine_version
  authorization_mode          = var.authorization_mode
  transit_encryption_mode     = var.transit_encryption_mode
  deletion_protection_enabled = false

  desired_auto_created_endpoints {
    network    = local.network_resource
    project_id = var.project_id
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = var.maintenance_day

      start_time {
        hours   = var.maintenance_hour
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  labels = var.labels

  depends_on = [google_network_connectivity_service_connection_policy.psc_policy]
}
