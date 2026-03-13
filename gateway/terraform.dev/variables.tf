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
  description = "Kubernetes namespace for gateway dev resources."
  type        = string
  default     = "default"
}

variable "app_name" {
  description = "Gateway dev app name."
  type        = string
  default     = "crypto-compliance-gateway-dev"
}

variable "host_repo_path" {
  description = "Absolute host path to gateway source folder."
  type        = string
  default     = "/home/ubuntu/crypto-compliance/gateway"
}

variable "image" {
  description = "Container image for gateway dev pod."
  type        = string
  default     = "node:24.14.0"
}

variable "image_pull_policy" {
  description = "Kubernetes image pull policy for gateway dev pod."
  type        = string
  default     = "IfNotPresent"
}

variable "service_type" {
  description = "Kubernetes Service type."
  type        = string
  default     = "ClusterIP"
}

variable "service_port" {
  description = "Gateway dev service port."
  type        = number
  default     = 3000
}

variable "backend_app_name" {
  description = "Backend dev app name used to compute the default gRPC service DNS name."
  type        = string
  default     = "crypto-compliance-backend-dev"
}

variable "backend_grpc_port" {
  description = "Backend dev gRPC service port."
  type        = number
  default     = 50051
}

variable "backend_grpc_url" {
  description = "Optional explicit backend gRPC target in host:port form."
  type        = string
  default     = null
  nullable    = true
}

variable "env" {
  description = "Extra environment variables for gateway dev container."
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
