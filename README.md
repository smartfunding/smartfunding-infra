# smartfunding-infra

Dépôt transverse de la plateforme **SmartFunding Manager** : standards, cluster **k3s** (mécanisme de déploiement unique et de référence — dev, staging, production), sécurité DevSecOps, sobriété numérique, observabilité, CI/CD, IaC.

> **k3s, et uniquement k3s.** Aucun K8s vanilla, aucun EKS/GKE managé, aucun k3d/minikube en local : un seul binaire, un seul outil, du poste de développement à la démonstration finale. C'est un choix méthodologique assumé du mémoire (cohérence + sobriété — cf. `TASKS.md` §0.1 et `docs/adr/0001-k3s-devsecops-durable.md`).

## Cluster k3s (chemin de référence — dev, staging, production)
```bash
./scripts/install-k3s.sh          # nœud server (single-node en dev/démo, ou 1er nœud d'un cluster multi-nœuds)
./scripts/bootstrap-namespaces.sh # namespaces smartfunding-{dev,staging,prod} + policies Kyverno
# Puis, pour chaque service : kubectl apply -k ../smartfunding-<service>/k3s/overlays/dev
```

## Docker Compose (option de confort, itération rapide uniquement)
`docker-compose.yml` reste disponible pour un cycle d'édition/rechargement très rapide sur un seul service, **sans passer par le cluster**. Il ne remplace pas k3s : toute validation d'intégration, de sécurité (policies Kyverno) ou de mesure de durabilité (Kepler) se fait exclusivement sur k3s.
```bash
docker compose up   # confort local uniquement — non représentatif de l'environnement cible
```

## Documents de référence
- [`TASKS.md`](./TASKS.md) — plan complet (standards, sécurité, durabilité, CI/CD, déploiement, tests finaux, Alpha/Bêta)
- [`SETUP.md`](./SETUP.md) — guide d'installation de l'environnement de développement
- [`DESIGN_PATTERNS.md`](./DESIGN_PATTERNS.md) — les 6 patterns d'architecture retenus, avec diagrammes
- [`docs/adr/`](./docs/adr/) — décisions d'architecture
- [`terraform/`](./terraform/) — provisioning de l'infrastructure cloud (squelette à compléter)
- [`k3s/policies/`](./k3s/policies/) — policies Kyverno cluster-wide
- [`k3s/namespaces/`](./k3s/namespaces/) — définition des namespaces dev/staging/prod
