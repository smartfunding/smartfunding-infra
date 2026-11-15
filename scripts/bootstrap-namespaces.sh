#!/bin/bash
# bootstrap-namespaces.sh — Crée les namespaces + applique les policies Kyverno.
# Fonctionne quel que soit le répertoire d'appel (résout SCRIPT_DIR).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_ROOT="$(dirname "$SCRIPT_DIR")"
kubectl apply -f "$INFRA_ROOT/k3s/namespaces/"
kubectl apply -f "$INFRA_ROOT/k3s/policies/"
echo "Namespaces + policies Kyverno appliqués."
