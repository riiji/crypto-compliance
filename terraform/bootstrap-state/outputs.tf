output "bucket_name" {
  description = "Production Terraform state bucket name."
  value       = google_storage_bucket.terraform_state.name
}
