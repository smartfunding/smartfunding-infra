# TODO agent : provisionner les VMs (1 server + N agents) puis exécuter scripts/install-k3s.sh
# via remote-exec ou un rôle Ansible dédié (cf. TASKS.md §P7.2)
variable "vpc_id" {}
variable "subnet_ids" { type = list(string) }
variable "node_count" { default = 2 }

# resource "aws_instance" "k3s_server" { ... }
# resource "aws_instance" "k3s_agent" { count = var.node_count, ... }
