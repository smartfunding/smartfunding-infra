# INSTALL.md — Installation locale pas-à-pas (Windows + Linux)

## 0. Prérequis (vérifié sur ce poste : Docker 29, Node 25, Python 3.11, kubectl, Terraform)

| Outil | Windows | Vérification |
|---|---|---|
| Docker Desktop (WSL2 backend) | https://docs.docker.com/desktop/install/windows-install/ | `docker --version` + `docker compose version` |
| Node.js 20 LTS | https://nodejs.org | `node --version` |
| Python 3.11+ | https://www.python.org/downloads/ | `python --version` |
| kubectl | `winget install Kubernetes.kubectl` | `kubectl version --client` |
| Terraform (prod cloud uniquement) | `winget install HashiCorp.Terraform` | `terraform -version` |
| k3s | Via WSL2 Ubuntu, voir §3 | `kubectl get nodes` |

## 1. Contrats partagés (préalable absolu — déjà buildé sur ce poste)

```powershell
cd smartfunding-infra\contracts
npm install
npm run build
dir dist\index.js, dist\index.d.ts   # doivent exister
```

## 2. Infra Docker (recommandé Windows — fonctionne SANS les 12 autres dépôts)

```powershell
cd smartfunding-infra
Copy-Item .env.example .env   # ajuster si besoin
docker compose -f docker-compose.infra.yml up -d
docker compose -f docker-compose.infra.yml ps
```

Vérifications :

```powershell
docker exec smartfunding-postgres-1 pg_isready -U postgres
docker exec smartfunding-redis-1 redis-cli ping
curl http://localhost:9200/_cluster/health
curl http://localhost:9090/-/healthy
curl http://localhost:3030/login        # Grafana admin/admin
http://localhost:15672                  # RabbitMQ smartfunding/smartfunding
http://localhost:9001                   # MinIO minioadmin/minioadmin
```

Variante dev (allégée) : `docker compose -f docker-compose.infra.yml -f docker-compose.dev.yml up -d`

Plateforme complète (quand les 13 dépôts frères existent) :
`docker compose --profile app up -d --build`

## 3. k3s (validation d'intégration — obligatoire avant toute PR)

k3s ne tourne pas nativement sur Windows. Sur ce poste, passer par WSL2 :

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-k3s-windows.ps1
powershell -ExecutionPolicy Bypass -File scripts\bootstrap-namespaces.ps1
kubectl get nodes
kubectl get ns | Select-String smartfunding
kubectl kustomize k3s/overlays/dev --enable-helm | kubectl apply --dry-run=client -f -
```

Sur Linux/VM : `./scripts/install-k3s.sh` puis `./scripts/bootstrap-namespaces.sh`.

## 4. Ports réservés (cf. TASKS.md §P0.3)

Web 3000, Gateway 4000, Auth 3001, Projects 3002, Documents 3003, Funders 3004,
AI 3005, Workflow 3006, Notifications 3007, Billing 3008, OCR 3010 (corrigé, était en
conflit avec Workflow), Postgres 5432, Mongo 27017, Redis 6379, ES 9200,
RabbitMQ 5672/15672, Prometheus 9090, Grafana 3030, MinIO 9000/9001, Temporal 7233.

## 5. Dépannage

- `docker compose` échoue sur `build ../smartfunding-*` : normal sans les dépôts frères.
  Utilisez `docker-compose.infra.yml` (aucun build).
- Postgres `role does not exist` : supprimez le volume (`docker compose -f
  docker-compose.infra.yml down -v`) pour rejouer `docker/postgres-init/01-create-dbs.sh`.
- Elasticsearch OOM : utilisez `docker-compose.dev.yml` (heap 256m).
- Temporal en crash-loop : attendez `postgres healthy` (les DBs temporal sont créées par le script init).
