variable "region" {
  default = "eu-west-3" # Paris
}
variable "k3s_agent_count" {
  description = "Nombre de nœuds agents k3s (1 server + N agents)"
  default     = 2
}
variable "environment" {
  default = "staging"
}
