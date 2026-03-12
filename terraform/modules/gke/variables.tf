variable "project_id" {
  description = "Project ID for workload identity pool wiring."
  type        = string
}

variable "name" {
  description = "GKE cluster name."
  type        = string
}

variable "location" {
  description = "GKE location (zone or region)."
  type        = string
}

variable "network_name" {
  description = "VPC network name for cluster nodes."
  type        = string
}

variable "subnetwork_name" {
  description = "Subnetwork name for cluster nodes."
  type        = string
}

variable "pods_secondary_range_name" {
  description = "Secondary range name used for Pods."
  type        = string
}

variable "services_secondary_range_name" {
  description = "Secondary range name used for Services."
  type        = string
}

variable "release_channel" {
  description = "GKE release channel."
  type        = string
}

variable "node_count" {
  description = "Node count in the primary node pool."
  type        = number
}

variable "node_machine_type" {
  description = "Machine type for node pool."
  type        = string
}

variable "node_disk_size_gb" {
  description = "Node disk size in GB."
  type        = number
}

variable "node_disk_type" {
  description = "Node disk type."
  type        = string
}

variable "node_labels" {
  description = "Labels attached to nodes."
  type        = map(string)
  default     = {}
}

variable "node_tags" {
  description = "Network tags attached to nodes."
  type        = list(string)
  default     = []
}
