variable "project_id" {
  description = "Google Cloud project ID where infrastructure is provisioned."
  type        = string
}

variable "region" {
  description = "Primary region for regional resources."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Primary zone for zonal resources."
  type        = string
  default     = "us-central1-a"
}

variable "common_labels" {
  description = "Labels shared across infrastructure resources that support labels."
  type        = map(string)
  default     = {}
}

variable "postgres_password" {
  description = "Application database user password."
  type        = string
  sensitive   = true
}
