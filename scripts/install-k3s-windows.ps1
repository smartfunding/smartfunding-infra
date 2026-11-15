#Requires -Version 5.1
# install-k3s-windows.ps1 — k3s ne s'installe PAS nativement sur Windows.
# Trois options supportées :
#   1. WSL2 + Ubuntu (recommandé, vrai k3s single-node) — choix par défaut
#   2. Docker Desktop > Settings > Kubernetes > Enable (k8s vanilla de confort, NON représentatif)
#   3. VM (Hyper-V / VirtualBox) Ubuntu + scripts/install-k3s.sh
#
# Usage : powershell -ExecutionPolicy Bypass -File scripts\install-k3s-windows.ps1
$ErrorActionPreference = "Stop"

Write-Output "=== SmartFunding : installation k3s (hôte Windows) ==="
Write-Output ""
Write-Output "[1/3] Vérification WSL2..."
wsl --status
if ($LASTEXITCODE -ne 0) {
  Write-Output "WSL non détecté. Installez-le : wsl --install -d Ubuntu puis relancez ce script."
  exit 1
}

Write-Output ""
Write-Output "[2/3] Installation k3s dans Ubuntu (WSL2)..."
wsl -d Ubuntu -- bash -c "curl -sfL https://get.k3s.io | sh - && sudo k3s kubectl get nodes"

Write-Output ""
Write-Output "[3/3] Export du kubeconfig vers Windows (~/.kube/config)..."
$KubeDir = Join-Path $HOME ".kube"
New-Item -ItemType Directory -Force -Path $KubeDir | Out-Null
wsl -d Ubuntu -- bash -c "sudo k3s kubectl config view --raw" | Out-File -FilePath (Join-Path $KubeDir "config") -Encoding ascii
Write-Output "Kubeconfig exporté vers $KubeDir\config"
Write-Output "Test : kubectl get nodes"
kubectl get nodes
Write-Output ""
Write-Output "Suite : .\scripts\bootstrap-namespaces.ps1"
