resource "google_compute_global_address" "private_service_range" {
  name          = var.private_service_cidr_prefix
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = var.private_service_cidr_prefixlen
  network       = var.network_self_link
}

resource "google_service_networking_connection" "private_service_connection" {
  network                 = var.network_self_link
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}

resource "google_sql_database_instance" "instance" {
  name             = var.instance_name
  region           = var.region
  database_version = var.database_version

  deletion_protection = false

  settings {
    edition         = var.edition
    tier            = var.tier
    disk_size       = var.disk_size_gb
    disk_type       = var.disk_type
    disk_autoresize = true

    backup_configuration {
      enabled = var.backup_enabled
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = var.network_self_link
      enable_private_path_for_google_cloud_services = true
    }

    maintenance_window {
      day          = var.maintenance_day
      hour         = var.maintenance_hour
      update_track = "stable"
    }

    user_labels = var.labels
  }

  depends_on = [google_service_networking_connection.private_service_connection]
}

resource "google_sql_database" "application" {
  name     = var.database_name
  instance = google_sql_database_instance.instance.name
}

resource "google_sql_user" "application" {
  name     = var.user_name
  instance = google_sql_database_instance.instance.name
  password = var.user_password
}

locals {
  private_ips = [
    for item in google_sql_database_instance.instance.ip_address : item.ip_address
    if item.type == "PRIVATE"
  ]
}
