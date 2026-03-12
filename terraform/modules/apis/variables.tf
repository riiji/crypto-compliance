variable "project_id" {
  description = "GCP project ID where APIs are enabled."
  type        = string
}

variable "services" {
  description = "List of service APIs to enable."
  type        = list(string)
}

variable "disable_on_destroy" {
  description = "Disable service APIs when Terraform destroys resources."
  type        = bool
  default     = false
}
