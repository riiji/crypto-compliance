variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Google Cloud region used by provider and data lookups."
  type        = string
  default     = "us-central1"
}

variable "gke_cluster_name" {
  description = "GKE cluster name where frontend resources are deployed."
  type        = string
}

variable "gke_location" {
  description = "GKE cluster location (zone or region)."
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace for frontend resources."
  type        = string
  default     = "default"
}

variable "app_name" {
  description = "Base name for Deployment and Service."
  type        = string
  default     = "crypto-compliance-frontend"
}

variable "image" {
  description = "Container image for frontend service."
  type        = string
  default     = "ghcr.io/your-org/crypto-compliance-frontend:latest"
}

variable "image_pull_policy" {
  description = "Image pull policy."
  type        = string
  default     = "IfNotPresent"
}

variable "replicas" {
  description = "Number of pod replicas."
  type        = number
  default     = 1
}

variable "container_port" {
  description = "Container HTTP port."
  type        = number
  default     = 3000
}

variable "service_port" {
  description = "Service port."
  type        = number
  default     = 80
}

variable "service_type" {
  description = "Kubernetes Service type."
  type        = string
  default     = "ClusterIP"
}

variable "app_labels" {
  description = "Additional labels for resources."
  type        = map(string)
  default     = {}
}

variable "env" {
  description = "Additional environment variables for the container."
  type        = map(string)
  default     = {}
}
