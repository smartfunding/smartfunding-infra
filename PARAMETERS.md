# PARAMETERS.md — Valeurs de référence obligatoires

Ce document tranche toutes les valeurs laissées ouvertes ("configurable", "seuil à définir") dans les `TASKS.md`. **Un agent qui code un service DOIT utiliser ces valeurs, jamais en inventer d'autres.** Toute modification passe par un ADR (`docs/adr/`) et une mise à jour de ce fichier.

## Authentification (smartfunding-auth)
| Paramètre | Valeur |
|---|---|
| TTL access token (JWT) | 15 minutes |
| TTL refresh token | 7 jours |
| Algorithme JWT | RS256 (clé privée en Vault, clé publique distribuée aux services pour vérification locale si besoin) |
| Coût bcrypt | 12 |
| Tentatives avant verrouillage | 5 |
| Durée de verrouillage | 15 minutes |
| Fenêtre de tolérance TOTP | *(retiré — 2FA email uniquement pour cette itération, voir décision ADR)* |
| **Code OTP (2FA email)** | 6 chiffres numériques, généré via crypto natif Node (`crypto.randomInt`), jamais `Math.random()` |
| Expiration du code OTP | 10 minutes |
| Tentatives de vérification OTP avant invalidation | 5 |
| Cooldown avant renvoi d'un nouveau code (`/auth/2fa/resend`) | 60 secondes |
| Fournisseur email 2FA | **Resend** (palier gratuit permanent, 3000 emails/mois) — voir `smartfunding-auth/docs/adr/0001-2fa-email-uniquement.md` |
| **Secours email** | **Brevo** (palier gratuit permanent, 300/jour) en secours automatique de Resend — voir `smartfunding-notifications/docs/adr/0002-double-fournisseur-email.md` |
| Circuit Breaker email : seuil d'échecs (Resend → Brevo) | 3 échecs consécutifs |
| Circuit Breaker email : fenêtre de repos (OPEN) | 60 secondes |
| Alerte si circuit email reste OPEN | > 15 minutes (Alertmanager) |
| Rate limit `/auth/register` | 5 / heure / IP |
| Rate limit `/auth/login` | 10 / 15 min / IP |
| Cache TTL `/auth/verify` (côté appelant) | 30 secondes |

## Gateway (smartfunding-gateway)
| Paramètre | Valeur |
|---|---|
| Timeout appel interne (par défaut) | 10 secondes |
| Timeout appel interne (Documents — upload) | 30 secondes |
| Circuit Breaker interne : seuil d'échecs | 5 échecs consécutifs |
| Circuit Breaker interne : fenêtre de repos (OPEN) | 30 secondes |
| Rate limit global par organisation | 100 req/min (Starter), 300 (Pro), 1000 (Business), illimité (Enterprise) |

## Funders (smartfunding-funders)
| Paramètre | Valeur |
|---|---|
| Circuit Breaker ADEME/Bpifrance : seuil d'échecs | 3 échecs consécutifs |
| Circuit Breaker : fenêtre de repos (OPEN) | 60 secondes |
| Timeout appel API externe | 5 secondes |
| TTL cache Redis du matching | 5 minutes |
| Fréquence job de synchronisation | quotidien, 02h00 (heure creuse) |
| Poids BR-001 | secteur_match=0.4, montant_adequation=0.3, temporalite=0.2, historique_succes=0.1 |

## Billing (smartfunding-billing)
| Paramètre | Valeur |
|---|---|
| **Processeur principal** | **Maviance/Smobilpay** (Mobile Money CEMAC — décision ADR, voir `smartfunding-billing/docs/adr/0001`) |
| Expiration d'un devis (quote) Maviance | 3 minutes (à confirmer/ajuster contre la doc S3P au moment de l'implémentation — la doc officielle indique "quelques minutes" sans valeur fixe publiée) |
| Fréquence de polling `verifytx` (statut `PENDING`) | toutes les 2 minutes, pendant 30 minutes maximum |
| Circuit Breaker Maviance : seuil d'échecs | 3 échecs consécutifs |
| Circuit Breaker Maviance : fenêtre de repos (OPEN) | 60 secondes |
| Circuit Breaker Stripe/PayPal (secondaires) : seuil d'échecs | 3 échecs consécutifs |
| Relance après échec de paiement | J+3 puis J+7, puis passage en `past_due` définitif |
| Devise de collecte Maviance | XAF (conversion depuis EUR, taux du jour — fournisseur de taux à définir) |
| Plans tarifaires | voir `contracts/src/billing.ts` (`PLAN_LIMITS`, `PLAN_PRICING`) — source unique de vérité, toujours en EUR |
| Environnement Maviance staging | `https://s3p.smobilpay.staging.maviance.info/v2` |
| Environnement Maviance production | `https://s3papidoc.smobilpay.maviance.info/v2` |
| Version API Maviance (header `x-api-version`) | 3.0.0 (à revalider à l'implémentation — les versions évoluent) |

## Notifications (smartfunding-notifications)
| Paramètre | Valeur (règle BR-003) |
|---|---|
| Deadline financeur urgente | < 24h |
| Demande complémentaire non traitée | > 48h |
| Échéance de paiement | < 7 jours |
| Signature manquante | < 3 jours |
| Fréquence du CronJob d'évaluation BR-003 | toutes les heures |
| Déduplication d'alerte | 1 alerte max par `(entité, type, jour)` |
| Retry email/SMS (échec temporaire) | 3 tentatives, backoff 30s/2min/10min |
| Désactivation webhook sortant | après 10 échecs consécutifs |

## Workflow (smartfunding-workflow)
| Paramètre | Valeur |
|---|---|
| Retry activité "appel externe" | 5 tentatives, backoff exponentiel (base 2s, max 5min) |
| Retry activité "interne déterministe" | 2 tentatives |
| Timeout `startToCloseTimeout` (soumission externe) | 2 minutes |
| Timeout `startToCloseTimeout` (interne) | 30 secondes |
| Marge de sécurité deadline financeur | -24h (une deadline est considérée atteinte 24h avant l'heure réelle, pour absorber fuseau horaire/jour férié) |

## Documents (smartfunding-documents)
| Paramètre | Valeur |
|---|---|
| Taille max upload | 50 Mo |
| Formats acceptés | pdf, docx, xlsx, png, jpg |
| Timeout pipeline complet (upload→READY) | 2 minutes |
| Durée de validité URL signée MinIO | 5 minutes |
| Compression image | qualité 80 %, résolution max 2000px (dimension la plus grande) |

## Ressources & scaling k3s — voir tableau consolidé
| Service | CPU req/lim | Mem req/lim | Replicas min/max | HPA cible CPU |
|---|---|---|---|---|
| auth | 100m/300m | 128Mi/256Mi | 2/5 | 70% |
| projects | 100m/300m | 128Mi/256Mi | 1/4 | 70% |
| documents | 200m/600m | 256Mi/512Mi | 1/4 | 70% |
| funders | 150m/400m | 192Mi/384Mi | 1/3 | 70% |
| ai | 300m/800m | 512Mi/1Gi | 1/3 | 70% |
| workflow | 100m/300m | 128Mi/256Mi | 1/3 | 70% |
| notifications | 100m/300m | 128Mi/256Mi | 1/3 | 70% |
| billing | 100m/300m | 128Mi/256Mi | 1/3 | 70% |
| onboarding | 100m/300m | 128Mi/256Mi | KEDA scale-to-zero | — |
| gateway | 150m/400m | 128Mi/256Mi | 2/6 | 60% |
| web | 150m/400m | 192Mi/384Mi | 2/6 | 70% |

## Cibles qualité — CORRIGÉES suite à l'audit du cahier des charges (2026-08-07)
> Ces valeurs remplacent celles utilisées précédemment dans les `TASKS.md` de chaque service, qui avaient été fixées par erreur sans le cahier des charges original.

| Métrique | Ancienne valeur (Plan de Travail seul) | Valeur correcte (cahier des charges) | Source |
|---|---|---|---|
| Couverture de tests | ≥ 80 % | **≥ 90 %** | §7.3 |
| Taux d'erreur technique | < 1 % | **< 0,1 %** | §7.3 |
| CSAT | > 4/5 | **> 4,5/5** | §7.2 |
| Taux d'adoption produit | non défini | **> 80 %** | §7.2 |
| Réduction temps moyen par tâche | non tracé | **-60 %** | §7.2, alimenté par `OrganizationKpiSnapshot.timeSavedVsManualEstimateHours` |
| Taux de succès financements | non tracé | **+40 %** | §7.2, alimenté par `OrganizationKpiSnapshot.successRate` |
| Churn rate | non défini | **< 5 %** | §7.1 |
| NPS | > 50 (repris correctement) | > 50 (confirmé) | §7.1 et §7.2 |
| SUS score (utilisabilité, plan de validation) | non défini | **> 80** | §11.2 |
| Taux de conversion (plan de validation) | non défini | **> 30 %** | §11.2 |
| Use cases fonctionnels validés | non défini | **95 %** | §11.2 |
| Performance objectifs atteints | non défini | **90 %** | §11.2 |
| Audit sécurité | "sans faille critique" (déjà cohérent) | sans faille critique | §11.2 |

**Action pour l'agent :** partout où un `TASKS.md` mentionne "couverture ≥ 80 %" ou "taux d'erreur < 1 %", c'est la valeur ci-dessus (90 % / 0,1 %) qui prévaut. Les fichiers `TASKS.md` eux-mêmes seront progressivement corrigés ; en cas de doute, ce tableau fait foi.

## Conformité réglementaire — précision manquante
- [ ] **Loi Pacte** (cahier des charges §10.1) : à documenter dans `smartfunding-infra` — implications sur les types de financement affichés/éligibles pour les PME françaises (pas encore traité dans le Plan de Travail d'origine)


Convention : `{SERVICE}_{RAISON}` en SCREAMING_SNAKE_CASE.
Exemples déjà tranchés : `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_LOCKED`, `AUTH_2FA_REQUIRED`, `PROJECT_NOT_FOUND`, `PROJECT_INVALID_STATUS_TRANSITION`, `DOCUMENT_FILE_TOO_LARGE`, `DOCUMENT_UNSUPPORTED_FORMAT`, `FUNDER_DEADLINE_EXPIRED`, `BILLING_QUOTA_EXCEEDED`, `BILLING_INVALID_WEBHOOK_SIGNATURE`.
Un agent ajoutant un nouveau code doit l'ajouter à cette liste (fichier à faire évoluer : ce tableau devient la référence complète au fil du développement).
