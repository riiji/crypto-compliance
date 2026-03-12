locals {
  psc_host = try(google_memorystore_instance.instance.endpoints[0].connections[0].psc_auto_connection[0].ip_address, null)
  psc_port = try(google_memorystore_instance.instance.endpoints[0].connections[0].psc_auto_connection[0].port, null)
}

output "instance_id" {
  description = "Memorystore for Valkey instance ID."
  value       = google_memorystore_instance.instance.instance_id
}

output "location" {
  description = "Memorystore for Valkey location."
  value       = google_memorystore_instance.instance.location
}

output "host" {
  description = "Endpoint address to use for Valkey clients."
  value       = local.psc_host
}

output "port" {
  description = "Endpoint port to use for Valkey clients."
  value       = local.psc_port
}
