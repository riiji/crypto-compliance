output "namespace" {
  value = module.service.namespace
}

output "deployment_name" {
  value = module.service.deployment_name
}

output "service_name" {
  value = module.service.service_name
}

output "service_port" {
  value = module.service.service_port
}

output "grpc_service_name" {
  value = module.service.grpc_service_name
}

output "grpc_service_port" {
  value = module.service.grpc_service_port
}
