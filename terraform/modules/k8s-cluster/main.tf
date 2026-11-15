# modules/k8s-cluster — 1 server k3s + N agents (cf. TASKS.md §P7.2 / §P9.1)
# Installe k3s via remote-exec avec scripts/install-k3s.sh + install-k3s-agent.sh
variable "vpc_id" {}
variable "subnet_ids" { type = list(string) }
variable "security_group_id" {
  type    = string
  default = ""
}
variable "node_count" { default = 2 }
variable "instance_type" { default = "t3.medium" }
variable "server_instance_type" { default = "t3.medium" }
variable "ssh_key_name" {
  description = "Nom de la keypair AWS pour le SSH"
  type        = string
  default     = "smartfunding-k3s"
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "k3s_server" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.server_instance_type
  subnet_id              = var.subnet_ids[0]
  vpc_security_group_ids = compact([var.security_group_id])
  key_name               = var.ssh_key_name
  tags                   = { Name = "smartfunding-k3s-server", Role = "server" }

  provisioner "file" {
    source      = "${path.module}/../../../scripts/install-k3s.sh"
    destination = "/tmp/install-k3s.sh"
  }
  provisioner "remote-exec" {
    inline = ["chmod +x /tmp/install-k3s.sh", "sudo /tmp/install-k3s.sh"]
  }
}

resource "aws_instance" "k3s_agent" {
  count                  = var.node_count
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_ids[count.index % length(var.subnet_ids)]
  vpc_security_group_ids = compact([var.security_group_id])
  key_name               = var.ssh_key_name
  tags                   = { Name = "smartfunding-k3s-agent-${count.index}", Role = "agent" }

  provisioner "file" {
    source      = "${path.module}/../../../scripts/install-k3s-agent.sh"
    destination = "/tmp/install-k3s-agent.sh"
  }
  # K3S_URL + K3S_TOKEN à injecter via les variables d'env du provisioner en prod
  provisioner "remote-exec" {
    inline = ["chmod +x /tmp/install-k3s-agent.sh", "echo 'agent ready — joindre avec K3S_URL=https://<server>:6443 K3S_TOKEN=<token>'"]
  }
}

output "server_public_ip" { value = aws_instance.k3s_server.public_ip }
output "agent_public_ips" { value = aws_instance.k3s_agent[*].public_ip }
