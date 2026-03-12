variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "instance_id" {
  description = "Memorystore for Valkey instance ID."
  type        = string
}

variable "location" {
  description = "Memorystore for Valkey location (region)."
  type        = string
}

variable "engine_version" {
  description = "Valkey engine version."
  type        = string
}

variable "node_type" {
  description = "Valkey node type."
  type        = string
}

variable "shard_count" {
  description = "Number of shards."
  type        = number
}

variable "replica_count" {
  description = "Replica count per shard."
  type        = number
}

variable "authorization_mode" {
  description = "Authorization mode."
  type        = string
}

variable "transit_encryption_mode" {
  description = "Transit encryption mode."
  type        = string
}

variable "maintenance_day" {
  description = "Maintenance day."
  type        = string
}

variable "maintenance_hour" {
  description = "Maintenance hour (UTC)."
  type        = number
}

variable "mode" {
  description = "Memorystore instance mode."
  type        = string
}

variable "psc_subnet_name" {
  description = "Name for the subnet used by Memorystore service connection policy."
  type        = string
}

variable "psc_subnet_cidr" {
  description = "CIDR range for the subnet used by Memorystore service connection policy."
  type        = string
}

variable "network_self_link" {
  description = "VPC network self link used for endpoint provisioning."
  type        = string
}

variable "labels" {
  description = "Labels for Memorystore instance."
  type        = map(string)
  default     = {}
}
