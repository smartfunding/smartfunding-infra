# ADR-0003 — NetworkPolicy service-à-service précise, générée depuis un graphe d'appels versionné

**Statut :** Accepté — complète l'ADR-0002 (ne le contredit pas)
**Date :** 2026-08-08
**Service concerné :** transverse (les 11 dépôts déployés sur k3s)

## Contexte
L'ADR-0002 avait corrigé un bug bloquant (NetworkPolicy Gateway-only cassant les appels directs) en ouvrant l'ingress à tout le namespace. Cette solution était volontairement notée comme dette assumée : un pod compromis peut atteindre n'importe quel autre service du même namespace, pas seulement ceux qu'il est censé appeler. La raison du rejet d'un cloisonnement fin à l'époque était la **maintenabilité** — énumérer chaque paire appelant/appelé à la main, dans 11 fichiers différents, est source d'oubli silencieux.

## Décision
Combler cette dette **sans service mesh** (mTLS/Istio/Linkerd rejetés par sobriété — sidecars supplémentaires sur chaque pod, complexité opérationnelle et empreinte mémoire/CPU disproportionnées pour un cluster de démonstration k3s) : créer `CALL_GRAPH.yaml` comme **source de vérité unique** du graphe d'appels HTTP synchrones inter-services, et un générateur (`scripts/generate-networkpolicies.py`) qui produit automatiquement le bloc `ingress` précis de chaque `NetworkPolicy` à partir de ce fichier. Le problème de maintenabilité est résolu par l'outillage (un seul fichier à modifier, régénération automatique), pas par le renoncement à la précision.

## Alternatives considérées
| Option | Avantages | Inconvénients | Raison du rejet |
|---|---|---|---|
| Namespace entier (ADR-0002, statu quo) | Simple, zéro maintenance | Pas de cloisonnement service-à-service réel | Rejeté maintenant qu'un outillage résout le problème de maintenabilité initial |
| Service mesh (Istio/Linkerd) + mTLS | Zero-trust complet, identité cryptographique par service | Sidecar sur chaque pod (+CPU/mémoire par service, mesurable négativement par Kepler), composant supplémentaire à opérer et sécuriser, complexité disproportionnée pour un cluster de démonstration | Rejeté — contraire au principe de sobriété (§0.3 de `smartfunding-infra.md`) |
| **NetworkPolicy générée depuis un graphe versionné (retenu)** | Précision du cloisonnement service-à-service, zéro composant runtime supplémentaire (ressources k3s natives uniquement), un seul fichier source de vérité, vérifiable en CI (`--check`) | Le graphe doit être tenu à jour manuellement quand un nouvel appel inter-service apparaît (mais désormais à un seul endroit, et vérifiable automatiquement) | **Retenu** |

## Fonctionnement
1. `CALL_GRAPH.yaml` liste, pour chaque service, la liste exacte des services autorisés à l'appeler directement (construit à partir des appels réellement documentés dans les `TASKS.md`, pas de suppositions)
2. `scripts/generate-networkpolicies.py` régénère le bloc `spec.ingress` de chaque `k3s/base/networkpolicy.yaml` à partir de ce graphe — préserve intégralement le bloc `default-deny` et le bloc `egress` (bases de données, APIs externes), qui restent gérés manuellement par service
3. `scripts/generate-networkpolicies.py --check` (mode lecture seule, exit 1 si dérive) — **à intégrer au pipeline `iac-scan.yml` de smartfunding-infra** pour empêcher qu'un `networkpolicy.yaml` édité à la main diverge silencieusement du graphe déclaré

## Conséquences
- **Positives :** cloisonnement réseau réellement précis sans aucun composant supplémentaire ; toute évolution du graphe d'appels se fait en un seul endroit, régénération automatique, dérive détectable en CI
- **Négatives / dette technique restante et assumée :** ce n'est toujours pas un zero-trust cryptographique (pas d'identité par service, un pod peut usurper son label `app.kubernetes.io/name` s'il est compromis avec des droits suffisants sur le cluster — risque mitigé par les policies Kyverno et le Pod Security Standard `restricted` déjà en place, mais pas éliminé) ; un vrai service mesh reste l'amélioration ultime si le projet dépasse le cadre du mémoire
- **Impact durabilité :** nul — uniquement des ressources `NetworkPolicy` déclaratives, aucune empreinte CPU/mémoire runtime supplémentaire, cohérent avec la sobriété déjà revendiquée

## Références
- `smartfunding-infra/CALL_GRAPH.yaml`
- `smartfunding-infra/scripts/generate-networkpolicies.py`
- `smartfunding-infra/docs/adr/0002-networkpolicy-namespace-trust-boundary.md` (contexte initial)
