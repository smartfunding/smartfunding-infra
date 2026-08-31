# ADR-0001 — Adoption de k3s comme cluster unique + cadre DevSecOps durable

**Statut :** Accepté
**Date :** 2026-08-07
**Service concerné :** transverse (les 11 dépôts)

## Contexte
Le plan initial prévoyait k3d/minikube pour le développement local et un cluster Kubernetes générique pour la production. Le projet sert de démonstrateur pour un mémoire de Master 2 sur une approche DevSecOps durable.

## Décision
Adopter **k3s** comme cluster unique du poste de développement à la démonstration finale, avec un pipeline CI/CD intégrant des gates de sécurité (SAST, SCA, scan image, signature, policy-as-code) et une instrumentation de mesure énergétique (Kepler).

## Alternatives considérées
| Option | Avantages | Inconvénients | Raison du rejet |
|---|---|---|---|
| K8s vanilla (kubeadm) | Standard, flexible | Complexe à opérer, empreinte mémoire du plan de contrôle plus lourde | Incohérent avec la démarche de sobriété |
| k3d/minikube en dev + EKS/GKE en prod | Managé, simple en prod | Deux outils différents dev/prod, coût cloud, moins pertinent pour un mémoire auto-hébergeable | Complexité opérationnelle, argument de sobriété plus faible |
| k3s unique | Léger, un seul outil bout-en-bout, conforme (CNCF) | Moins connu en entreprise que EKS/GKE | **Retenu** |

## Conséquences
- **Positives :** cohérence dev/staging/prod, empreinte réduite, argumentaire de sobriété numérique direct pour le mémoire
- **Négatives / dette technique acceptée :** stockage `local-path-provisioner` non distribué en mode single-node (limite documentée, Longhorn en perspective)
- **Impact sécurité :** NetworkPolicy natif disponible dès l'installation (kube-router), pas de CNI additionnel nécessaire pour un cloisonnement de base
- **Impact durabilité :** empreinte mesurable via Kepler, comparable avant/après optimisation

## Références
- `smartfunding-infra/TASKS.md` §0
