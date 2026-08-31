# TODO agent : VPC, subnets publics/privés, security groups
# Référence : smartfunding-infra TASKS.md §P9.1 "Préparation de l'Infrastructure Cloud"
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = { Name = "smartfunding-vpc" }
}

output "vpc_id" { value = aws_vpc.main.id }
output "subnet_ids" { value = [] } # TODO agent : compléter avec les vrais subnets
