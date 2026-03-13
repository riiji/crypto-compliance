locals {
  grpc_port = 50051

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

  postgres_host = local.root_outputs.postgres_host
  valkey_host   = local.root_outputs.valkey_host
  valkey_port   = local.root_outputs.valkey_port

  default_env = {
    COMPLIANCE_GRPC_PORT          = tostring(local.grpc_port)
    COMPLIANCE_POLICY_HMAC_SECRET = var.policy_hmac_secret
    COMPLIANCE_DB_HOST            = local.postgres_host
    COMPLIANCE_DB_PORT            = tostring(local.root_outputs.postgres_port)
    COMPLIANCE_DB_USER            = local.root_outputs.postgres_user
    COMPLIANCE_DB_PASSWORD        = var.postgres_password
    COMPLIANCE_DB_NAME            = local.root_outputs.postgres_database_name
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
            name           = "grpc"
            container_port = local.grpc_port
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
              port = "grpc"
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }

          liveness_probe {
            tcp_socket {
              port = "grpc"
            }
            initial_delay_seconds = 15
            period_seconds        = 20
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "grpc" {
  metadata {
    name      = "${var.app_name}-grpc-svc"
    namespace = local.target_namespace
    labels    = local.common_labels
  }

  spec {
    selector = local.selector_labels
    type     = var.service_type

    port {
      name        = "grpc"
      protocol    = "TCP"
      port        = local.grpc_port
      target_port = local.grpc_port
    }
  }
}
