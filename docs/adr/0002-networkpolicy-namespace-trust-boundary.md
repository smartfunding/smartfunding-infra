# ADR-0002 — NetworkPolicy : frontière de confiance au niveau du namespace (pas Gateway-only)

**Statut :** Accepté (correction d'un bug de conception initial)
**Date :** 2026-08-08
**Service concerné :** transverse (les 11 dépôts déployés sur k3s)

## Contexte
Les `NetworkPolicy` générées initialement pour chaque service n'autorisaient l'ingress que depuis `smartfunding-gateway`. Or l'architecture réelle du projet repose sur des appels **directs service-à-service** pour plusieurs cas critiques :
- `POST /auth/verify` est appelé par les 7 autres microservices ET le Gateway (revalidation RBAC systématique, cf. `smartfunding-auth.md` §4.2) — pas seulement par le Gateway
- `POST /notifications/send-transactional` est appelé directement par `smartfunding-auth` pour la 2FA (cf. `smartfunding-notifications.md` §2.7)
- D'autres appels directs existent ou existeront (ex. Workflow ↔ Funders pour la capitalisation)

Avec la policy Gateway-only, **aucun de ces appels directs n'aurait fonctionné en production** — un microservice tentant d'appeler `smartfunding-auth:3001/auth/verify` directement aurait été bloqué au niveau réseau. Ce bug serait resté invisible jusqu'au déploiement réel sur k3s (les tests d'intégration en local, hors cluster, ne l'auraient pas révélé).

## Décision
Remplacer la règle d'ingress par service par une règle **"même namespace uniquement"** (`podSelector: {}` sans `namespaceSelector`, portée implicite Kubernetes = namespace courant). Tout pod du même environnement (dev, staging OU prod — jamais entre deux environnements différents) peut appeler n'importe quel autre service du même environnement directement.

## Alternatives considérées
| Option | Avantages | Inconvénients | Raison du rejet |
|---|---|---|---|
| Gateway-only (conception initiale) | Le plus restrictif en apparence | **Cassé** : bloque les appels directs pourtant nécessaires à l'architecture | Rejeté — bug de conception |
| Énumérer chaque paire appelant/appelé (ex. `auth` autorise explicitement `projects`, `documents`, `funders`...) | Le plus fin-grained possible | Ingérable à maintenir (ajout d'un appel = modifier 2 fichiers NetworkPolicy), source d'oubli silencieux — exactement le type de dette que ce projet cherche à éliminer par ailleurs (cf. `check-readiness.sh`) | Rejeté : coût de maintenance disproportionné par rapport au gain de sécurité réel |
| **Namespace entier (retenu)** | Simple, correct, portable dev/staging/prod sans modification, aucun risque d'oubli à chaque nouvel appel inter-service | Moins granulaire qu'un vrai mesh zero-trust service-à-service (ex. mTLS + policy par identité SPIFFE) | **Retenu** — le namespace reste une frontière de confiance réelle (tous les services qui y tournent ont traversé le même pipeline DevSecOps §0.2 : scan, signature, policy Kyverno) |

## Conséquences
- **Positives :** corrige un bug qui aurait bloqué la plateforme dès le premier déploiement réel sur k3s ; aucune maintenance de liste d'autorisation à chaque nouvel appel inter-service
- **Négatives / dette technique acceptée :** un pod compromis dans le namespace peut atteindre n'importe quel autre service du même namespace (pas de cloisonnement fin service-à-service) — mitigé par le fait que chaque service applique déjà sa propre authentification/autorisation applicative (`/auth/verify`), la NetworkPolicy n'est qu'une couche de défense supplémentaire, pas la seule
- **Perspective d'amélioration** (à documenter comme axe futur dans le mémoire) : un service mesh (Istio/Linkerd) avec mTLS et policy d'identité par service permettrait un vrai zero-trust service-à-service sans le coût de maintenance de l'option rejetée ci-dessus — non retenu pour ce projet par sobriété (composant supplémentaire lourd pour un cluster de démonstration)
- **Isolation dev/staging/prod préservée** : contrairement à une alternative par label de namespace (`namespaceSelector` avec un label commun), la portée "namespace courant implicite" empêche par construction qu'un pod de `smartfunding-dev` atteigne `smartfunding-prod`

## Références
- Tous les `k3s/base/networkpolicy.yaml` des 11 dépôts applicatifs
- `smartfunding-auth/TASKS.md` §4.2, `smartfunding-notifications/TASKS.md` §2.7
