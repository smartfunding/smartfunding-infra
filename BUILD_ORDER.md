# BUILD_ORDER.md — Ordre de construction et gestion des dépendances

Objectif : qu'un agent qui attaque un service sache exactement ce qui doit déjà exister, et comment avancer sur un service même si ses dépendances ne sont pas encore prêtes (mocks).

## Graphe de dépendances (qui a besoin de qui)

```
contracts (@smartfunding/common-dto)  ── prérequis absolu de TOUT le reste
        │
        ▼
     infra (k3s, PostgreSQL, MongoDB, Redis, RabbitMQ, MinIO minimum)
        │
        ▼
      auth  ──────────────────────────────────────────┐
        │                                              │ (POST /auth/verify
        ▼                                              │  appelé par tous)
    projects ──▶ documents                             │
        │            │                                 │
        │            ▼                                 │
        │       notifications ◀── funders               │
        │            ▲              │                   │
        │            │              ▼                   │
        └────────▶ workflow ◀── billing                 │
                       │                                 │
                       ▼                                 │
                    gateway ◀────────────────────────────┘
                       │
                       ▼
                  ┌── web            (Flutter mobile en parallèle,
                  │                   même contrat API, même Gateway)
                  └── mobile
                       │
                       ▼
                  ai (consommé par web/mobile/documents/funders, peut être développé
                       en parallèle dès que ses endpoints sont mockés ailleurs)
```

## Ordre recommandé, avec le mock à fournir à chaque étape

| # | Service | Prérequis réels | Mock nécessaire pour avancer seul | Sortie livrée aux suivants |
|---|---|---|---|---|
| 0 | `contracts` | — | — | Package `@smartfunding/common-dto` publié en local (`npm link` ou registre GitHub Packages) |
| 1 | `infra` (bootstrap) | contracts | — | Cluster k3s + namespaces + PostgreSQL/MongoDB/Redis/RabbitMQ/MinIO démarrés (`docker-compose up` suffit à ce stade) |
| 2 | `auth` | infra | — | Endpoint `POST /auth/verify` fonctionnel — **bloquant pour tous les autres services** |
| 2bis | `onboarding` | auth | Mock `ProjectsClient`/`FundersClient` tant que ces services ne sont pas prêts | Événement `OnboardingCompleted`, projet brouillon pré-rempli |
| 3 | `projects` | auth | Mock `DocumentsClient.createProjectFolder()` retournant un succès statique tant que `documents` n'existe pas | Événement `ProjectCreated` publié sur RabbitMQ |
| 4 | `documents` | auth, projects (pour le test d'intégration) | Mock du Service AI pour l'OCR complexe (`AiClient.classify()` retourne un statut fixe) | Événement `DocumentValidated` |
| 5 | `funders` | auth | Mock des clients ADEME/Bpifrance (fixtures JSON statiques, cf. `funders/test/fixtures/`) tant que l'accès API réel n'est pas obtenu | `GET /funders/match` fonctionnel |
| 6 | `notifications` | auth, RabbitMQ | Mock Resend/Brevo/Twilio/Firebase (mode "log only" en dev, ne jamais envoyer de vrai email en environnement non-prod) | Canal de notification opérationnel pour tous les événements déjà publiés, dont l'envoi transactionnel synchrone de l'OTP 2FA |
| 7 | `workflow` | auth, projects, notifications | Mock du fournisseur de signature électronique (DocuSign/Yousign) | Orchestration de soumission complète |
| 8 | `billing` | auth | Mode test Stripe (clés `sk_test_*`, jamais de vraies clés en dev) | `GET /billing/quota-status` consommé par le Gateway |
| 9 | `gateway` | auth, ET AU MOINS un microservice réel à router (peut être développé en parallèle du reste avec des routes stub) | — | Point d'entrée unique fonctionnel |
| 10 | `ai` | — (peut démarrer dès le jour 1, en parallèle, car faiblement couplé) | — | Endpoints `/ai/*` consommés en asynchrone par documents/web |
| 11 | `web` | gateway (au minimum auth+projects routés) | — | Frontend consommant l'API réelle |
| 12 | `mobile` | gateway (même API que web, au minimum auth+onboarding) | Peut être développé **en parallèle de `web`** dès que le Gateway route auth+onboarding — même contrat API consommé, pas de dépendance à web lui-même | Application distribuée aux stores |

## Règle pour un agent travaillant service par service
1. **Toujours commencer par vérifier `contracts/` est à jour** — si un DTO manque, l'ajouter là AVANT de coder le service (jamais de type dupliqué localement).
2. **Si une dépendance n'existe pas encore**, implémenter le client HTTP/AMQP réel mais le pointer vers un mock (voir tableau ci-dessus), documenté par un commentaire `// MOCK — à retirer quand <service> sera livré, cf. BUILD_ORDER.md`.
3. **Ne jamais bloquer sur `ai`, `notifications` (canaux externes) ou les intégrations financeurs réelles** en développement précoce — ce sont les dépendances les plus faciles à mocker et les moins structurantes pour l'architecture.
4. `auth` doit être la toute première brique métier codée après `contracts` et `infra` — c'est la seule dépendance dure de tous les autres services.
5. **Exception `mobile`** : ce dépôt est en Dart, il ne peut pas consommer `contracts/` (TypeScript) directement. Toute modification d'un DTO dans `contracts/src/*.ts` doit être répercutée manuellement dans `smartfunding-mobile/lib/shared/models/*.dart` (checklist `docs/CONTRACTS_SYNC.md` du dépôt mobile) — c'est un point de vigilance permanent tant qu'une génération automatique (OpenAPI → Dart) n'est pas en place.

## Périmètre MVP réaliste (si le temps de mémoire est limité)
Cf. échange précédent : `contracts` + `infra` (bootstrap) + `auth` + `projects` + `documents` + `gateway` (+ `web` a minima sur ces 3 modules) constituent un parcours de bout en bout démontrable (inscription → projet → upload document) avec la chaîne DevSecOps/durable complète appliquée dessus. Le reste (`funders`, `ai`, `workflow`, `notifications`, `billing`) peut être documenté comme "développé selon la même méthodologie, cf. TASKS.md respectifs" si le temps manque.
