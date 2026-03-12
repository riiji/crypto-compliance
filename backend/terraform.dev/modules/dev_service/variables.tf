variable "app_name" {
  description = "Deployment and service base name."
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace for resources."
  type        = string
  default     = "default"
}

variable "host_repo_path" {
  description = "Absolute host path mounted into the dev container."
  type        = string
}

variable "service_port" {
  description = "Kubernetes service port for the dev service."
  type        = number
}

variable "grpc_service_port" {
  description = "Kubernetes service port for gRPC traffic."
  type        = number
  default     = 50051
}

variable "grpc_ingress_path" {
  description = "Ingress path prefix routed to the gRPC service."
  type        = string
  default     = "/compliance.ComplianceService"

  validation {
    condition     = startswith(var.grpc_ingress_path, "/")
    error_message = "grpc_ingress_path must start with '/'."
  }
}

variable "service_type" {
  description = "Kubernetes Service type."
  type        = string
  default     = "ClusterIP"
}

variable "ingress_annotations" {
  description = "Additional annotations for ingress."
  type        = map(string)
  default     = {}
}

variable "image" {
  description = "Container image for dev pod."
  type        = string
  default     = "node:24.14.0"
}

variable "image_pull_policy" {
  description = "Kubernetes image pull policy."
  type        = string
  default     = "IfNotPresent"
}

variable "replicas" {
  description = "Number of dev pod replicas."
  type        = number
  default     = 1
}

variable "workdir" {
  description = "Container working directory."
  type        = string
  default     = "/workspace"
}

variable "env" {
  description = "Environment variables passed to container."
  type        = map(string)
  default     = {}
}

variable "labels" {
  description = "Additional labels for resources."
  type        = map(string)
  default     = {}
}
