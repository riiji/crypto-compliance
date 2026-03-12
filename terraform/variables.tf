variable "project_id" {
  description = "Google Cloud project ID where infrastructure is provisioned."
  type        = string
}

variable "region" {
  description = "Primary region for regional resources."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Primary zone for zonal resources."
  type        = string
  default     = "us-central1-a"
}

variable "enabled_apis" {
  description = "APIs enabled before provisioning resources."
  type        = list(string)
  default = [
    "compute.googleapis.com",
    "container.googleapis.com",
    "memorystore.googleapis.com",
    "networkconnectivity.googleapis.com",
    "redis.googleapis.com",
    "sqladmin.googleapis.com",
    "servicenetworking.googleapis.com",
  ]
}

variable "disable_api_on_destroy" {
  description = "Disable project services when Terraform destroys infrastructure."
  type        = bool
  default     = false
}

variable "common_labels" {
  description = "Labels shared across infrastructure resources that support labels."
  type        = map(string)
  default     = {}
}

variable "network_name" {
  description = "VPC network name used by GKE, Cloud SQL, and Memorystore."
  type        = string
  default     = "crypto-compliance-vpc"
}

variable "subnetwork_name" {
  description = "Primary subnet name for GKE nodes."
  type        = string
  default     = "crypto-compliance-subnet"
}

variable "subnetwork_cidr" {
  description = "CIDR range for the primary subnet."
  type        = string
  default     = "10.10.0.0/20"
}

variable "gke_pods_range_name" {
  description = "Secondary range name used for GKE pods."
  type        = string
  default     = "gke-pods"
}

variable "gke_pods_cidr" {
  description = "CIDR range used for GKE pods."
  type        = string
  default     = "10.20.0.0/16"
}

variable "gke_services_range_name" {
  description = "Secondary range name used for GKE services."
  type        = string
  default     = "gke-services"
}

variable "gke_services_cidr" {
  description = "CIDR range used for GKE services."
  type        = string
  default     = "10.30.0.0/20"
}

variable "gke_cluster_name" {
  description = "GKE cluster name."
  type        = string
  default     = "crypto-compliance-gke"
}

variable "gke_location" {
  description = "GKE cluster location (zone for zonal cluster, region for regional)."
  type        = string
  default     = "us-central1-a"
}

variable "gke_release_channel" {
  description = "GKE release channel."
  type        = string
  default     = "REGULAR"

  validation {
    condition     = contains(["RAPID", "REGULAR", "STABLE"], var.gke_release_channel)
    error_message = "gke_release_channel must be one of RAPID, REGULAR, or STABLE."
  }
}

variable "gke_node_count" {
  description = "Number of nodes in the default GKE node pool."
  type        = number
  default     = 1

  validation {
    condition     = var.gke_node_count >= 1
    error_message = "gke_node_count must be >= 1."
  }
}

variable "gke_node_machine_type" {
  description = "Machine type for GKE nodes."
  type        = string
  default     = "e2-standard-2"
}

variable "gke_node_disk_size_gb" {
  description = "Boot disk size for each GKE node in GB."
  type        = number
  default     = 100
}

variable "gke_node_disk_type" {
  description = "Boot disk type for GKE nodes."
  type        = string
  default     = "pd-standard"
}

variable "gke_node_tags" {
  description = "Network tags attached to GKE nodes."
  type        = list(string)
  default     = []
}

variable "postgres_instance_name" {
  description = "Cloud SQL instance name for PostgreSQL."
  type        = string
  default     = "crypto-compliance-postgres"
}

variable "postgres_database_version" {
  description = "Cloud SQL PostgreSQL version."
  type        = string
  default     = "POSTGRES_18"
}

variable "postgres_tier" {
  description = "Cloud SQL machine tier."
  type        = string
  default     = "db-f1-micro"
}

variable "postgres_edition" {
  description = "Cloud SQL edition."
  type        = string
  default     = "ENTERPRISE"

  validation {
    condition     = contains(["ENTERPRISE", "ENTERPRISE_PLUS"], var.postgres_edition)
    error_message = "postgres_edition must be ENTERPRISE or ENTERPRISE_PLUS."
  }
}

variable "postgres_disk_size_gb" {
  description = "Cloud SQL disk size in GB."
  type        = number
  default     = 20
}

variable "postgres_disk_type" {
  description = "Cloud SQL disk type."
  type        = string
  default     = "PD_SSD"

  validation {
    condition     = contains(["PD_HDD", "PD_SSD"], var.postgres_disk_type)
    error_message = "postgres_disk_type must be PD_HDD or PD_SSD."
  }
}

variable "postgres_database_name" {
  description = "Primary database created inside Cloud SQL instance."
  type        = string
  default     = "compliance"
}

variable "postgres_user" {
  description = "Application database user."
  type        = string
  default     = "compliance"
}

variable "postgres_password" {
  description = "Application database user password."
  type        = string
  sensitive   = true
}

variable "postgres_private_service_cidr_prefix" {
  description = "Name prefix used for Cloud SQL private service access range."
  type        = string
  default     = "crypto-compliance-sql-private-range"
}

variable "postgres_private_service_cidr_prefixlen" {
  description = "Prefix length for Cloud SQL private service access range."
  type        = number
  default     = 16
}

variable "postgres_backup_enabled" {
  description = "Enable automated Cloud SQL backups."
  type        = bool
  default     = true
}

variable "postgres_maintenance_day" {
  description = "Cloud SQL maintenance day (1=Monday ... 7=Sunday)."
  type        = number
  default     = 7
}

variable "postgres_maintenance_hour" {
  description = "Cloud SQL maintenance hour in UTC (0-23)."
  type        = number
  default     = 3
}

variable "valkey_instance_id" {
  description = "Memorystore for Valkey instance ID."
  type        = string
  default     = "crypto-compliance-valkey"
}

variable "valkey_location" {
  description = "Memorystore for Valkey location (region, for example us-central1)."
  type        = string
  default     = "us-central1"
}

variable "valkey_engine_version" {
  description = "Valkey engine version for Memorystore."
  type        = string
  default     = "VALKEY_9_0"
}

variable "valkey_node_type" {
  description = "Memorystore Valkey node type."
  type        = string
  default     = "SHARED_CORE_NANO"
}

variable "valkey_shard_count" {
  description = "Number of shards for Memorystore Valkey instance."
  type        = number
  default     = 1
}

variable "valkey_replica_count" {
  description = "Replicas per shard for Memorystore Valkey instance."
  type        = number
  default     = 0
}

variable "valkey_authorization_mode" {
  description = "Memorystore Valkey authorization mode."
  type        = string
  default     = "AUTH_DISABLED"

  validation {
    condition     = contains(["AUTH_DISABLED", "IAM_AUTH"], var.valkey_authorization_mode)
    error_message = "valkey_authorization_mode must be AUTH_DISABLED or IAM_AUTH."
  }
}

variable "valkey_transit_encryption_mode" {
  description = "Memorystore Valkey transit encryption mode."
  type        = string
  default     = "TRANSIT_ENCRYPTION_DISABLED"

  validation {
    condition = contains(
      ["TRANSIT_ENCRYPTION_DISABLED", "SERVER_AUTHENTICATION"],
      var.valkey_transit_encryption_mode,
    )
    error_message = "valkey_transit_encryption_mode must be TRANSIT_ENCRYPTION_DISABLED or SERVER_AUTHENTICATION."
  }
}

variable "valkey_maintenance_day" {
  description = "Memorystore Valkey maintenance day."
  type        = string
  default     = "SUNDAY"
}

variable "valkey_maintenance_hour" {
  description = "Memorystore Valkey maintenance start hour in UTC (0-23)."
  type        = number
  default     = 4
}

variable "valkey_mode" {
  description = "Memorystore Valkey mode."
  type        = string
  default     = "CLUSTER"

  validation {
    condition     = contains(["CLUSTER", "CLUSTER_DISABLED"], var.valkey_mode)
    error_message = "valkey_mode must be CLUSTER or CLUSTER_DISABLED."
  }
}

variable "valkey_psc_subnet_name" {
  description = "Subnet name used by Memorystore service connection policy."
  type        = string
  default     = "crypto-compliance-valkey-psc-subnet"
}

variable "valkey_psc_subnet_cidr" {
  description = "CIDR range for Memorystore PSC subnet."
  type        = string
  default     = "10.40.0.0/29"
}
