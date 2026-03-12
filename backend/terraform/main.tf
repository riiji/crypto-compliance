locals {
  selector_labels = {
    "app.kubernetes.io/name" = var.app_name
  }

  common_labels = merge(
    local.selector_labels,
    {
      "app.kubernetes.io/component"  = "backend"
      "app.kubernetes.io/managed-by" = "terraform"
      "app.kubernetes.io/part-of"    = "crypto-compliance"
    },
    var.app_labels,
  )

  postgres_private_ips = [
    for item in data.google_sql_database_instance.postgres.ip_address : item.ip_address
    if item.type == "PRIVATE"
  ]

  valkey_connections = flatten([
    for endpoint in try(data.google_memorystore_instance.valkey.endpoints, []) : try(endpoint.connections, [])
  ])

  valkey_psc_auto_connections = flatten([
    for connection in local.valkey_connections : try(connection.psc_auto_connection, [])
  ])

  postgres_host = length(local.postgres_private_ips) > 0 ? local.postgres_private_ips[0] : data.google_sql_database_instance.postgres.first_ip_address
  valkey_host   = try(local.valkey_psc_auto_connections[0].ip_address, "")
  valkey_port   = try(local.valkey_psc_auto_connections[0].port, var.valkey_port_fallback)

  default_env = {
    PORT                          = tostring(var.container_port)
    COMPLIANCE_POLICY_HMAC_SECRET = var.policy_hmac_secret
    COMPLIANCE_DB_HOST            = local.postgres_host
    COMPLIANCE_DB_PORT            = tostring(var.postgres_port)
    COMPLIANCE_DB_USER            = var.postgres_user
    COMPLIANCE_DB_PASSWORD        = var.postgres_password
    COMPLIANCE_DB_NAME            = var.postgres_db
    COMPLIANCE_VALKEY_HOST        = local.valkey_host
    COMPLIANCE_VALKEY_PORT        = tostring(local.valkey_port)
  }

  effective_env = merge(local.default_env, var.env)
}

resource "kubernetes_deployment_v1" "app" {
  metadata {
    name      = var.app_name
    namespace = local.target_namespace
    labels    = local.common_labels
  }

  spec {
    replicas = var.replicas

    selector {
      match_labels = local.selector_labels
    }

    template {
      metadata {
        labels = local.common_labels
      }

      spec {
        container {
          name              = var.app_name
          image             = var.image
          image_pull_policy = var.image_pull_policy

          port {
            name           = "http"
            container_port = var.container_port
          }

          dynamic "env" {
            for_each = local.effective_env
            content {
              name  = env.key
              value = env.value
            }
          }

          readiness_probe {
            tcp_socket {
              port = "http"
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }

          liveness_probe {
            tcp_socket {
              port = "http"
            }
            initial_delay_seconds = 15
            period_seconds        = 20
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "app" {
  metadata {
    name      = "${var.app_name}-svc"
    namespace = local.target_namespace
    labels    = local.common_labels
  }

  spec {
    selector = local.selector_labels
    type     = var.service_type

    port {
      name        = "http"
      protocol    = "TCP"
      port        = var.service_port
      target_port = var.container_port
    }
  }
}
