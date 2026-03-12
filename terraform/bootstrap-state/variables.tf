variable "project_id" {
  description = "Google Cloud project ID where the Terraform state bucket is created."
  type        = string
}

variable "bucket_name" {
  description = "Name of the production Terraform state bucket."
  type        = string
  default     = "vernal-parser-328009-crypto-compliance-tfstate-prod"
}

variable "location" {
  description = "Bucket location."
  type        = string
  default     = "us-central1"
}
