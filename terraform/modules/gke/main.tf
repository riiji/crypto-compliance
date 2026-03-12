resource "google_container_cluster" "cluster" {
  name     = var.name
  location = var.location

  network    = var.network_name
  subnetwork = var.subnetwork_name

  remove_default_node_pool = true
  initial_node_count       = 1

  networking_mode = "VPC_NATIVE"

  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_secondary_range_name
    services_secondary_range_name = var.services_secondary_range_name
  }

  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  release_channel {
    channel = var.release_channel
  }

  deletion_protection = false
}

resource "google_container_node_pool" "primary" {
  name     = "${var.name}-pool"
  cluster  = google_container_cluster.cluster.name
  location = var.location

  node_count = var.node_count

  node_config {
    machine_type = var.node_machine_type
    disk_size_gb = var.node_disk_size_gb
    disk_type    = var.node_disk_type

    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]

    labels = var.node_labels
    tags   = var.node_tags

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}
