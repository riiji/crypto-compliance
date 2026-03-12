resource "google_compute_network" "this" {
  name                    = var.name
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "this" {
  name          = var.subnetwork_name
  ip_cidr_range = var.subnetwork_cidr
  region        = var.region
  network       = google_compute_network.this.id

  secondary_ip_range {
    range_name    = var.pods_secondary_name
    ip_cidr_range = var.pods_secondary_range
  }

  secondary_ip_range {
    range_name    = var.services_secondary_name
    ip_cidr_range = var.services_secondary_range
  }
}
