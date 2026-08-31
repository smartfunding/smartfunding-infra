#!/bin/bash
set -e
kubectl apply -f ../k3s/namespaces/
kubectl apply -f ../k3s/policies/
echo "Namespaces + policies Kyverno appliqués."
