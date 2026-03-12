variable "kubeconfig_path" {
  description = "Path to kubeconfig used by the Kubernetes provider."
  type        = string
  default     = "~/.kube/config"
}

variable "kubeconfig_context" {
  description = "Optional kubeconfig context name. If null, current context is used."
  type        = string
  default     = null
  nullable    = true
}

variable "namespace" {
  description = "Kubernetes namespace where dev data services are deployed."
  type        = string
  default     = "default"
}

variable "postgres_password" {
  description = "Postgres password."
  type        = string
  default     = "compliance"
  sensitive   = true
}

variable "labels" {
  description = "Additional labels for Postgres and Valkey resources."
  type        = map(string)
  default     = {}
}

variable "postgres" {
  description = "Optional Postgres overrides for dev data services."
  type = object({
    name         = optional(string, "crypto-compliance-postgres-dev")
    image        = optional(string, "postgres:18-alpine")
    port         = optional(number, 5432)
    db           = optional(string, "compliance")
    user         = optional(string, "compliance")
    service_type = optional(string, "ClusterIP")
    env          = optional(map(string), {})
  })
  default = {}

  validation {
    condition     = var.postgres.port >= 1 && var.postgres.port <= 65535
    error_message = "postgres.port must be a valid TCP port."
  }

  validation {
    condition = contains(
      ["ClusterIP", "NodePort", "LoadBalancer"],
      var.postgres.service_type,
    )
    error_message = "postgres.service_type must be one of ClusterIP, NodePort, LoadBalancer."
  }
}

variable "valkey" {
  description = "Optional Valkey overrides for dev data services."
  type = object({
    name         = optional(string, "crypto-compliance-valkey-dev")
    image        = optional(string, "valkey/valkey:9.0.3-alpine")
    port         = optional(number, 6379)
    service_type = optional(string, "ClusterIP")
    env          = optional(map(string), {})
  })
  default = {}

  validation {
    condition     = var.valkey.port >= 1 && var.valkey.port <= 65535
    error_message = "valkey.port must be a valid TCP port."
  }

  validation {
    condition = contains(
      ["ClusterIP", "NodePort", "LoadBalancer"],
      var.valkey.service_type,
    )
    error_message = "valkey.service_type must be one of ClusterIP, NodePort, LoadBalancer."
  }
}
