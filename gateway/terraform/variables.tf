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
  default     = "crypto-compliance-gateway"
}

variable "image" {
  description = "Container image for the gateway service."
  type        = string
  default     = "ghcr.io/your-org/crypto-compliance-gateway:latest"
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
  description = "Container port exposed by the gateway."
  type        = number
  default     = 3000

  validation {
    condition     = var.container_port >= 1 && var.container_port <= 65535
    error_message = "container_port must be a valid TCP port."
  }
}

variable "service_port" {
  description = "Service port exposed inside the cluster."
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

variable "ingress_class_name" {
  description = "IngressClass name (for example gce, nginx). Null uses controller default."
  type        = string
  default     = null
  nullable    = true
}

variable "ingress_host" {
  description = "Optional host for ingress rule. Null creates a hostless rule."
  type        = string
  default     = null
  nullable    = true
}

variable "ingress_path" {
  description = "Ingress path routed to gateway service."
  type        = string
  default     = "/"

  validation {
    condition     = startswith(var.ingress_path, "/")
    error_message = "ingress_path must start with '/'."
  }
}

variable "ingress_path_type" {
  description = "Ingress path type."
  type        = string
  default     = "Prefix"

  validation {
    condition = contains(
      ["Prefix", "Exact", "ImplementationSpecific"],
      var.ingress_path_type,
    )
    error_message = "ingress_path_type must be Prefix, Exact, or ImplementationSpecific."
  }
}

variable "ingress_annotations" {
  description = "Additional annotations for ingress."
  type        = map(string)
  default     = {}
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

variable "admin_jwt_secret" {
  description = "JWT signing secret used by the gateway admin login flow."
  type        = string
  default     = "change-me"
  sensitive   = true
}

variable "internal_hmac_secret" {
  description = "Shared HMAC secret used between the gateway and backend for trusted gRPC admin mutations."
  type        = string
  default     = "change-me"
  sensitive   = true
}

variable "backend_app_name" {
  description = "Backend application base name used to compute the default gRPC service DNS name."
  type        = string
  default     = "crypto-compliance-backend"
}

variable "backend_grpc_port" {
  description = "Backend gRPC service port used when computing the default target."
  type        = number
  default     = 50051
}

variable "backend_grpc_url" {
  description = "Optional explicit backend gRPC target in host:port form."
  type        = string
  default     = null
  nullable    = true
}
