locals {
  apis = [
    "artifactregistry.googleapis.com",
    "compute.googleapis.com",
    "container.googleapis.com",
    "iam.googleapis.com",
    "memorystore.googleapis.com",
    "networkconnectivity.googleapis.com",
    "redis.googleapis.com",
    "sqladmin.googleapis.com",
    "servicenetworking.googleapis.com",
  ]

  disable_api_on_destroy = false

  github_actions = {
    service_account_id           = "github-actions-deployer"
    service_account_display_name = "GitHub Actions Deployer"
    service_account_description  = "Service account used by GitHub Actions to push images and deploy to GKE."
    project_roles = [
      "roles/container.developer",
      "roles/serviceusage.serviceUsageConsumer",
    ]
    artifact_registry_repository      = "crypto-compliance"
    artifact_registry_repository_role = "roles/artifactregistry.writer"
  }

  network = {
    name                     = "crypto-compliance-vpc"
    subnetwork_name          = "crypto-compliance-subnet"
    subnetwork_cidr          = "10.10.0.0/20"
    pods_secondary_name      = "gke-pods"
    pods_secondary_range     = "10.20.0.0/16"
    services_secondary_name  = "gke-services"
    services_secondary_range = "10.30.0.0/20"
  }

  gke = {
    cluster_name      = "crypto-compliance-gke"
    release_channel   = "REGULAR"
    node_count        = 1
    node_machine_type = "e2-standard-2"
    node_disk_size_gb = 100
    node_disk_type    = "pd-standard"
    node_tags         = []
  }

  postgres = {
    instance_name                  = "crypto-compliance-postgres"
    database_version               = "POSTGRES_18"
    edition                        = "ENTERPRISE"
    tier                           = "db-f1-micro"
    disk_size_gb                   = 20
    disk_type                      = "PD_SSD"
    database_name                  = "compliance"
    user_name                      = "compliance"
    private_service_cidr_prefix    = "crypto-compliance-sql-private-range"
    private_service_cidr_prefixlen = 16
    backup_enabled                 = true
    maintenance_day                = 7
    maintenance_hour               = 3
  }

  valkey = {
    instance_id             = "crypto-compliance-valkey"
    engine_version          = "VALKEY_9_0"
    node_type               = "SHARED_CORE_NANO"
    shard_count             = 1
    replica_count           = 0
    authorization_mode      = "AUTH_DISABLED"
    transit_encryption_mode = "TRANSIT_ENCRYPTION_DISABLED"
    mode                    = "CLUSTER_DISABLED"
    maintenance_day         = "SUNDAY"
    maintenance_hour        = 4
    psc_subnet_name         = "crypto-compliance-valkey-psc-subnet"
    psc_subnet_cidr         = "10.40.0.0/29"
  }
}

module "apis" {
  source = "./modules/apis"

  project_id         = var.project_id
  services           = local.apis
  disable_on_destroy = local.disable_api_on_destroy
}

module "artifact_registry" {
  source = "./modules/artifact_registry"

  project_id    = var.project_id
  location      = var.region
  repository_id = local.github_actions.artifact_registry_repository

  depends_on = [module.apis]
}

module "network" {
  source = "./modules/network"

  name                     = local.network.name
  region                   = var.region
  subnetwork_name          = local.network.subnetwork_name
  subnetwork_cidr          = local.network.subnetwork_cidr
  pods_secondary_range     = local.network.pods_secondary_range
  pods_secondary_name      = local.network.pods_secondary_name
  services_secondary_range = local.network.services_secondary_range
  services_secondary_name  = local.network.services_secondary_name
  labels                   = var.common_labels

  depends_on = [module.apis]
}

module "gke" {
  source = "./modules/gke"

  project_id                    = var.project_id
  name                          = local.gke.cluster_name
  location                      = var.zone
  network_name                  = module.network.network_name
  subnetwork_name               = module.network.subnetwork_name
  pods_secondary_range_name     = module.network.pods_secondary_range_name
  services_secondary_range_name = module.network.services_secondary_range_name
  node_count                    = local.gke.node_count
  node_machine_type             = local.gke.node_machine_type
  node_disk_size_gb             = local.gke.node_disk_size_gb
  node_disk_type                = local.gke.node_disk_type
  node_labels                   = var.common_labels
  node_tags                     = local.gke.node_tags
  release_channel               = local.gke.release_channel

  depends_on = [module.apis, module.network]
}

module "postgres" {
  source = "./modules/postgres"

  instance_name                  = local.postgres.instance_name
  region                         = var.region
  database_version               = local.postgres.database_version
  edition                        = local.postgres.edition
  tier                           = local.postgres.tier
  disk_size_gb                   = local.postgres.disk_size_gb
  disk_type                      = local.postgres.disk_type
  database_name                  = local.postgres.database_name
  user_name                      = local.postgres.user_name
  user_password                  = var.postgres_password
  network_self_link              = module.network.network_self_link
  private_service_cidr_prefix    = local.postgres.private_service_cidr_prefix
  private_service_cidr_prefixlen = local.postgres.private_service_cidr_prefixlen
  backup_enabled                 = local.postgres.backup_enabled
  maintenance_day                = local.postgres.maintenance_day
  maintenance_hour               = local.postgres.maintenance_hour
  labels                         = var.common_labels

  depends_on = [module.apis, module.network]
}

module "valkey" {
  source = "./modules/valkey"

  project_id              = var.project_id
  instance_id             = local.valkey.instance_id
  location                = var.region
  engine_version          = local.valkey.engine_version
  node_type               = local.valkey.node_type
  shard_count             = local.valkey.shard_count
  replica_count           = local.valkey.replica_count
  authorization_mode      = local.valkey.authorization_mode
  transit_encryption_mode = local.valkey.transit_encryption_mode
  mode                    = local.valkey.mode
  maintenance_day         = local.valkey.maintenance_day
  maintenance_hour        = local.valkey.maintenance_hour
  psc_subnet_name         = local.valkey.psc_subnet_name
  psc_subnet_cidr         = local.valkey.psc_subnet_cidr
  network_self_link       = module.network.network_self_link
  labels                  = var.common_labels

  depends_on = [module.apis, module.network]
}
