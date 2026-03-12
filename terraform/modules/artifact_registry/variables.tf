variable "project_id" {
  description = "GCP project ID where the Artifact Registry repository is created."
  type        = string
}

variable "location" {
  description = "Artifact Registry repository location."
  type        = string
}

variable "repository_id" {
  description = "Artifact Registry repository ID."
  type        = string
}

variable "description" {
  description = "Artifact Registry repository description."
  type        = string
  default     = "Docker repository for crypto-compliance CI/CD images."
}

variable "format" {
  description = "Artifact Registry repository format."
  type        = string
  default     = "DOCKER"

  validation {
    condition     = contains(["DOCKER", "MAVEN", "NPM", "APT", "YUM", "PYTHON", "GO"], var.format)
    error_message = "format must be a valid Artifact Registry format."
  }
}
