output "namespace" {
  description = "Namespace used for deployment."
  value       = local.target_namespace
}

output "deployment_name" {
  description = "Kubernetes Deployment name."
  value       = kubernetes_deployment_v1.app.metadata[0].name
}

output "service_name" {
  description = "Kubernetes Service name."
  value       = kubernetes_service_v1.app.metadata[0].name
}

output "service_port" {
  description = "Service port."
  value       = kubernetes_service_v1.app.spec[0].port[0].port
}

output "service_cluster_ip" {
  description = "Service cluster IP."
  value       = kubernetes_service_v1.app.spec[0].cluster_ip
}

output "backend_grpc_url" {
  description = "Effective backend gRPC target configured for the gateway."
  value       = local.effective_backend_grpc_url
}

output "gke_cluster_name" {
  description = "Target GKE cluster name."
  value       = data.google_container_cluster.target.name
}

output "ingress_name" {
  description = "Kubernetes Ingress name."
  value       = kubernetes_ingress_v1.app.metadata[0].name
}

output "ingress_host" {
  description = "Configured ingress host."
  value       = kubernetes_ingress_v1.app.spec[0].rule[0].host
}

output "ingress_load_balancer_ip" {
  description = "Ingress external IP when assigned by controller."
  value       = try(kubernetes_ingress_v1.app.status[0].load_balancer[0].ingress[0].ip, null)
}

output "ingress_load_balancer_hostname" {
  description = "Ingress external hostname when assigned by controller."
  value       = try(kubernetes_ingress_v1.app.status[0].load_balancer[0].ingress[0].hostname, null)
}

output "http_backend_config_name" {
  description = "BackendConfig used by the HTTP ingress backend service."
  value       = local.http_backend_config_name
}
