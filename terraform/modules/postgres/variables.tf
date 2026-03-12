variable "instance_name" {
  description = "Cloud SQL instance name."
  type        = string
}

variable "region" {
  description = "Cloud SQL region."
  type        = string
}

variable "database_version" {
  description = "Cloud SQL database version."
  type        = string
}

variable "edition" {
  description = "Cloud SQL edition."
  type        = string
}

variable "tier" {
  description = "Cloud SQL machine tier."
  type        = string
}

variable "disk_size_gb" {
  description = "Cloud SQL disk size in GB."
  type        = number
}

variable "disk_type" {
  description = "Cloud SQL disk type."
  type        = string
}

variable "database_name" {
  description = "Application database name."
  type        = string
}

variable "user_name" {
  description = "Application user name."
  type        = string
}

variable "user_password" {
  description = "Application user password."
  type        = string
  sensitive   = true
}

variable "network_self_link" {
  description = "VPC self link used for private IP connectivity."
  type        = string
}

variable "private_service_cidr_prefix" {
  description = "Resource name for private service access range."
  type        = string
}

variable "private_service_cidr_prefixlen" {
  description = "Prefix length for private service access range."
  type        = number
}

variable "backup_enabled" {
  description = "Enable Cloud SQL backups."
  type        = bool
  default     = true
}

variable "maintenance_day" {
  description = "Cloud SQL maintenance day (1=Monday ... 7=Sunday)."
  type        = number
}

variable "maintenance_hour" {
  description = "Cloud SQL maintenance hour UTC (0-23)."
  type        = number
}

variable "labels" {
  description = "Labels attached to Cloud SQL instance."
  type        = map(string)
  default     = {}
}
