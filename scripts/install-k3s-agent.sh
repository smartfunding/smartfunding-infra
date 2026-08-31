#!/bin/bash
set -e
: "${K3S_URL:?Définir K3S_URL=https://<ip-server>:6443}"
: "${K3S_TOKEN:?Définir K3S_TOKEN=<token du serveur>}"
curl -sfL https://get.k3s.io | K3S_URL="$K3S_URL" K3S_TOKEN="$K3S_TOKEN" sh -
