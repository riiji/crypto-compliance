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
  description = "Kubernetes namespace for backend dev resources."
  type        = string
  default     = "default"
}

variable "app_name" {
  description = "Backend dev app name."
  type        = string
  default     = "crypto-compliance-backend-dev"
}

variable "host_repo_path" {
  description = "Absolute host path to backend source folder."
  type        = string
  default     = "/home/ubuntu/crypto-compliance/backend"
}

variable "service_type" {
  description = "Kubernetes Service type."
  type        = string
  default     = "ClusterIP"
}

variable "service_port" {
  description = "Backend dev service port."
  type        = number
  default     = 3000
}

variable "data_services_namespace" {
  description = "Namespace where Postgres and Valkey services run."
  type        = string
  default     = "default"
}

variable "postgres_service_name" {
  description = "Postgres service name used by backend."
  type        = string
  default     = "crypto-compliance-postgres-dev"
}

variable "postgres_port" {
  description = "Postgres service port used by backend."
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
  default     = "compliance"
  sensitive   = true
}

variable "valkey_service_name" {
  description = "Valkey service name used by backend."
  type        = string
  default     = "crypto-compliance-valkey-dev"
}

variable "valkey_port" {
  description = "Valkey service port used by backend."
  type        = number
  default     = 6379
}

variable "policy_hmac_secret" {
  description = "HMAC secret used to validate compliance policy mutation requests."
  type        = string
  default     = "change-me"
}

variable "env" {
  description = "Extra environment variables for backend dev container."
  type        = map(string)
  default     = {}
}
