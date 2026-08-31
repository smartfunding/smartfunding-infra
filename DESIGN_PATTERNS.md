# DESIGN_PATTERNS.md — SmartFunding Manager

Document consolidé des patterns d'architecture retenus dans le plan. Chaque pattern est référencé depuis le fichier `.md` du service qui l'implémente — ce document en centralise la justification et le diagramme, pour réutilisation directe dans le mémoire.

---

## 1. Strategy Pattern — Scoring des Financeurs
**Service :** `smartfunding-funders`
**Problème :** le calcul du score de matching (règle BR-001) diffère selon le type de financeur (subvention, prêt, crowdfunding, business angel), sans que la logique d'appel change.

```
interface FundingScoreStrategy {
  calculate(project: Project, funder: Funder): number;
}
class SubventionStrategy implements FundingScoreStrategy { ... }
class PretStrategy implements FundingScoreStrategy { ... }
class CrowdfundingStrategy implements FundingScoreStrategy { ... }
class BusinessAngelStrategy implements FundingScoreStrategy { ... }

class FundingScoreStrategyFactory {
  static getStrategy(funder: Funder): FundingScoreStrategy { ... }
}
```
**Bénéfice :** ajout d'un nouveau type de financeur sans modifier le code existant (Open/Closed Principle) ; chaque stratégie testable isolément.

---

## 2. Observer Pattern — Événements Métier (via RabbitMQ)
**Services :** `smartfunding-projects` (émetteur), `smartfunding-documents` (émetteur), `smartfunding-notifications` (consommateur), futur Audit Service (consommateur)

```
Project Service ──publie──▶ ProjectStatusChangedEvent ──┬──▶ Notifications Service
Documents Service ──publie──▶ DocumentValidatedEvent ────┴──▶ Audit Service (futur)
```
**Bénéfice :** découplage total — le service émetteur ignore qui consomme l'événement ; ajout d'un nouveau consommateur sans modifier l'émetteur.
**Point d'attention :** RabbitMQ garantit une livraison *at-least-once* — tout consommateur doit être idempotent (déduplication par `eventId`).

---

## 3. Saga Pattern — Cycle de Soumission (via Temporal.io)
**Service :** `smartfunding-workflow`

```
prepareDossier → internalValidation → submitToFunder → trackSubmissionStatus → requestSignature → capitalizeOutcome
                                                                                        │
                                                                          (si signature refusée)
                                                                                        ▼
                                                                              cancelSubmission (compensation)
```
**Bénéfice :** cohérence d'un processus métier long et distribué sans transaction distribuée classique ; chaque étape a sa propre politique de retry et, si besoin, sa compensation.

---

## 4. Circuit Breaker — Résilience des Intégrations Externes
**Services :** `smartfunding-gateway` (appels internes inter-services), `smartfunding-funders` (ADEME/Bpifrance), `smartfunding-billing` (Maviance/Stripe), `smartfunding-notifications` (Resend → Brevo, cf. ADR-0002)

```
        échecs répétés
CLOSED ───────────────▶ OPEN ───(fenêtre de repos)───▶ HALF-OPEN
   ▲                                                        │
   └──────────────── succès du test de reprise ─────────────┘
```
**Bénéfice :** protège la latence et la disponibilité globale de la plateforme quand une dépendance externe est en panne ; fallback en file d'attente différée (Funders/Billing) ou bascule vers un fournisseur secondaire (Notifications) plutôt qu'une erreur brutale exposée à l'utilisateur.

**Note pour le mémoire :** `smartfunding-notifications` est la seule instance dont l'implémentation a été testée unitairement dans ce projet (4 scénarios : primaire sain, échec isolé absorbé, ouverture après seuil, fermeture après reprise) — bon exemple concret à citer pour illustrer le pattern au-delà de sa description théorique.

---

## 5. CQRS — Dashboard & Reporting
**Service :** `smartfunding-projects` (recommandé, optionnel)

```
Command (écriture) → PostgreSQL (source de vérité)
Query (lecture)     → Vue matérialisée / Elasticsearch (optimisée pour l'agrégation), rafraîchie sur ProjectStatusChanged
```
**Bénéfice :** les lectures d'agrégation (dashboard, KPIs) ne dégradent pas les performances d'écriture transactionnelle, et inversement.

---

## 6. Policy-as-Code — Sécurité par contrat (Kyverno)
**Service :** `smartfunding-infra` (cluster-wide)

Le cluster k3s **refuse par construction** tout déploiement qui ne respecte pas les policies définies (image non signée, absence de SBOM, conteneur privilégié, absence de limites de ressources) — la sécurité et la sobriété ne dépendent plus uniquement de la discipline humaine mais sont vérifiées mécaniquement à chaque déploiement.
**Bénéfice pour le mémoire :** ce pattern illustre concrètement le passage d'une approche DevSecOps "procédurale" (checklist humaine) à une approche "par contrat" (admission control automatisé), axe de contribution scientifique du travail.
