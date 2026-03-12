locals {
  container_port = 3000
  grpc_port      = var.grpc_service_port

  selector_labels = {
    app = var.app_name
  }

  common_labels = merge(local.selector_labels, var.labels)
}

resource "kubernetes_deployment_v1" "app" {
  metadata {
    name      = var.app_name
    namespace = var.namespace
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
        volume {
          name = "source"

          host_path {
            path = var.host_repo_path
          }
        }

        container {
          name              = var.app_name
          image             = var.image
          image_pull_policy = var.image_pull_policy
          command           = ["sh", "-lc", "corepack enable && pnpm install && npm run start:dev"]
          working_dir       = var.workdir

          port {
            name           = "http"
            container_port = local.container_port
          }

          port {
            name           = "grpc"
            container_port = local.grpc_port
          }

          env {
            name  = "PORT"
            value = tostring(local.container_port)
          }

          env {
            name  = "CI"
            value = "true"
          }

          env {
            name  = "COMPLIANCE_GRPC_PORT"
            value = tostring(local.grpc_port)
          }

          env {
            name  = "COREPACK_ENABLE_DOWNLOAD_PROMPT"
            value = "0"
          }

          dynamic "env" {
            for_each = {
              for k, v in var.env : k => v
              if k != "PORT" && k != "CI" && k != "COMPLIANCE_GRPC_PORT" && k != "COREPACK_ENABLE_DOWNLOAD_PROMPT"
            }
            content {
              name  = env.key
              value = env.value
            }
          }

          volume_mount {
            name       = "source"
            mount_path = var.workdir
          }
        }
      }
    }
  }
}

resource "kubernetes_service_v1" "app" {
  metadata {
    name      = "${var.app_name}-svc"
    namespace = var.namespace
    labels    = local.common_labels
  }

  spec {
    selector = local.selector_labels
    type     = var.service_type

    port {
      name        = "http"
      protocol    = "TCP"
      port        = var.service_port
      target_port = local.container_port
    }
  }
}

resource "kubernetes_service_v1" "grpc" {
  metadata {
    name      = "${var.app_name}-grpc-svc"
    namespace = var.namespace
    labels    = local.common_labels
    annotations = {
      "traefik.ingress.kubernetes.io/service.serversscheme" = "h2c"
    }
  }

  spec {
    selector = local.selector_labels
    type     = "ClusterIP"

    port {
      name        = "grpc"
      protocol    = "TCP"
      port        = local.grpc_port
      target_port = local.grpc_port
    }
  }
}

resource "kubernetes_ingress_v1" "app" {
  metadata {
    name        = "${var.app_name}-ing"
    namespace   = var.namespace
    labels      = local.common_labels
    annotations = var.ingress_annotations
  }

  spec {
    ingress_class_name = "traefik"

    rule {
      http {
        path {
          path      = var.grpc_ingress_path
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service_v1.grpc.metadata[0].name

              port {
                number = local.grpc_port
              }
            }
          }
        }

        path {
          path      = "/"
          path_type = "Prefix"

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
