output "enabled_services" {
  description = "Service APIs enabled by Terraform."
  value       = sort(keys(google_project_service.services))
}
