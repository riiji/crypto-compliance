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
  description = "Kubernetes namespace for frontend dev resources."
  type        = string
  default     = "default"
}

variable "app_name" {
  description = "Frontend dev app name."
  type        = string
  default     = "crypto-compliance-frontend-dev"
}

variable "host_repo_path" {
  description = "Absolute host path to frontend source folder."
  type        = string
  default     = "/home/ubuntu/crypto-compliance/frontend"
}

variable "image" {
  description = "Container image for frontend dev pod (for example node:24.14.0 or an Artifact Registry image)."
  type        = string
  default     = "node:24.14.0"
}

variable "image_pull_policy" {
  description = "Kubernetes image pull policy for frontend dev pod."
  type        = string
  default     = "IfNotPresent"
}

variable "service_type" {
  description = "Kubernetes Service type."
  type        = string
  default     = "ClusterIP"
}

variable "service_port" {
  description = "Frontend dev service port."
  type        = number
  default     = 3000
}

variable "env" {
  description = "Extra environment variables for frontend dev container."
  type        = map(string)
  default     = {}
}
