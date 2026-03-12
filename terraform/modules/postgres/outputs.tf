output "instance_name" {
  description = "Cloud SQL instance name."
  value       = google_sql_database_instance.this.name
}

output "connection_name" {
  description = "Cloud SQL connection name."
  value       = google_sql_database_instance.this.connection_name
}

output "host" {
  description = "Cloud SQL private IP address."
  value       = length(local.private_ips) > 0 ? local.private_ips[0] : google_sql_database_instance.this.first_ip_address
}

output "port" {
  description = "Cloud SQL PostgreSQL port."
  value       = 5432
}

output "database_name" {
  description = "Application database name."
  value       = google_sql_database.this.name
}

output "user_name" {
  description = "Application database user."
  value       = google_sql_user.this.name
}
