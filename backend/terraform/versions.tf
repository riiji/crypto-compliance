terraform {
  required_version = "~> 1.14.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.23.0"
    }

    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 3.0.1"
    }
  }
}
