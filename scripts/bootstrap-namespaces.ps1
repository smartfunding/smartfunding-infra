#Requires -Version 5.1
# bootstrap-namespaces.ps1 — Équivalent Windows de bootstrap-namespaces.sh
# Usage : powershell -ExecutionPolicy Bypass -File scripts\bootstrap-namespaces.ps1
$ErrorActionPreference = "Stop"
$InfraRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
kubectl apply -f "$InfraRoot\k3s\namespaces\"
kubectl apply -f "$InfraRoot\k3s\policies\"
Write-Output "Namespaces + policies Kyverno appliqués."
