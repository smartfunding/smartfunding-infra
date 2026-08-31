# SETUP.md — Environnement de développement SmartFunding Manager

Livrable de la tâche [P0.2] du plan (`smartfunding-infra.md`). Toute personne rejoignant le projet suit ce guide avant tout développement.

## 1. Outils requis

| Outil | Version | Vérification |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| pnpm | dernière | `pnpm --version` |
| TypeScript | 5.x | `pnpm tsc --version` |
| Python | 3.11+ | `python --version` |
| Docker Engine / Desktop | dernière | `docker --version` |
| Docker Compose | v2 | `docker compose version` |
| k3s | dernière stable | `k3s --version` |
| kubectl | compatible k3s | `kubectl version --client` |
| kustomize | dernière | `kustomize version` |
| Git + SSH | — | `ssh -T git@github.com` |

## 2. Outillage DevSecOps local

| Outil | Rôle | Installation |
|---|---|---|
| gitleaks | détection de secrets | `brew install gitleaks` / binaire GitHub releases |
| Semgrep | SAST | `pip install --break-system-packages semgrep` |
| Trivy | scan image/dépendances | binaire GitHub releases |
| Syft | génération SBOM | binaire GitHub releases |
| Cosign | signature d'image | binaire GitHub releases |
| kyverno CLI | test des policies hors-cluster | binaire GitHub releases |

## 3. Installation k3s (poste de développement)

```bash
curl -sfL https://get.k3s.io | sh -
sudo k3s kubectl get nodes
# Copier le kubeconfig pour usage sans sudo :
mkdir -p ~/.kube
sudo k3s kubectl config view --raw > ~/.kube/config
chmod 600 ~/.kube/config
export KUBECONFIG=~/.kube/config
```

Créer les namespaces de travail :
```bash
kubectl create namespace smartfunding-dev
kubectl create namespace smartfunding-staging
```

## 4. Outils de test API et de bases de données
- Postman ou Insomnia
- pgAdmin (PostgreSQL), MongoDB Compass, RedisInsight

## 5. Démarrage rapide (développement quotidien)

```bash
git clone git@github.com:smartfunding-manager/<service>.git
cd <service>
pnpm install
cp .env.example .env   # ne jamais committer .env
pnpm start:dev
```

Pour valider l'intégration complète (tous les services), utiliser `docker-compose up` depuis `smartfunding-infra`, ou déployer sur le k3s local (`kubectl apply -k k3s/overlays/dev`) pour une validation plus proche de la production.

## 6. Pré-commit
Chaque dépôt configure `husky` + `lint-staged` déclenchant automatiquement ESLint/Prettier (ou black/ruff en Python) et gitleaks avant chaque commit. Ne jamais utiliser `git commit --no-verify`.
