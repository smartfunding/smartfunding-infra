# smartfunding-infra — Infrastructure, Standards, DevSecOps & Plateforme Durable

**Stack :** k3s (Kubernetes léger), Docker/Docker Compose, Terraform, GitHub Actions, ELK Stack, Prometheus/Grafana, Jaeger/OpenTelemetry, Kepler (mesure énergétique), Kyverno (policy-as-code), Cosign/Syft/Trivy (supply chain), HashiCorp Vault, Cloudflare WAF
**Rôle :** ce dépôt porte tout ce qui est transverse aux 10 autres dépôts : standards d'équipe, environnement, message queue, cluster k3s, sécurité DevSecOps, sobriété numérique, observabilité, CI/CD, IaC, déploiement local et production, conformité, pilotage des tests finaux et du lancement.
**Contexte :** ce dépôt et l'ensemble de la plateforme SmartFunding Manager servent de démonstrateur pour un mémoire de Master 2 sur une approche **DevSecOps durable (sustainable)**. Toutes les tâches originales du Plan de Travail Complet sont conservées intégralement ; ce document ajoute la déclinaison k3s, la sécurité intégrée au pipeline et la mesure/réduction de l'empreinte énergétique.

> Ce document liste, sans rien retirer au Plan de Travail Complet SmartFunding Manager, toutes les tâches et sous-tâches transverses nécessaires pour amener la plateforme à un état production-ready, pleinement fonctionnelle, sécurisée par conception et sobre en ressources.

---

## 0. Cadre DevSecOps & Durable (méthodologie du mémoire, référencée par les 13 dépôts)

### 0.1 Pourquoi k3s (et pas un K8s vanilla, k3d ou minikube en production)
- [ ] Adopter **k3s** comme cluster unique, du poste de développement jusqu'à la démonstration finale, en remplacement de k3d/minikube (local) et d'un K8s générique (production) prévus initialement dans le plan
- [ ] Argumentaire à documenter dans le mémoire : k3s est un binaire unique (< 100 Mo), embarque SQLite (mode single-server) ou etcd (mode HA multi-server), consomme nettement moins de RAM/CPU au niveau du plan de contrôle qu'un K8s vanilla — cohérent avec une démarche de sobriété numérique (moins d'infrastructure de contrôle = moins d'énergie consommée pour un même service rendu)
- [ ] Un seul outil sur tout le cycle de vie réduit la complexité opérationnelle (moins de divergence dev/prod, moins de risque de configuration incohérente) — argument DevSecOps ET durable
- [ ] Installation server (nœud unique, poste de dev / démo) :
  ```
  curl -sfL https://get.k3s.io | sh -
  ```
- [ ] Pour une démonstration multi-nœuds (recommandé pour la soutenance, ex. 1 server + 2 agents sur VMs ou Raspberry Pi) :
  ```
  # Sur le nœud server
  curl -sfL https://get.k3s.io | sh -
  cat /var/lib/rancher/k3s/server/node-token
  # Sur chaque nœud agent
  curl -sfL https://get.k3s.io | K3S_URL=https://<ip-server>:6443 K3S_TOKEN=<token> sh -
  ```
- [ ] Composants natifs k3s à exploiter tels quels (pas de réinvention) : **Traefik** (ingress controller par défaut), **ServiceLB** (LoadBalancer natif, remplace MetalLB pour la démo), **local-path-provisioner** (stockage par défaut pour PostgreSQL/MongoDB/Redis en dev), **Network Policy Controller intégré** (basé sur kube-router : les ressources `NetworkPolicy` standards fonctionnent nativement, même avec le CNI Flannel par défaut — pas besoin de Calico/Cilium pour un cloisonnement de base)
- [ ] Documenter le choix de stockage pour la production : `local-path-provisioner` convient pour une démo/mémoire (nœud unique) ; pour une vraie production multi-nœuds, prévoir Longhorn (stockage distribué, reste léger et cohérent avec l'esprit k3s) — à mentionner comme perspective dans le mémoire si non implémenté

### 0.2 Cadre DevSecOps (sécurité intégrée à chaque étape du pipeline)
Modèle retenu : intégration de la sécurité à chaque étape **Plan → Code → Build → Test → Release → Deploy → Operate → Monitor**, en cohérence avec le OWASP DevSecOps Maturity Model (DSOMM) et le NIST Secure Software Development Framework (SSDF), à citer comme cadre de référence académique dans le mémoire.

| Étape | Objectif sécurité | Outil retenu |
|---|---|---|
| Plan | Threat modeling par service (STRIDE) | OWASP Threat Dragon |
| Code | Détection de secrets avant commit | gitleaks (pre-commit hook) |
| Code | Analyse statique du code (SAST) | Semgrep (règles OWASP Top 10 + règles par langage) |
| Build | Analyse de composition logicielle (SCA) | Trivy fs / Snyk (dépendances) |
| Build | Génération de nomenclature logicielle | Syft → SBOM au format CycloneDX |
| Test | Scan des manifestes Kubernetes (IaC) | kube-score, Checkov |
| Test | Test d'intrusion applicatif (DAST) | OWASP ZAP |
| Release | Scan de l'image container | Trivy image |
| Release | Signature de l'image (supply chain) | Cosign (signature keyless via OIDC GitHub Actions) |
| Deploy | Admission control / policy-as-code | Kyverno (refuse une image non signée ou sans SBOM) |
| Deploy | Durcissement des Pods | Pod Security Standards, profil `restricted` |
| Deploy | Cloisonnement réseau | NetworkPolicy k3s (default-deny + règles explicites) |
| Operate | Gestion des secrets | HashiCorp Vault |
| Operate | Détection d'anomalies runtime | Falco |
| Monitor | Re-scan périodique des images en prod | Trivy (cron hebdomadaire) |

- [ ] Décliner ce tableau dans chaque dépôt (checklist déjà intégrée dans chaque fichier `.md` de service, section « Sécurité DevSecOps »)
- [ ] Mesurer un **niveau de maturité DSOMM** avant/après pour la plateforme (indicateur quantitatif à présenter dans le mémoire)
- [ ] KPI à suivre : % d'étapes automatisées dans le pipeline, MTTR (Mean Time To Remediate) des vulnérabilités CRITICAL/HIGH, nombre de vulnérabilités détectées avant vs après mise en production

### 0.3 Cadre Sustainable / Green Software (sobriété numérique mesurée)
Cadre de référence académique : les principes de la **Green Software Foundation** (Energy Efficiency, Hardware Efficiency, Carbon Awareness) et l'indicateur **SCI — Software Carbon Intensity** : `SCI = (E × I + M) / R` (E = énergie consommée, I = intensité carbone de l'électricité, M = émissions matérielles incorporées, R = unité fonctionnelle, ex. par requête traitée) — à citer et appliquer dans le mémoire.

- [ ] Déployer **Kepler** (Kubernetes-based Efficient Power Level Exporter, CNCF Sandbox) sur le cluster k3s : exporte des métriques Prometheus de consommation énergétique par pod/namespace/service
- [ ] Utiliser Kepler ≥ 0.10 (réécriture qui lit `/proc` et `/sys` plutôt que de dépendre d'eBPF privilégié) — plus simple à déployer sur un cluster k3s single-node sans droits noyau étendus
- [ ] Construire des dashboards Grafana dédiés : kWh consommés par service, tendance de la SCI dans le temps, comparaison avant/après optimisation (right-sizing, scale-to-zero)
- [ ] Compléter, si pertinent pour le mémoire, par **Cloud Carbon Footprint** (estimation à partir des données de facturation/usage cloud) si un hébergement cloud est utilisé pour la démonstration finale
- [ ] Principes appliqués systématiquement (déclinés service par service, voir section « Durabilité » de chaque fichier `.md`) :
  - **Right-sizing** : `resources.requests`/`limits` dimensionnés au plus juste (jamais de valeurs par défaut arbitraires), validés via les recommandations du **Vertical Pod Autoscaler** en mode « Off » (recommandation seule, sans action automatique)
  - **Scale-to-zero** : utilisation de **KEDA** pour les services à trafic faible ou événementiel (ex. Notifications, Billing), afin d'éteindre les pods en période creuse et réduire la consommation énergétique réelle
  - **Images minimales** : bases `alpine` ou `distroless` (moins de surface d'attaque ET moins de Mo à stocker/transférer = moins d'énergie réseau/stockage)
  - **Cache et requêtes optimisées** : réduire les cycles CPU inutiles (Redis déjà prévu dans le plan pour le matching et les sessions)
  - **Labellisation systématique** des ressources Kubernetes (`app.kubernetes.io/name`, `component`) pour permettre l'attribution précise des métriques Kepler par service

### 0.4 Traçabilité pour le mémoire
- [ ] Tenir un tableau de bord (feuille de calcul ou dashboard Grafana dédié) « Avant / Après » sur au moins 3 axes : sécurité (nb. vulnérabilités, MTTR), durabilité (kWh/service, taux d'utilisation réel des ressources allouées), fiabilité (disponibilité, MTTR incidents)
- [ ] Documenter chaque décision d'architecture DevSecOps/durable sous forme d'ADR (Architecture Decision Record) dans `docs/adr/` — matière première directe pour la rédaction du mémoire

---

## PHASE 0 — Préparation & Environnement *(⏱ 3–5 jours)*

### [P0.1] Créer les Repositories
- [ ] Créer le dépôt `smartfunding-infra` (k3s, Terraform, pipelines DevSecOps), arborescence standard `src/`, `tests/`, `docs/`, `docker/`
- [ ] S'assurer que les 13 dépôts existent, chacun initialisé avec `.gitignore`, `README.md`, `LICENSE` et arborescence standard :
  `smartfunding-gateway`, `smartfunding-auth`, `smartfunding-projects`, `smartfunding-documents`, `smartfunding-funders`, `smartfunding-ai`, `smartfunding-workflow`, `smartfunding-notifications`, `smartfunding-billing`, `smartfunding-onboarding`, `smartfunding-web`, `smartfunding-mobile`, `smartfunding-infra`

### [P0.2] Configurer l'Environnement Local
Chaque contributeur installe et vérifie :
- [ ] Node.js 20 LTS + pnpm (`node --version`)
- [ ] TypeScript 5.x
- [ ] Python 3.11+ avec pip et venv (`python --version`)
- [ ] Docker Desktop / Docker Engine + Docker Compose v2
- [ ] **k3s** (`curl -sfL https://get.k3s.io | sh -`) + `kubectl` (alias `k3s kubectl` ou kubeconfig copié dans `~/.kube/config`)
- [ ] Outillage DevSecOps local : gitleaks, Semgrep, Trivy, Syft, Cosign, kubectl-kyverno (CLI de test des policies hors-cluster)
- [ ] Postman ou Insomnia pour tester les APIs
- [ ] pgAdmin (PostgreSQL), MongoDB Compass, RedisInsight
- [ ] Git configuré avec clé SSH vers GitHub
- [ ] **Livrable :** fichier `SETUP.md` listant versions et commandes de vérification (mis à jour avec la stack k3s + DevSecOps)

### [P0.3] Définir les Standards du Projet
**Git Flow**
- [ ] `main` (production), `develop` (intégration), `feature/*`, `hotfix/*`
- [ ] Convention de commit : Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`…)
- [ ] Pull request obligatoire avec au moins 1 revue avant merge sur `develop`
- [ ] Branche `main` protégée : aucun push direct
- [ ] **Livrable :** documenter ces règles dans un `CONTRIBUTING.md`/`CONVENTIONS.md` référencé par les 13 dépôts

**Ports des services (à réserver dès maintenant)**
| Composant | Port |
|---|---|
| Frontend Web (Next.js) | 3000 |
| API Gateway | 4000 |
| Auth Service | 3001 |
| Projects Service | 3002 |
| Documents Service | 3003 |
| Funders Service | 3004 |
| AI Service (FastAPI) | 3005 |
| Workflow Service | 3006 |
| Notifications Service | 3007 |
| Billing Service | 3008 |
| Onboarding Service | 3009 |
| PostgreSQL | 5432 |
| MongoDB | 27017 |
| Redis | 6379 |
| Elasticsearch | 9200 |
| RabbitMQ (+ UI gestion) | 5672 (+ 15672) |
| Prometheus | 9090 |
| Grafana | 3030 |
- [ ] Documenter et réserver l'ensemble de ces ports (en local via Docker Compose ; exposés en interne au cluster k3s via Service ClusterIP + Ingress Traefik pour le web/gateway)

**Format des logs**
- [ ] Définir le standard JSON structuré via Winston : `timestamp`, `level`, `service`, `requestId`, `message`, `metadata`
- [ ] Définir la corrélation inter-services via l'en-tête `X-Request-Id` propagé de bout en bout — chaque service (les 8 microservices + Gateway + Web) doit l'implémenter (voir fichier `.md` de chaque service)

**DTOs Communs**
- [ ] Créer le package partagé `@smartfunding/common-dto` (types TypeScript : `User`, `Project`, `Document`, `FunderMatch`, `Money`, `Pagination`)
- [ ] Publier sur un registre npm privé (GitHub Packages), versionné en semver
- [ ] S'assurer que chaque service Node.js/NestJS/Next.js consomme ce package (voir fichier `.md` de chaque service)

---

## PHASE 3 (partie infra) — Message Queue

### [P3.2] Message Queue (RabbitMQ)
- [ ] Créer les exchanges/queues pour les événements métier : `ProjectCreated`, `DocumentValidated`, `SubmissionStatusChanged`, `PaymentSucceeded`…
- [ ] Configurer une dead-letter queue pour les messages en échec de traitement
- [ ] Déployer RabbitMQ sur k3s via un chart Helm officiel, avec `resources.requests/limits` dimensionnés (règle de durabilité §0.3) et `PersistentVolumeClaim` sur `local-path-provisioner` (dev) ou Longhorn (prod multi-nœuds)
- [ ] Documenter le pattern Observer (RabbitMQ) : Project Service publie `ProjectStatusChangedEvent`, Documents Service publie `DocumentValidatedEvent`, Notifications Service et un futur Audit Service s'y abonnent indépendamment — découplage total, le service émetteur ne sait pas qui écoute (cf. `DESIGN_PATTERNS.md`)

---

## PHASE 5 (partie infra) — Sécurité & Conformité *(⏱ ≈ 1 semaine)*

### [P5.3] Protection du Périmètre & Secrets
- [ ] Cloudflare WAF + protection DDoS en frontal du cluster k3s
- [ ] TLS 1.3 en transit sur l'ensemble des flux (Traefik + cert-manager pour l'émission automatique de certificats, ex. Let's Encrypt)
- [ ] Chiffrement AES-256 au repos (coordination avec smartfunding-documents pour les fichiers)
- [ ] Déployer HashiCorp Vault sur k3s (mode dev pour la démo, mode HA si soutenance en conditions réelles) pour la gestion centralisée des secrets et clés — consommé par les 13 dépôts via l'agent injector Vault (annotation de pod) plutôt que des secrets Kubernetes en clair
- [ ] Scan de vulnérabilités : Trivy (images Docker), Snyk (dépendances) — intégré dans les pipelines CI/CD de chaque dépôt (cf. §0.2)
- [ ] Déployer **Kyverno** sur le cluster k3s : policies `verifyImages` (refus des images non signées Cosign), `require-run-as-non-root`, `disallow-privileged-containers`, `require-resource-limits`
- [ ] Activer les **NetworkPolicy** k3s (default-deny par namespace + règles explicites d'autorisation entre microservices) — le contrôleur intégré (kube-router) fonctionne nativement, sans CNI additionnel
- [ ] **Cloisonnement service-à-service précis** (et non plus namespace-entier) généré depuis `CALL_GRAPH.yaml` (source unique de vérité du graphe d'appels HTTP synchrones inter-services) via `scripts/generate-networkpolicies.py` — sans service mesh ni mTLS (rejetés par sobriété, cf. `docs/adr/0003-networkpolicy-service-a-service.md`) : uniquement des ressources `NetworkPolicy` k3s natives, aucune empreinte runtime supplémentaire. Vérification de non-dérive intégrée à `check-readiness.sh` et à un workflow CI dédié (`networkpolicy-check.yml`)

### [P5.4] Conformité Réglementaire
- [ ] RGPD : registre des traitements, DPO désigné, droit à l'effacement
- [ ] Préparation ISO 27001 / SOC2
- [ ] eIDAS pour la signature électronique (coordination avec smartfunding-workflow)
- [ ] NF Z42-013 pour l'archivage légal (coordination avec smartfunding-documents)
- [ ] RGAA (accessibilité) — cohérent avec le WCAG 2.1 AA visé côté design system (coordination avec smartfunding-web)
- [ ] **Loi Pacte** (cahier des charges §10.1, écart identifié en audit) : documenter les implications sur les types de financement affichés/éligibles pour les PME françaises — à clarifier avec un juriste avant l'ouverture publique, pas seulement une tâche technique

### [P5.5] Continuité d'Activité (PRA/PCA) [cahier des charges §10.2 — écart identifié en audit, absent du Plan de Travail d'origine]
- [ ] Plan de Reprise d'Activité (PRA) : objectif de temps de reprise (RTO) et de perte de données maximale tolérée (RPO) à définir explicitement — proposition initiale : RTO < 4h, RPO < 1h, à valider selon les moyens réels du projet
- [ ] Réplication cross-région des bases de données critiques (PostgreSQL, MongoDB) — perspective réaliste uniquement en production multi-nœuds k3s sur plusieurs zones ; à documenter comme axe d'amélioration si non implémenté faute de moyens dans le cadre du mémoire (préférable à une fausse promesse d'implémentation complète)
- [ ] Sauvegardes automatisées quotidiennes (déjà couvert en partie par §P9.4 étape 7 — backup avant déploiement ; à étendre en sauvegarde périodique indépendante des déploiements)
- [ ] Test de restauration au moins une fois avant la soutenance (une sauvegarde jamais testée en restauration n'est pas une garantie)
- [ ] Assurance cyber-risques (cahier des charges §10.2) : hors périmètre technique, à mentionner comme recommandation dans le mémoire plutôt qu'une tâche d'implémentation

---

## PHASE 6 — Observabilité *(⏱ ≈ 1 semaine)*

### [P6.1] Logging Centralisé
- [ ] Déployer la stack ELK (Elasticsearch, Logstash, Kibana) sur k3s ou en Docker Compose selon les ressources disponibles pour la démo
- [ ] Agréger les logs Winston JSON de tous les services (les 8 microservices + Gateway consomment le standard défini en P0.3)

### [P6.2] Monitoring
- [ ] Déployer Prometheus + Grafana sur k3s (chart `kube-prometheus-stack`, dimensionné en mode léger pour un cluster de démonstration)
- [ ] Dashboards : latence par service, taux d'erreur, utilisation des quotas par plan tarifaire
- [ ] Dashboard dédié « Durabilité » : métriques Kepler (kWh, SCI) par service, taux d'utilisation réel des ressources allouées (requests vs consommation réelle)
- [ ] Configurer Alertmanager pour le déclenchement des alertes

### [P6.3] Tracing Distribué
- [ ] Déployer Jaeger + OpenTelemetry collector sur k3s
- [ ] Couvrir les parcours critiques : soumission de dossier, matching, paiement (instrumentation dans chaque service concerné — voir fichiers `.md` respectifs)

### [P6.4] Alerting & Astreinte
- [ ] Intégrer Datadog + PagerDuty
- [ ] Mettre en place l'astreinte 24/7 sur incidents critiques, conformément au cahier des charges §12.1

### [P6.5] Mesure Énergétique (Durabilité)
- [ ] Déployer **Kepler** en DaemonSet sur chaque nœud k3s
- [ ] Exposer les métriques vers Prometheus/Grafana (cf. §0.3)
- [ ] Produire un rapport périodique (hebdomadaire) de consommation par service, exploitable directement dans le mémoire

### [P6.6] Scalabilité Avancée [cahier des charges §12.3 — écart identifié en audit]
- [ ] Cache multi-niveaux : Redis déjà prévu (niveau 1, données chaudes) — envisager un cache CDN/Traefik (niveau 2, réponses HTTP statiques du Gateway) si le trafic le justifie ; **ne pas implémenter prématurément** — un cache non nécessaire complexifie sans bénéfice et va à l'encontre de la sobriété (principe déjà retenu §0.3)
- [ ] Sharding automatique de base de données (cahier des charges §12.3) : hors de portée réaliste à l'échelle d'un cluster k3s de démonstration pour un mémoire — à documenter explicitement comme perspective d'évolution (V2, cohérent avec la roadmap cahier des charges §8) plutôt que comme tâche à réaliser, pour ne pas sur-promettre

---

## PHASE 7 — CI/CD *(⏱ ≈ 1 semaine)*

### [P7.1] Pipelines GitHub Actions (DevSecOps)
- [ ] Définir le template `ci.yml` : lint → tests unitaires/intégration → **gitleaks** → **Semgrep (SAST)** → **Trivy fs (SCA)** → build → **Syft (SBOM)** — sur push/PR vers `develop` et `main`
- [ ] Définir le template `cd.yml` : build image Docker → **Trivy image (scan container)** → **Cosign (signature keyless)** → push registre → déploiement automatique sur staging (namespace k3s dédié) — sur push vers `main`
- [ ] Ajouter un job `iac-scan.yml` : Checkov/kube-score sur les manifestes Kubernetes avant tout merge modifiant `k3s/`
- [ ] Diffuser ces templates aux 13 dépôts (chaque dépôt les adopte — voir fichiers `.md` respectifs)
- [ ] Un déploiement est bloqué si : vulnérabilité CRITICAL sans correctif (Trivy/Snyk), secret détecté (gitleaks), image non signée, ou policy Kyverno non satisfaite

### [P7.2] Infrastructure as Code (Terraform)
- [ ] Modules Terraform pour AWS/OVH : réseau, base de données managée, VMs hôtes du cluster k3s (server + agents)
- [ ] Module Terraform d'installation k3s (via provisioner `remote-exec` ou rôle Ansible dédié) pour une reproductibilité complète du cluster

### [P7.3] Versioning & Smoke Tests
- [ ] Définir la politique de semantic versioning appliquée sur chaque service
- [ ] Mettre en place les smoke tests automatiques après chaque déploiement

---

## PHASE 8 — Déploiement Local *(⏱ ≈ 3–5 jours)*

### [P8.1] Docker Compose (Développement rapide, sans cluster)
Un seul `docker-compose up` doit démarrer l'ensemble de la plateforme :
- [ ] frontend (3000), api-gateway (4000), les 8 microservices (3001–3008)
- [ ] postgres (5432), mongodb (27017), redis (6379), rabbitmq (5672), elasticsearch (9200)
- [ ] prometheus (9090), grafana (3030)
- [ ] **Livrable :** fichiers `docker-compose.yml` + `docker-compose.dev.yml` documentés
- [ ] Ce mode reste utile pour le développement quotidien rapide (itération sans rebuild d'image) ; la validation d'intégration se fait sur k3s (P8.2)

### [P8.2] k3s Local (remplace k3d/minikube du plan initial)
- [ ] Installer k3s en mode single-node sur la machine de développement (ou une VM dédiée)
- [ ] Créer les namespaces : `smartfunding-dev`, `smartfunding-staging`
- [ ] Valider sur k3s le manifeste de base de chaque service (Deployment + Service + Ingress Traefik) — chaque service fournit son propre manifeste (voir fichiers `.md` respectifs)
- [ ] Vérifier que les policies Kyverno et NetworkPolicy définies en P5.3 n'empêchent pas le fonctionnement normal en environnement de développement (namespace `smartfunding-dev` avec policies en mode `audit` plutôt que `enforce` si besoin)

---

## PHASE 9 — Déploiement Production (cluster k3s) *(⏱ ≈ 1–2 semaines)*

### [P9.1] Préparation de l'Infrastructure Cloud
- [ ] Choix AWS ou OVH (cf. cahier des charges §5.3), ou hébergement dédié pour la démonstration du mémoire (VPS/homelab)
- [ ] Provisioning des VMs via Terraform (P7.2), installation k3s multi-nœuds (1 server + N agents)
- [ ] Configuration DNS et CDN Cloudflare

### [P9.2] Kubernetes Production (k3s)
- [ ] Manifests Deployment + Service par microservice (coordination avec chaque dépôt)
- [ ] Resource requests/limits définis pour chaque service, dimensionnés selon la démarche de sobriété (§0.3), validés via VPA en mode recommandation
- [ ] Liveness probe `GET /health`, readiness probe `GET /ready` sur chaque service
- [ ] Namespace `smartfunding-prod` isolé, policies Kyverno et NetworkPolicy en mode `enforce`
- [ ] Ingress Traefik + TLS via cert-manager pour l'exposition publique du Gateway et du Web

### [P9.3] Environnements Staging & Production
- [ ] Staging : déploiement automatique sur push vers `main`, données anonymisées, monitoring complet
- [ ] Production : déploiement par tag (semantic versioning), données réelles chiffrées, monitoring complet + alerting

### [P9.4] Procédure de Déploiement Blue-Green
Procédure manuelle contrôlée en 12 étapes (adaptée à k3s : bascule via labels de sélecteur de Service entre deux Deployments `-blue`/`-green`) :
- [ ] 1. Créer la release branch depuis `main`
- [ ] 2. Exécuter la suite de tests complète (y compris les gates DevSecOps §0.2)
- [ ] 3. Revue de sécurité
- [ ] 4. Déployer sur staging
- [ ] 5. Smoke tests automatiques
- [ ] 6. Validation manuelle
- [ ] 7. Backup de la base de données de production
- [ ] 8. Déployer le Deployment `-green` en parallèle du `-blue` en production, bascule du Service une fois les probes readiness au vert
- [ ] 9. Monitorer les métriques (dont Kepler/énergie) pendant 5 minutes
- [ ] 10. Rollback si nécessaire (bascule du Service vers `-blue`)
- [ ] 11. Notifier l'équipe
- [ ] 12. Mettre à jour la documentation

### [P9.5] Plan de Rollback
3 scénarios définis :
- [ ] Erreurs critiques : taux d'erreur > 5 % pendant 2 min → rollback automatique (timeout 5 min, notification Ops + PM)
- [ ] Dégradation de performance : latence P95 > 2s → rollback manuel décidé sous 15 min (notification Tech Lead)
- [ ] Corruption de données : erreurs base de données → procédure de restauration dédiée

---

## PHASE 10 — Tests Finaux, Documentation & Lancement *(⏱ ≈ 1–2 semaines + Alpha/Bêta)*

### [P10.1] Tests E2E Complets
Scénario global à automatiser de bout en bout (piloté via smartfunding-web + smartfunding-gateway, impliquant l'ensemble des microservices, exécuté sur le cluster k3s de staging) :
- [ ] Inscription d'un nouvel utilisateur → onboarding guidé
- [ ] Création d'un projet → structure documentaire générée
- [ ] Recherche et matching de financeurs → scoring affiché
- [ ] Génération assistée du business plan → export PDF
- [ ] Circuit de validation collaborative → annotations et signatures
- [ ] Soumission → suivi → reporting post-financement

### [P10.2] Tests de Charge & Performance
- [ ] Outil : k6 (recommandé), JMeter ou Artillery, exécutés contre le cluster k3s de staging
- [ ] Scénario : 1000 requêtes simultanées
- [ ] Objectifs cibles : p95 < 500 ms, taux d'erreur < 1 %, cache hit rate > 80 %
- [ ] Cohérent avec le SLA cahier des charges §5.4 : < 200 ms sur 95 % des requêtes, disponibilité 99.9 %
- [ ] Corréler chaque palier de charge avec les métriques Kepler (kWh consommés par palier) — matière directe pour le chapitre « résultats » du mémoire

### [P10.3] Tests de Sécurité
- [ ] OWASP ZAP, Snyk, Trivy en continu (déjà intégrés au pipeline, §0.2)
- [ ] Test d'intrusion (Burp Suite) avant toute ouverture au public
- [ ] Test de contournement des policies Kyverno (tentative de déploiement d'une image non signée) pour valider l'admission control

### [P10.4] Documentation Technique
- [ ] Architecture C4 Model (Context, Container, Component, Code) — outil : draw.io ou Structurizr
- [ ] `INSTALL.md` : guide d'installation locale pas-à-pas (Docker Compose + k3s)
- [ ] `DEPLOY.md` : guide de déploiement cloud (Terraform + k3s multi-nœuds)
- [ ] API Reference : agrégation des Swagger/OpenAPI via l'API Gateway
- [ ] `DESIGN_PATTERNS.md` : documenter les patterns utilisés (Strategy, Observer, Saga, Circuit Breaker, CQRS)
- [ ] `docs/adr/` : Architecture Decision Records DevSecOps/durable (§0.4)
- [ ] Rapport de synthèse « Avant / Après » sécurité + durabilité, destiné au corps du mémoire

### [P10.5] Programme Alpha (10 organisations pilotes)
- [ ] Durée : 4 semaines. Critères de sélection : PME innovantes, projet de financement en cours, diversité de secteurs
- [ ] Objectifs : valider le concept, identifier les bugs majeurs, ajuster l'UX
- [ ] Cibles : taux de complétion onboarding > 70 %, satisfaction > 4/5, bugs critiques < 5

### [P10.6] Programme Bêta (100 early adopters)
- [ ] Durée : 8 semaines. Critères de sélection : liste d'attente, secteurs variés, tailles d'organisation diverses
- [ ] Objectifs : test de charge réel, validation de la performance, formation du support, préparation du lancement
- [ ] Cibles : uptime > 99.5 %, temps de réponse < 1 s, NPS > 50, taux de rétention > 80 %

---

## Planning & Estimation Temporelle (référence)
| Phase | Description | Durée estimée |
|---|---|---|
| Phase 0 | Préparation, Environnement & Cadre DevSecOps/Durable | 4–6 jours |
| Phase 1 | Services Core (Auth, Projects, Documents) | 3 semaines |
| Phase 2 | Services Spécialisés (Funders, AI, Workflow, Notifications, Billing) | 3–4 semaines |
| Phase 3 | Infrastructure & Communication | 1 semaine |
| Phase 4 | Frontend Web (+ Mobile différé) | 2–3 sem. (+1–2 sem.) |
| Phase 5 | Sécurité, Conformité & Policy-as-Code (Kyverno) | 1–1,5 semaine |
| Phase 6 | Observabilité (+ mesure énergétique Kepler) | 1–1,5 semaine |
| Phase 7 | CI/CD DevSecOps (gates sécurité intégrés) | 1–1,5 semaine |
| Phase 8 | Déploiement Local (Docker Compose + k3s) | 3–5 jours |
| Phase 9 | Déploiement Production (k3s multi-nœuds) | 1–2 semaines |
| Phase 10 | Tests Finaux + Documentation + rapport mémoire | 1,5–2,5 semaines |
| **TOTAL** | Build technique, à 1-3 personnes en parallèle | **≈ 18–21 semaines** |

Ce total reste cohérent avec les objectifs du cahier des charges (MVP à 3-4 mois, V1.0 à 6-8 mois) ; le surcoût par rapport au plan initial (≈ +1 à 2 semaines) correspond à l'intégration des gates DevSecOps et de l'instrumentation de durabilité, qui constituent la contribution scientifique du mémoire.

### Ordre de Priorité Recommandé (en cas de contrainte de temps/équipe réduite)
1. Phase 0 (incluant le cadre §0) + Phase 1 — le socle minimum viable (identité, projets, documents), déployé dès le départ sur k3s
2. Phase 2 — Funders puis Notifications d'abord (valeur utilisateur immédiate), puis Workflow, AI et Billing
3. Phase 4 — Frontend Web (sans le mobile)
4. Phase 3 + Phase 5 — Gateway, sécurité de base et premières policies Kyverno
5. Phase 8 — Déploiement local k3s (bascule complète, abandon progressif de Docker Compose seul)
6. Phase 6 + Phase 7 — Observabilité (incluant Kepler dès que possible, pour disposer d'un historique de mesure long) et CI/CD DevSecOps complet
7. Phase 9 + Phase 10 — Production k3s multi-nœuds, tests finaux et Programme Alpha
8. Programme Bêta et itérations post-lancement

---

## Design Patterns à Implémenter (documenter dans `DESIGN_PATTERNS.md`)
- [ ] **Strategy Pattern** — Scoring des Financeurs (smartfunding-funders) : `FundingScoreStrategy.calculate(project, funder): number`, implémentations `SubventionStrategy`, `PretStrategy`, `CrowdfundingStrategy`, `BusinessAngelStrategy`, Factory de sélection
- [ ] **Observer Pattern** (via RabbitMQ) — Événements Métier : Project Service publie `ProjectStatusChangedEvent`, Documents Service publie `DocumentValidatedEvent` ; Notifications Service et un futur Audit Service s'y abonnent indépendamment ; découplage total
- [ ] **Saga Pattern** (via Temporal.io) — Cycle de Soumission (smartfunding-workflow) : workflow orchestrant préparation dossier → validation interne → soumission → suivi → signature, avec compensation si signature refusée
- [ ] **Circuit Breaker** — Résilience des Intégrations Externes (smartfunding-gateway, smartfunding-funders, smartfunding-billing) : états CLOSED → OPEN → HALF-OPEN, fallback en file d'attente différée
- [ ] **CQRS** — Dashboard & Reporting (smartfunding-projects, optionnel mais recommandé) : Command (écriture PostgreSQL) / Query (lecture optimisée via vues matérialisées / Elasticsearch)
- [ ] **Policy-as-Code** (Kyverno) — Sécurité par contrat : le cluster refuse par construction toute image non signée/non scannée, plutôt que de compter sur la discipline humaine (à documenter comme pattern DevSecOps à part entière dans le mémoire)

---

## Conseils pour l'Équipe

### Organisation du Travail en Équipe
- [ ] Utiliser les Issues GitHub pour tracker chaque tâche (une issue = une sous-tâche Px.y)
- [ ] Réunion quotidienne de 15 min : ce qui a été fait, ce qui est prévu, les blocages
- [ ] Chaque feature branch est revue par un autre membre avant merge
- [ ] Ne jamais pousser directement sur `main` ou `develop`

### Pièges à Éviter (checklist transverse à valider sur toute la plateforme)
- [ ] Ne JAMAIS stocker de données bancaires/IBAN en clair — chiffrement applicatif en plus du chiffrement disque
- [ ] Toujours vérifier la signature des webhooks Stripe avant traitement (éviter les faux événements de paiement)
- [ ] Rendre les workflows Temporal.io et les jobs de notification idempotents (les retries sont fréquents)
- [ ] Ne JAMAIS valider le RBAC uniquement côté frontend — toujours revalider côté service
- [ ] Prévoir une marge de sécurité sur les deadlines financeurs (fuseaux horaires, jours fériés)
- [ ] Tester séparément les cas de gros fichiers et les timeouts OCR/IA (ne pas bloquer le thread principal)
- [ ] Ne jamais exposer un score de matching brut sans l'expliquer — la transparence est un facteur de confiance client
- [ ] Ne pas sur-dimensionner les `resources.limits` « par sécurité » sans donnée réelle — c'est l'anti-pattern qui invalide toute démarche de sobriété (toujours partir des recommandations VPA)
- [ ] Ne pas activer les policies Kyverno en mode `enforce` en développement sans avoir testé en mode `audit` d'abord — risque de bloquer toute l'équipe

### Ressources Utiles
- Next.js : https://nextjs.org/docs
- NestJS : https://docs.nestjs.com
- Temporal.io : https://docs.temporal.io
- Stripe : https://stripe.com/docs
- Docker : https://docs.docker.com
- k3s : https://docs.k3s.io
- Kyverno : https://kyverno.io/docs
- Kepler : https://sustainable-computing.io
- Sigstore/Cosign : https://docs.sigstore.dev
- OWASP DSOMM : https://dsomm.owasp.org
- Green Software Foundation (SCI) : https://greensoftware.foundation

---

## Definition of Done (Infrastructure, DevSecOps & Durabilité)
- [ ] Les 13 dépôts sont initialisés et conformes aux standards définis
- [ ] `docker-compose up` démarre l'ensemble de la plateforme sans erreur (usage développement rapide)
- [ ] Cluster k3s (single-node dev + multi-nœuds prod) opérationnel, provisionné via Terraform, DNS/CDN configurés
- [ ] Pipeline CI/CD DevSecOps complet et bloquant (gitleaks, Semgrep, Trivy, Syft, Cosign, Kyverno) sur les 13 dépôts
- [ ] Stack observabilité (ELK, Prometheus/Grafana, Jaeger, Datadog/PagerDuty) opérationnelle avec astreinte 24/7
- [ ] Kepler déployé et dashboard de durabilité alimenté sur une durée suffisante pour produire des résultats exploitables dans le mémoire
- [ ] Procédure de déploiement Blue-Green et plan de rollback testés au moins une fois sur k3s
- [ ] Documentation technique complète (`INSTALL.md`, `DEPLOY.md`, API Reference, `DESIGN_PATTERNS.md`, C4 Model, ADR)
- [ ] Tests E2E, de charge et de sécurité globaux passés avec succès, corrélés aux métriques énergétiques
- [ ] Rapport « Avant / Après » sécurité + durabilité rédigé, prêt à être intégré au mémoire
- [ ] Programme Alpha puis Bêta réalisés avec les cibles atteintes avant lancement public

**Bonne chance à toute l'équipe — et bonne soutenance !**
