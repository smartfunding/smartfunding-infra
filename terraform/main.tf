terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
    # ovh = { source = "ovh/ovh" }  # alternative si hébergement OVH retenu (cahier des charges §5.3)
  }
}

module "network" {
  source = "./modules/network"
}

module "k8s_cluster" {
  source     = "./modules/k8s-cluster"
  vpc_id     = module.network.vpc_id
  subnet_ids = module.network.subnet_ids
  node_count = var.k3s_agent_count
}

module "database" {
  source     = "./modules/database"
  subnet_ids = module.network.subnet_ids
}
