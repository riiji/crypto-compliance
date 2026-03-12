variable "name" {
  description = "VPC network name."
  type        = string
}

variable "region" {
  description = "Region for subnet resources."
  type        = string
}

variable "subnetwork_name" {
  description = "Primary subnetwork name."
  type        = string
}

variable "subnetwork_cidr" {
  description = "CIDR range for the primary subnetwork."
  type        = string
}

variable "pods_secondary_name" {
  description = "Secondary IP range name for GKE pods."
  type        = string
}

variable "pods_secondary_range" {
  description = "Secondary IP CIDR range for GKE pods."
  type        = string
}

variable "services_secondary_name" {
  description = "Secondary IP range name for GKE services."
  type        = string
}

variable "services_secondary_range" {
  description = "Secondary IP CIDR range for GKE services."
  type        = string
}

variable "labels" {
  description = "Labels map (kept for interface symmetry; network resources do not use all labels)."
  type        = map(string)
  default     = {}
}
