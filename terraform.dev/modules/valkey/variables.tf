variable "namespace" {
  description = "Kubernetes namespace where Valkey is deployed."
  type        = string
}

variable "name" {
  description = "Valkey deployment/service name."
  type        = string
}

variable "image" {
  description = "Valkey container image."
  type        = string
}

variable "port" {
  description = "Valkey container and service port."
  type        = number
}

variable "service_type" {
  description = "Kubernetes Service type for Valkey."
  type        = string
}

variable "env" {
  description = "Additional environment variables for Valkey container."
  type        = map(string)
  default     = {}
}

variable "labels" {
  description = "Additional labels for Valkey resources."
  type        = map(string)
  default     = {}
}
