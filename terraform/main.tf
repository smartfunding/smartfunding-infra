terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    # ovh = { source = "ovh/ovh" }  # alternative si hébergement OVH retenu (cahier des charges §5.3)
  }
}

provider "aws" {
  region = var.region
}

module "network" {
  source = "./modules/network"
}

module "k8s_cluster" {
  source            = "./modules/k8s-cluster"
  vpc_id            = module.network.vpc_id
  subnet_ids        = module.network.subnet_ids
  security_group_id = module.network.k3s_sg_id
  node_count        = var.k3s_agent_count
}

module "database" {
  source     = "./modules/database"
  subnet_ids = module.network.private_subnet_ids
}

output "k3s_server_ip" { value = module.k8s_cluster.server_public_ip }
output "k3s_agent_ips" { value = module.k8s_cluster.agent_public_ips }
output "db_endpoint" { value = module.database.db_endpoint }
