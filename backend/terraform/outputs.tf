output "namespace" {
  description = "Namespace used for deployment."
  value       = local.target_namespace
}

output "deployment_name" {
  description = "Kubernetes Deployment name."
  value       = kubernetes_deployment_v1.app.metadata[0].name
}

output "service_name" {
  description = "Kubernetes gRPC Service name."
  value       = kubernetes_service_v1.grpc.metadata[0].name
}

output "service_port" {
  description = "gRPC Service port."
  value       = kubernetes_service_v1.grpc.spec[0].port[0].port
}

output "service_cluster_ip" {
  description = "gRPC Service cluster IP."
  value       = kubernetes_service_v1.grpc.spec[0].cluster_ip
}

output "grpc_service_name" {
  description = "Kubernetes gRPC Service name."
  value       = kubernetes_service_v1.grpc.metadata[0].name
}

output "grpc_service_port" {
  description = "gRPC Service port."
  value       = kubernetes_service_v1.grpc.spec[0].port[0].port
}

output "grpc_load_balancer_ip" {
  description = "gRPC LoadBalancer external IP when assigned."
  value       = try(kubernetes_service_v1.grpc.status[0].load_balancer[0].ingress[0].ip, null)
}

output "grpc_load_balancer_hostname" {
  description = "gRPC LoadBalancer external hostname when assigned."
  value       = try(kubernetes_service_v1.grpc.status[0].load_balancer[0].ingress[0].hostname, null)
}

output "gke_cluster_name" {
  description = "Target GKE cluster name."
  value       = data.google_container_cluster.target.name
}

output "postgres_host" {
  description = "Resolved Cloud SQL host used by backend defaults."
  value       = local.postgres_host
}

output "valkey_host" {
  description = "Resolved Memorystore Valkey host used by backend defaults."
  value       = local.valkey_host
}
