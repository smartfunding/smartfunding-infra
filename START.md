# START.md — Démarrer le projet à partir de zéro

## Étape 0 — contracts (@smartfunding/common-dto) — PRÉALABLE ABSOLU

```bash
# 1. Organiser un dossier de travail où TOUS les dépôts seront frères (siblings) — important
#    pour que les chemins relatifs (BUILD_ORDER.md, contracts) fonctionnent tels quels
mkdir -p ~/smartfunding-manager && cd ~/smartfunding-manager

# 2. Dézipper TOUS les dépôts ici (contracts vit dans smartfunding-infra)
unzip smartfunding-infra.zip
unzip smartfunding-auth.zip
unzip smartfunding-onboarding.zip
unzip smartfunding-projects.zip
unzip smartfunding-documents.zip
unzip smartfunding-funders.zip
unzip smartfunding-notifications.zip
unzip smartfunding-workflow.zip
unzip smartfunding-billing.zip
unzip smartfunding-gateway.zip
unzip smartfunding-ai.zip
unzip smartfunding-web.zip
# Résultat attendu : ~/smartfunding-manager/smartfunding-{infra,auth,onboarding,projects,...}/

# 3. Builder le package de contrats — TOUT LE RESTE EN DÉPEND
cd smartfunding-infra/contracts
npm install
npm run build
# Vérification : ces deux fichiers DOIVENT exister avant de toucher à un autre service
ls dist/index.js dist/index.d.ts

# 4. Rendre le package consommable localement par les autres dépôts (avant publication réelle sur un registre npm privé)
npm link
cd ../../smartfunding-auth
npm link @smartfunding/common-dto
# Répéter "npm link @smartfunding/common-dto" dans chaque dépôt NestJS/Next.js avant de coder dedans
```

**Critère d'acceptation de la Tâche 0** : `smartfunding-infra/contracts/dist/index.js` et `dist/index.d.ts` existent, et `import { User, Project } from '@smartfunding/common-dto'` fonctionne sans erreur dans un fichier `.ts` de test placé dans n'importe quel autre dépôt.

## Étape 1 — infra (bootstrap)

```bash
cd ../smartfunding-infra
docker compose up -d postgres mongodb redis rabbitmq minio   # bases de données uniquement, pas encore les services applicatifs
./scripts/install-k3s.sh
./scripts/bootstrap-namespaces.sh
```

## Étape 2 — auth (premier service applicatif)
```bash
cd ../smartfunding-auth
cp .env.example .env   # éditer avec les vraies valeurs de connexion (voir docker-compose de l'infra)
pnpm install
pnpm start:dev
curl http://localhost:3001/health   # doit répondre {"status":"ok"}
```

À partir de là, suivre `TASKS.md` du service dans l'ordre, section par section.
