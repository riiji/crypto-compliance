output "namespace" {
  value = var.namespace
}

output "deployment_name" {
  value = kubernetes_deployment_v1.app.metadata[0].name
}

output "service_name" {
  value = kubernetes_service_v1.app.metadata[0].name
}

output "service_port" {
  value = kubernetes_service_v1.app.spec[0].port[0].port
}

output "backend_grpc_url" {
  value = local.effective_backend_grpc_url
}
