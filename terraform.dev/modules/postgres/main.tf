locals {
  selector_labels = {
    "app.kubernetes.io/name" = var.name
  }

  common_labels = merge(
    local.selector_labels,
    {
      "app.kubernetes.io/component"  = "database"
      "app.kubernetes.io/part-of"    = "crypto-compliance"
      "app.kubernetes.io/managed-by" = "terraform"
    },
    var.labels,
  )
}

resource "kubernetes_secret_v1" "auth" {
  metadata {
    name      = "${var.name}-auth"
    namespace = var.namespace
    labels    = local.common_labels
  }

  data = {
    username = var.user
    password = var.password
  }
}

resource "kubernetes_deployment_v1" "this" {
  metadata {
    name      = var.name
    namespace = var.namespace
    labels    = local.common_labels
  }

  spec {
    replicas = 1

    selector {
      match_labels = local.selector_labels
    }

    template {
      metadata {
        labels = local.common_labels
      }

      spec {
        container {
          name  = "postgres"
          image = var.image

          port {
            name           = "postgres"
            container_port = var.port
          }

          env {
            name  = "POSTGRES_DB"
            value = var.db
          }

          env {
            name = "POSTGRES_USER"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.auth.metadata[0].name
                key  = "username"
              }
            }
          }

          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.auth.metadata[0].name
                key  = "password"
              }
            }
          }

          dynamic "env" {
            for_each = var.env
            content {
              name  = env.key
              value = env.value
            }
          }

          readiness_probe {
            exec {
              command = ["sh", "-c", "pg_isready -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\""]
            }
            initial_delay_seconds = 10
            period_seconds        = 10
          }

          liveness_probe {
            exec {
              command = ["sh", "-c", "pg_isready -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\""]
            }
            initial_delay_seconds = 30
            period_seconds        = 20
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "this" {
  metadata {
    name      = var.name
    namespace = var.namespace
    labels    = local.common_labels
  }

  spec {
    selector = local.selector_labels
    type     = var.service_type

    port {
      name        = "postgres"
      protocol    = "TCP"
      port        = var.port
      target_port = var.port
    }
  }
}
