locals {
  http_backend_config_name = "${var.app_name}-http-backendconfig"

  selector_labels = {
    "app.kubernetes.io/name" = var.app_name
  }

  common_labels = merge(
    local.selector_labels,
    {
      "app.kubernetes.io/component"  = "frontend"
      "app.kubernetes.io/managed-by" = "terraform"
      "app.kubernetes.io/part-of"    = "crypto-compliance"
    },
    var.app_labels,
  )

  ingress_host = var.ingress_host == null ? null : trimspace(var.ingress_host)
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

          env {
            name  = "PORT"
            value = tostring(var.container_port)
          }

          dynamic "env" {
            for_each = { for k, v in var.env : k => v if k != "PORT" }
            content {
              name  = env.key
              value = env.value
            }
          }

          readiness_probe {
            http_get {
              path = var.health_check_path
              port = "http"
            }
            initial_delay_seconds = 5
            period_seconds        = 10
          }

          liveness_probe {
            http_get {
              path = var.health_check_path
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
  depends_on = [kubernetes_manifest.http_backend_config]

  lifecycle {
    ignore_changes = [
      metadata[0].annotations["cloud.google.com/neg-status"],
    ]
  }

  metadata {
    name      = "${var.app_name}-svc"
    namespace = local.target_namespace
    labels    = local.common_labels
    annotations = {
      "cloud.google.com/backend-config" = jsonencode({
        default = local.http_backend_config_name
      })
      "cloud.google.com/neg" = jsonencode({
        ingress = true
      })
    }
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

resource "kubernetes_manifest" "http_backend_config" {
  manifest = {
    apiVersion = "cloud.google.com/v1"
    kind       = "BackendConfig"
    metadata = {
      name      = local.http_backend_config_name
      namespace = local.target_namespace
      labels    = local.common_labels
    }
    spec = {
      healthCheck = {
        type        = "HTTP"
        requestPath = var.health_check_path
        port        = var.container_port
      }
    }
  }
}

resource "kubernetes_ingress_v1" "app" {
  metadata {
    name        = "${var.app_name}-ing"
    namespace   = local.target_namespace
    labels      = local.common_labels
    annotations = var.ingress_annotations
  }

  spec {
    ingress_class_name = var.ingress_class_name

    rule {
      host = local.ingress_host

      http {
        path {
          path      = var.ingress_path
          path_type = var.ingress_path_type

          backend {
            service {
              name = kubernetes_service_v1.app.metadata[0].name

              port {
                number = var.service_port
              }
            }
          }
        }
      }
    }
  }
}
