# EXECUTION_PLAN.md — Ordre de réalisation et fichiers à transmettre à l'agent

## 0. Ce qu'il faut envoyer à l'agent — TOUT, dès le départ

Les 13 archives, **toutes en même temps**, pas une par une : les documents se référencent mutuellement
(`TASKS.md` de chaque service pointe vers `contracts/`, `PARAMETERS.md`, `BUILD_ORDER.md`, `CALL_GRAPH.yaml`
dans `smartfunding-infra`), et `check-readiness.sh` a besoin de voir les dépôts frères pour fonctionner.

| # | Archive | Contenu |
|---|---|---|
| 1 | `smartfunding-infra.zip` | Socle méthodologique + `contracts/` + tous les scripts |
| 2 | `smartfunding-auth.zip` | Authentification, RBAC, 2FA email |
| 3 | `smartfunding-onboarding.zip` | Questionnaire, import contacts, attribution rôles |
| 4 | `smartfunding-projects.zip` | Gestion de projets |
| 5 | `smartfunding-documents.zip` | Upload, OCR, versioning |
| 6 | `smartfunding-funders.zip` | Base financeurs, matching/scoring |
| 7 | `smartfunding-notifications.zip` | Email (Resend+Brevo), SMS, push, in-app |
| 8 | `smartfunding-workflow.zip` | Orchestration soumission (Temporal), reporting |
| 9 | `smartfunding-billing.zip` | Abonnements, Maviance (principal), Stripe/PayPal (secondaire) |
| 10 | `smartfunding-gateway.zip` | Point d'entrée API unique |
| 11 | `smartfunding-ai.zip` | Business plan IA, scoring prédictif, chatbot |
| 12 | `smartfunding-web.zip` | Frontend Next.js |
| 13 | `smartfunding-mobile.zip` | Application Flutter |

**Consigne à donner à l'agent :** "Dézippe les 13 archives en dossiers frères dans un même répertoire de travail (voir `smartfunding-infra/START.md`), puis implémente-les dans l'ordre ci-dessous. Avant chaque service, lance `check-readiness.sh` ; avant de commencer, lance `check-local-tools.sh`."

---

## 1. Ordre de réalisation

```
Étape 0  : contracts        (dans smartfunding-infra/contracts/)   ← préalable absolu, tout en dépend
Étape 1  : infra             (bootstrap k3s + bases de données)
Étape 2  : auth               ← bloquant pour tous les services métier
Étape 3  : onboarding        (peut suivre juste après auth)
Étape 4  : projects
Étape 5  : documents
Étape 6  : funders
Étape 7  : notifications
Étape 8  : workflow
Étape 9  : billing            ← Maviance en premier (Quote→Collect→Verify), Stripe/PayPal ensuite
Étape 10 : gateway            ← peut être développé en parallèle avec des routes stub dès l'étape 2
Étape 11 : ai                 ← faiblement couplé, peut démarrer dès le jour 1 en parallèle
Étape 12 : web                ← après gateway (auth + onboarding routés au minimum)
Étape 13 : mobile             ← en parallèle de web, même contrat API, même Gateway
```

## 2. Détail étape par étape — commandes et documents à lire

### Étape 0 — contracts
```bash
cd smartfunding-infra/contracts && npm install && npm run build
ls dist/index.js dist/index.d.ts   # doivent exister
```
📄 À lire : `smartfunding-infra/START.md`

### Étape 1 — infra
```bash
cd smartfunding-infra
docker compose up -d postgres mongodb redis rabbitmq minio
./scripts/install-k3s.sh
./scripts/bootstrap-namespaces.sh
```
📄 À lire : `TASKS.md` (Phases 0, 3, 5, 6, 7, 8, 9, 10), `PARAMETERS.md`, `BUILD_ORDER.md`, `CALL_GRAPH.yaml`, `DESIGN_PATTERNS.md`

### Étapes 2 à 13 — chaque service
Pour CHAQUE service, dans l'ordre :
```bash
./smartfunding-infra/scripts/check-readiness.sh smartfunding-<service> smartfunding-infra
cd smartfunding-<service>
cp .env.example .env
pnpm install   # ou pip install -r requirements.txt (ai) / flutter pub get (mobile)
```
📄 À lire dans CE dépôt : `TASKS.md` (la checklist complète), `README.md`, `docs/adr/*.md` (décisions spécifiques), `docs/threat-model.md`
📄 À garder ouvert en référence : `smartfunding-infra/PARAMETERS.md` (toutes les valeurs numériques), `smartfunding-infra/contracts/src/*.ts` (types partagés)

### Points d'attention par étape (déjà documentés, à ne pas manquer)
- **auth** : 2FA par email uniquement (ADR-0001), appelle `notifications` en synchrone
- **onboarding** : `ADR-0001` — pourquoi c'est un service séparé
- **notifications** : Resend + Brevo avec bascule automatique testée (`ADR-0001`, `ADR-0002`), endpoint `POST /notifications/send-transactional`
- **billing** : Maviance en premier (`ADR-0001` du dépôt), flux Quote→Collect→Verify différent de Stripe
- **ai** : chatbot intégré ici, pas de service séparé (`ADR-0002`)
- **mobile** : modèles Dart en miroir manuel de `contracts/` (`ADR-0001`), pas de Dockerfile/k3s

## 3. Vérification finale (tous services livrés)
```bash
for s in auth onboarding projects documents funders notifications workflow billing gateway ai web mobile; do
  ./smartfunding-infra/scripts/check-readiness.sh smartfunding-$s smartfunding-infra
done
python3 smartfunding-infra/scripts/generate-networkpolicies.py --check
```
