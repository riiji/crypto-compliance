output "namespace" {
  description = "Namespace used for dev service."
  value       = var.namespace
}

output "deployment_name" {
  description = "Deployment name."
  value       = kubernetes_deployment_v1.app.metadata[0].name
}

output "service_name" {
  description = "gRPC Service name."
  value       = kubernetes_service_v1.grpc.metadata[0].name
}

output "service_port" {
  description = "gRPC Service port."
  value       = kubernetes_service_v1.grpc.spec[0].port[0].port
}

output "grpc_service_name" {
  description = "gRPC Service name."
  value       = kubernetes_service_v1.grpc.metadata[0].name
}

output "grpc_service_port" {
  description = "gRPC Service port."
  value       = kubernetes_service_v1.grpc.spec[0].port[0].port
}
