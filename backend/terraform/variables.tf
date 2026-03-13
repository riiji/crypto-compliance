variable "project_id" {
  description = "Google Cloud project ID."
  type        = string
}

variable "region" {
  description = "Google Cloud region used by provider and data lookups."
  type        = string
  default     = "us-central1"
}

variable "root_state_bucket" {
  description = "GCS bucket containing root Terraform remote state."
  type        = string
}

variable "root_state_prefix" {
  description = "Prefix path for root Terraform remote state."
  type        = string
  default     = "crypto-compliance/prod/root"
}

variable "namespace" {
  description = "Kubernetes namespace where resources will be created."
  type        = string
  default     = "default"
}

variable "create_namespace" {
  description = "Create namespace if it does not exist. If false, namespace is read as data."
  type        = bool
  default     = false
}

variable "app_name" {
  description = "Base name for Deployment/Service."
  type        = string
  default     = "crypto-compliance-backend"
}

variable "image" {
  description = "Container image for the crypto-compliance service."
  type        = string
  default     = "ghcr.io/your-org/crypto-compliance-backend:latest"
}

variable "replicas" {
  description = "Number of pod replicas."
  type        = number
  default     = 1

  validation {
    condition     = var.replicas >= 1
    error_message = "replicas must be >= 1."
  }
}

variable "service_type" {
  description = "Kubernetes Service type for the gRPC service."
  type        = string
  default     = "ClusterIP"

  validation {
    condition = contains(
      ["ClusterIP", "NodePort", "LoadBalancer"],
      var.service_type,
    )
    error_message = "service_type must be one of ClusterIP, NodePort, LoadBalancer."
  }
}

variable "image_pull_policy" {
  description = "Kubernetes image pull policy for the application container."
  type        = string
  default     = "IfNotPresent"

  validation {
    condition = contains(
      ["Always", "IfNotPresent", "Never"],
      var.image_pull_policy,
    )
    error_message = "image_pull_policy must be one of Always, IfNotPresent, Never."
  }
}

variable "app_labels" {
  description = "Additional labels to add to Deployment/Service/Pods."
  type        = map(string)
  default     = {}
}

variable "env" {
  description = "Environment variables passed to the application container."
  type        = map(string)
  default     = {}
}

variable "postgres_password" {
  description = "Postgres password used by backend."
  type        = string
  sensitive   = true
}

variable "policy_hmac_secret" {
  description = "HMAC secret used to validate compliance policy mutation requests."
  type        = string
  default     = "change-me"
}

variable "compliance_api_url" {
  description = "Compliance provider URL exposed to the backend as COMPLIANCE_API_URL."
  type        = string
}

variable "internal_hmac_secret" {
  description = "Shared HMAC secret used between the gateway and backend for trusted gRPC admin mutations."
  type        = string
  default     = "change-me"
  sensitive   = true
}
