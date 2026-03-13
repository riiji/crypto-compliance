locals {
  container_port = 3000

  selector_labels = {
    app = var.app_name
  }

  common_labels = merge(
    local.selector_labels,
    {
      "app.kubernetes.io/component" = "gateway-dev"
      "app.kubernetes.io/part-of"   = "crypto-compliance"
    },
  )

  default_backend_grpc_url = "${var.backend_app_name}-grpc-svc.${var.namespace}.svc.cluster.local:${var.backend_grpc_port}"
  effective_backend_grpc_url = (
    var.backend_grpc_url == null || trimspace(var.backend_grpc_url) == ""
    ? local.default_backend_grpc_url
    : trimspace(var.backend_grpc_url)
  )

  effective_env = merge(
    {
      PORT                            = tostring(local.container_port)
      CI                              = "true"
      COREPACK_ENABLE_DOWNLOAD_PROMPT = "0"
      COMPLIANCE_BACKEND_GRPC_URL     = local.effective_backend_grpc_url
      COMPLIANCE_ADMIN_JWT_SECRET     = var.admin_jwt_secret
      COMPLIANCE_INTERNAL_HMAC_SECRET = var.internal_hmac_secret
    },
    var.env,
  )
}

resource "kubernetes_deployment_v1" "app" {
  metadata {
    name      = var.app_name
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
          command = [
            "sh",
            "-lc",
            "corepack enable && pnpm install && npm run start:dev",
          ]
          working_dir = "/workspace"

          port {
            name           = "http"
            container_port = local.container_port
          }

          dynamic "env" {
            for_each = local.effective_env
            content {
              name  = env.key
              value = env.value
            }
          }

          volume_mount {
            name       = "source"
            mount_path = "/workspace"
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
