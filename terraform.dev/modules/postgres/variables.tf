variable "namespace" {
  description = "Kubernetes namespace where Postgres is deployed."
  type        = string
}

variable "name" {
  description = "Postgres deployment/service name."
  type        = string
}

variable "image" {
  description = "Postgres container image."
  type        = string
}

variable "port" {
  description = "Postgres container and service port."
  type        = number
}

variable "db" {
  description = "Default Postgres database name."
  type        = string
}

variable "user" {
  description = "Postgres username."
  type        = string
}

variable "password" {
  description = "Postgres password."
  type        = string
  sensitive   = true
}

variable "service_type" {
  description = "Kubernetes Service type for Postgres."
  type        = string
}

variable "env" {
  description = "Additional environment variables for Postgres container."
  type        = map(string)
  default     = {}
}

variable "labels" {
  description = "Additional labels for Postgres resources."
  type        = map(string)
  default     = {}
}
