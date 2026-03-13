locals {
  grpc_port = var.grpc_service_port

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
            name           = "grpc"
            container_port = local.grpc_port
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
              if k != "CI" && k != "COMPLIANCE_GRPC_PORT" && k != "COREPACK_ENABLE_DOWNLOAD_PROMPT"
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

resource "kubernetes_service_v1" "grpc" {
  metadata {
    name      = "${var.app_name}-grpc-svc"
    namespace = var.namespace
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
