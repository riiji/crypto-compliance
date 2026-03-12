locals {
  selector_labels = {
    "app.kubernetes.io/name" = var.name
  }

  common_labels = merge(
    local.selector_labels,
    {
      "app.kubernetes.io/component"  = "cache"
      "app.kubernetes.io/part-of"    = "crypto-compliance"
      "app.kubernetes.io/managed-by" = "terraform"
    },
    var.labels,
  )
}

resource "kubernetes_deployment_v1" "deployment" {
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
          name  = "valkey"
          image = var.image

          port {
            name           = "valkey"
            container_port = var.port
          }

          dynamic "env" {
            for_each = var.env
            content {
              name  = env.key
              value = env.value
            }
          }

          readiness_probe {
            tcp_socket {
              port = "valkey"
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }

          liveness_probe {
            tcp_socket {
              port = "valkey"
            }
            initial_delay_seconds = 15
            period_seconds        = 20
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "service" {
  metadata {
    name      = var.name
    namespace = var.namespace
    labels    = local.common_labels
  }

  spec {
    selector = local.selector_labels
    type     = var.service_type

    port {
      name        = "valkey"
      protocol    = "TCP"
      port        = var.port
      target_port = var.port
    }
  }
}
