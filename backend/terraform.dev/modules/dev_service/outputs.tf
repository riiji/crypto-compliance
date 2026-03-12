output "namespace" {
  description = "Namespace used for dev service."
  value       = var.namespace
}

output "deployment_name" {
  description = "Deployment name."
  value       = kubernetes_deployment_v1.app.metadata[0].name
}

output "service_name" {
  description = "Service name."
  value       = kubernetes_service_v1.app.metadata[0].name
}

output "service_port" {
  description = "Service port."
  value       = kubernetes_service_v1.app.spec[0].port[0].port
}

output "grpc_service_name" {
  description = "gRPC Service name."
  value       = kubernetes_service_v1.grpc.metadata[0].name
}

output "grpc_service_port" {
  description = "gRPC Service port."
  value       = kubernetes_service_v1.grpc.spec[0].port[0].port
}

output "grpc_ingress_path" {
  description = "Ingress path prefix routed to the gRPC service."
  value       = var.grpc_ingress_path
}

output "ingress_name" {
  description = "Ingress name."
  value       = kubernetes_ingress_v1.app.metadata[0].name
}
