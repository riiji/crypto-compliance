module "apis" {
  source = "./modules/apis"

  project_id         = var.project_id
  services           = var.enabled_apis
  disable_on_destroy = var.disable_api_on_destroy
}

module "artifact_registry" {
  source = "./modules/artifact_registry"

  project_id    = var.project_id
  location      = var.github_actions_artifact_registry_location
  repository_id = var.github_actions_artifact_registry_repository

  depends_on = [module.apis]
}

module "network" {
  source = "./modules/network"

  name                     = var.network_name
  region                   = var.region
  subnetwork_name          = var.subnetwork_name
  subnetwork_cidr          = var.subnetwork_cidr
  pods_secondary_range     = var.gke_pods_cidr
  pods_secondary_name      = var.gke_pods_range_name
  services_secondary_range = var.gke_services_cidr
  services_secondary_name  = var.gke_services_range_name
  labels                   = var.common_labels

  depends_on = [module.apis]
}

module "gke" {
  source = "./modules/gke"

  project_id                    = var.project_id
  name                          = var.gke_cluster_name
  location                      = var.gke_location
  network_name                  = module.network.network_name
  subnetwork_name               = module.network.subnetwork_name
  pods_secondary_range_name     = module.network.pods_secondary_range_name
  services_secondary_range_name = module.network.services_secondary_range_name
  node_count                    = var.gke_node_count
  node_machine_type             = var.gke_node_machine_type
  node_disk_size_gb             = var.gke_node_disk_size_gb
  node_disk_type                = var.gke_node_disk_type
  node_labels                   = var.common_labels
  node_tags                     = var.gke_node_tags
  release_channel               = var.gke_release_channel

  depends_on = [module.apis, module.network]
}

module "postgres" {
  source = "./modules/postgres"

  instance_name                  = var.postgres_instance_name
  region                         = var.region
  database_version               = var.postgres_database_version
  edition                        = var.postgres_edition
  tier                           = var.postgres_tier
  disk_size_gb                   = var.postgres_disk_size_gb
  disk_type                      = var.postgres_disk_type
  database_name                  = var.postgres_database_name
  user_name                      = var.postgres_user
  user_password                  = var.postgres_password
  network_self_link              = module.network.network_self_link
  private_service_cidr_prefix    = var.postgres_private_service_cidr_prefix
  private_service_cidr_prefixlen = var.postgres_private_service_cidr_prefixlen
  backup_enabled                 = var.postgres_backup_enabled
  maintenance_day                = var.postgres_maintenance_day
  maintenance_hour               = var.postgres_maintenance_hour
  labels                         = var.common_labels

  depends_on = [module.apis, module.network]
}

module "valkey" {
  source = "./modules/valkey"

  project_id              = var.project_id
  instance_id             = var.valkey_instance_id
  location                = var.valkey_location
  engine_version          = var.valkey_engine_version
  node_type               = var.valkey_node_type
  shard_count             = var.valkey_shard_count
  replica_count           = var.valkey_replica_count
  authorization_mode      = var.valkey_authorization_mode
  transit_encryption_mode = var.valkey_transit_encryption_mode
  mode                    = var.valkey_mode
  maintenance_day         = var.valkey_maintenance_day
  maintenance_hour        = var.valkey_maintenance_hour
  psc_subnet_name         = var.valkey_psc_subnet_name
  psc_subnet_cidr         = var.valkey_psc_subnet_cidr
  network_self_link       = module.network.network_self_link
  labels                  = var.common_labels

  depends_on = [module.apis, module.network]
}
