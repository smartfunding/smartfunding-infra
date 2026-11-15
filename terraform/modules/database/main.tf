# modules/database — RDS PostgreSQL managé (prod). En dev/démo, les bases
# tournent dans le cluster (local-path-provisioner) — cf. TASKS.md §0.1.
variable "subnet_ids" { type = list(string) }
variable "instance_class" { default = "db.t3.micro" }
variable "allocated_storage" { default = 20 }
variable "db_name" { default = "smartfunding" }
variable "username" { default = "smartfunding" }

resource "aws_db_subnet_group" "main" {
  name       = "smartfunding-db-subnet"
  subnet_ids = var.subnet_ids
  tags       = { Name = "smartfunding-db-subnet" }
}

resource "aws_db_instance" "postgres" {
  identifier             = "smartfunding-postgres"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.instance_class
  allocated_storage      = var.allocated_storage
  db_name                = var.db_name
  username               = var.username
  manage_master_user_password = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  backup_retention_period = 7
  deletion_protection    = true
  storage_encrypted      = true
  tags                   = { Name = "smartfunding-postgres" }
}

output "db_endpoint" { value = aws_db_instance.postgres.endpoint }
output "db_name" { value = aws_db_instance.postgres.db_name }
