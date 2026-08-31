#!/bin/bash
set -e
curl -sfL https://get.k3s.io | sh -
sudo k3s kubectl get nodes
mkdir -p ~/.kube
sudo k3s kubectl config view --raw > ~/.kube/config
chmod 600 ~/.kube/config
echo "export KUBECONFIG=~/.kube/config" >> ~/.bashrc
echo "Token pour joindre des agents :"
sudo cat /var/lib/rancher/k3s/server/node-token
