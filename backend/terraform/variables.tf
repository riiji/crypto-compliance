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
  description = "GKE cluster name where backend resources are deployed."
  type        = string
}

variable "gke_location" {
  description = "GKE cluster location (zone or region)."
  type        = string

  validation {
    condition = can(
      regex(
        "^[a-z]+-[a-z0-9]+[0-9](?:-[a-z])?$",
        trimspace(var.gke_location),
      ),
    )
    error_message = "gke_location must be a valid region (for example us-central1) or zone (for example us-central1-a)."
  }
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

variable "container_port" {
  description = "Container port exposed by the application."
  type        = number
  default     = 3000

  validation {
    condition     = var.container_port >= 1 && var.container_port <= 65535
    error_message = "container_port must be a valid TCP port."
  }
}

variable "service_port" {
  description = "Service port exposed inside/outside the cluster."
  type        = number
  default     = 80

  validation {
    condition     = var.service_port >= 1 && var.service_port <= 65535
    error_message = "service_port must be a valid TCP port."
  }
}

variable "service_type" {
  description = "Kubernetes Service type."
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

variable "postgres_instance_name" {
  description = "Cloud SQL PostgreSQL instance name."
  type        = string
}

variable "postgres_port" {
  description = "Postgres port used by backend."
  type        = number
  default     = 5432
}

variable "postgres_db" {
  description = "Postgres database name used by backend."
  type        = string
  default     = "compliance"
}

variable "postgres_user" {
  description = "Postgres user used by backend."
  type        = string
  default     = "compliance"
}

variable "postgres_password" {
  description = "Postgres password used by backend."
  type        = string
  sensitive   = true
}

variable "valkey_instance_id" {
  description = "Memorystore for Valkey instance ID used by backend."
  type        = string
}

variable "valkey_location" {
  description = "Memorystore for Valkey location (region) used by backend."
  type        = string
  default     = "us-central1"

  validation {
    condition = can(
      regex(
        "^[a-z]+-[a-z0-9]+[0-9]$",
        trimspace(var.valkey_location),
      ),
    )
    error_message = "valkey_location must be a valid region (for example us-central1)."
  }
}

variable "valkey_port_fallback" {
  description = "Fallback Valkey port when endpoint metadata is unavailable."
  type        = number
  default     = 6379
}

variable "policy_hmac_secret" {
  description = "HMAC secret used to validate compliance policy mutation requests."
  type        = string
  default     = "change-me"
}
