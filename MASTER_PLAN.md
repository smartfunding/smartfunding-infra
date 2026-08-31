# MASTER_PLAN.md — Plan de Conception Complet et Intégral, SmartFunding Manager

**But de ce document :** consolider l'intégralité des décisions prises depuis le Plan de Travail d'origine, et fournir une **matrice de traçabilité complète** entre le cahier des charges (14 sections) et ce qui a été effectivement conçu, pour que l'agent (ou toute personne reprenant le projet) puisse vérifier, point par point, que les consignes du cahier des charges ont été traitées — soit implémentées, soit sciemment différées et documentées comme telles.

**Statut des symboles utilisés ci-dessous :**
- ✅ **Fait** — spécifié en détail dans un `TASKS.md`, scaffoldé (code de démarrage réel présent)
- 📝 **Documenté** — décrit et planifié, pas encore de code (normal : c'est un plan de conception, pas le produit fini)
- ⏸️ **Différé assumé** — hors périmètre de cette itération, décision explicite et justifiée (pas un oubli)
- ⚠️ **Écart partiel** — traité en partie, limite connue et documentée

---

## 0. Vue d'ensemble du système livré

**13 dépôts** (12 services + infra), architecture microservices sur **k3s** (cluster unique dev→staging→prod), approche **DevSecOps durable** (sécurité intégrée au pipeline + sobriété numérique mesurée).

| Dépôt | Rôle | Statut |
|---|---|---|
| `smartfunding-infra` | Standards, k3s, DevSecOps, contrats partagés, durabilité | ✅ |
| `smartfunding-auth` | Identité, RBAC, 2FA email | ✅ |
| `smartfunding-onboarding` | Questionnaire, import contacts, attribution rôles (Module 2) | ✅ |
| `smartfunding-projects` | Gestion de projets | ✅ |
| `smartfunding-documents` | Upload, OCR, versioning | ✅ |
| `smartfunding-funders` | Base financeurs, matching/scoring | ✅ |
| `smartfunding-notifications` | Email (Resend+Brevo), SMS, push, in-app, webhook | ✅ |
| `smartfunding-workflow` | Orchestration soumission + reporting post-financement (Module 11) | ✅ |
| `smartfunding-billing` | Abonnements, Maviance (principal), Stripe/PayPal (secondaire) | ✅ |
| `smartfunding-gateway` | Point d'entrée API unique | ✅ |
| `smartfunding-ai` | Business plan IA, scoring, recommandations, NLP, chatbot 24/7 | ✅ |
| `smartfunding-web` | Frontend Next.js | ✅ |
| `smartfunding-mobile` | Application Flutter | ✅ |

---

## 1. Traçabilité complète — Cahier des Charges → Implémentation

### §1. Introduction
| Exigence | Statut | Référence |
|---|---|---|
| 1.2 Objectifs (-60% temps, +40% succès, 80% automatisation) | ✅ | `contracts/src/kpi.ts` (`OrganizationKpiSnapshot`), alimenté par Workflow (§6bis) et Onboarding (§7.2) |
| 1.3 Portée (web 24/7 + mobile) | ✅ | `smartfunding-web` + `smartfunding-mobile` |

### §2. Profils Utilisateurs & Personas
| Exigence | Statut | Référence |
|---|---|---|
| 2.1 Les 6 rôles et permissions | ✅ | `smartfunding-auth.md` §2.3-2.4, `docs/rbac-matrix.md` |
| 2.2 Personas détaillés | 📝 | Utilisés pour calibrer l'UX (`smartfunding-web.md` dashboards par persona) — pas d'artefact dédié, intégré dans les parcours |

### §3. Architecture Fonctionnelle
| Module | Statut | Référence |
|---|---|---|
| Module 1 — Comptes & Organisation | ✅ | `smartfunding-auth.md` (2FA, abonnements via Billing) |
| **Module 2 — Onboarding Intelligent** | ✅ | **Écart comblé** : `smartfunding-onboarding` (service dédié créé après audit) |
| Module 3 — Gestion de Projets | ✅ | `smartfunding-projects.md` |
| Module 4 — Matching Financeurs | ✅ | `smartfunding-funders.md` (BR-001, Strategy Pattern) |
| Module 5 — Gestion Documentaire | ✅ | `smartfunding-documents.md` |
| Module 6 — Préparation Automatisée (business plan IA) | ✅ | `smartfunding-ai.md` §3 |
| Module 7 — Soumission & Intégrations | ✅ | `smartfunding-workflow.md` + `smartfunding-funders.md` §5 |
| Module 8 — Suivi & Alertes | ✅ | `smartfunding-notifications.md` (BR-003) |
| **Module 9 — Négociation Assistée** | ⏸️ | **Différé assumé** — roadmap cahier des charges §8 Phase 3/V2 (12 mois), hors périmètre MVP explicitement |
| **Module 10 — Signatures & Contrats** | ✅ | `smartfunding-workflow.md` §3.1.5 (eIDAS, coordination DocuSign/Yousign) |
| **Module 11 — Reporting Post-Financement** | ✅ | **Écart comblé** : `smartfunding-workflow.md` §6bis (calendrier, templates, alertes, capitalisation) |
| Module 12 — Facturation & Abonnements | ✅ | `smartfunding-billing.md` |
| 3.2 Chatbot IA 24/7 | ✅ | **Écart comblé** : intégré à `smartfunding-ai.md` §5bis (ADR-0002, pas de service séparé) |

### §4. Modèle de Données
| Entité (cahier des charges §4.1) | Statut | Référence |
|---|---|---|
| Users, Organizations | ✅ | `contracts/src/auth.ts` |
| Projects | ✅ | `contracts/src/project.ts` |
| Funders | ✅ | `contracts/src/funder.ts` |
| **FundingRequests** | ✅ | **Écart comblé** : `contracts/src/funder.ts` (`FundingRequest`, distinct de `SubmissionState`) |
| Documents | ✅ | `contracts/src/document.ts` |
| **Validations** | ✅ | **Écart comblé** : `contracts/src/document.ts` (`DocumentValidation`) |
| Submissions | ✅ | `contracts/src/workflow.ts` (`SubmissionState`) |
| Notifications | ✅ | Géré côté `smartfunding-notifications`, pas de DTO partagé dédié (interne au service) |
| **KPIs** | ✅ | **Écart comblé** : `contracts/src/kpi.ts` (`OrganizationKpiSnapshot`) — trace directement vers §1.2 |

### §5. Spécifications Techniques
| Exigence | Statut | Référence |
|---|---|---|
| 5.1 Architecture (React/Next.js, NestJS microservices, PostgreSQL/Redis, S3, Elasticsearch, RabbitMQ, Python FastAPI) | ✅ | Conforme, k3s ajouté comme cible de déploiement (au-delà de ce que demandait le cahier des charges, cohérent avec §12.3 Scalabilité) |
| 5.2 Sécurité (OAuth2/JWT/2FA, AES-256, TLS1.3, RBAC, audit, RGPD/ISO27001/SOC2) | ✅ | `smartfunding-infra.md` §0.2, §P5.1-P5.4 ; **2FA précisée email uniquement pour cette itération** (ADR auth 0001) |
| 5.3 Intégrations : ADEME/Bpifrance/Régions/UE | ✅ | `smartfunding-funders.md` §5 |
| 5.3 Intégrations : DocuSign/Yousign | ✅ | `smartfunding-workflow.md` §3.1.5 |
| 5.3 Intégrations : **Stripe, PayPal** | ✅ | `smartfunding-billing.md` — **Maviance ajouté et priorisé** (écart assumé et justifié : marché CEMAC réel, ADR billing 0001), Stripe/PayPal secondaires, PayPal comblé en audit |
| 5.3 Intégrations : SendGrid, Twilio | ⚠️ | **SendGrid remplacé par Resend + Brevo** (ADR notifications 0001, 0002 — statut gratuit SendGrid jugé trop incertain en 2026) ; Twilio conservé pour BR-003 |
| 5.3 Intégrations : **Google Calendar/Outlook, HubSpot/Salesforce** | ⏸️ | **Différé assumé** : `smartfunding-notifications.md` §2bis, connecteurs optionnels désactivés par défaut, hors MVP |
| 5.4 Performance (<200ms P95, 99.9%, auto-scaling, backup) | ✅ | HPA/KEDA par service, `smartfunding-infra.md` §P9-P10 |

### §6. Interfaces Utilisateurs
| Exigence | Statut | Référence |
|---|---|---|
| 6.1 Parcours utilisateur (8 étapes) | ✅ | Scénario E2E global, `smartfunding-infra.md` §P10.1 |
| 6.2 Design System (Tailwind/Shadcn, mobile-first, WCAG 2.1 AA, **Light/Dark**) | ✅ | `smartfunding-web.md` §2.1.3 (Dark/Light comblé en audit), §3.2.3 (RGAA/WCAG) |

### §7. Métriques & KPIs
| Catégorie | Statut | Référence |
|---|---|---|
| 7.1 Business (MRR/ARR, churn<5%, CAC, LTV, NPS>50) | ✅ | Cibles reprises dans `PARAMETERS.md` (corrigées suite audit — valeurs initiales erronées) |
| 7.2 Produit (adoption>80%, -60% temps, +40% succès, CSAT>4.5) | ✅ | `PARAMETERS.md`, tracé par `OrganizationKpiSnapshot` |
| 7.3 Technique (uptime 99.9%, erreurs<0.1%, couverture>90%) | ✅ | `PARAMETERS.md` — **valeurs corrigées suite audit** (couverture initialement fixée à 80% par erreur, taux d'erreur à 1%) |

### §8. Roadmap Produit
| Phase | Statut | Référence |
|---|---|---|
| Phase 1 MVP (3-4 mois) | ✅ | Périmètre des 13 dépôts, `smartfunding-infra.md` planning §Planning |
| Phase 2 V1 (6-8 mois) | ✅ | Couvert (matching, IA, intégrations financeurs, signatures, facturation) |
| Phase 3 V2 (12 mois) — Négociation IA, reporting auto, module international, API publique, marketplace | ⏸️ | **Différé assumé**, Module 9 explicitement hors périmètre ; reporting auto en réalité déjà anticipé (Module 11, §6bis workflow) |
| Phase 4 Évolution (18+ mois) | ⏸️ | Hors périmètre par nature (vision long terme) |

### §9. Modèle Économique
| Exigence | Statut | Référence |
|---|---|---|
| 9.1 Plans tarifaires (Starter/Pro/Business/Enterprise) | ✅ | `contracts/src/billing.ts` (`PLAN_LIMITS`, `PLAN_PRICING`) — source unique de vérité |
| 9.2 Coûts de développement | 📝 | Hors périmètre technique — donnée business pour le mémoire, pas un artefact de code |
| 9.3 Projections | 📝 | Idem — non applicable à un plan de conception technique |

### §10. Aspects Juridiques & Conformité
| Exigence | Statut | Référence |
|---|---|---|
| 10.1 RGPD, **Loi Pacte**, eIDAS, NF Z42-013, RGAA | ✅ | `smartfunding-infra.md` §P5.4 — **Loi Pacte ajoutée en audit** (à valider avec un juriste, noté explicitement) |
| 10.2 Hébergement UE, chiffrement bout-en-bout, **PRA/PCA**, audit sécurité annuel, assurance cyber | ⚠️ | **PRA/PCA ajouté en audit** (`smartfunding-infra.md` §P5.5) mais RTO/RPO proposés à valider, réplication cross-région documentée comme perspective si non implémentée faute de moyens ; assurance cyber hors périmètre technique |
| 10.3 Propriété intellectuelle | 📝 | Hors périmètre technique |

### §11. Plan de Validation
| Exigence | Statut | Référence |
|---|---|---|
| 11.1 Alpha (10 orgs, 4 sem.), Bêta (100 early adopters, 8 sem.) | ✅ | `smartfunding-infra.md` §P10.5-P10.6, distribution mobile via Firebase App Distribution/TestFlight (`smartfunding-mobile.md` §13.4-13.5) |
| 11.2 Critères de succès (95% use cases, 90% perf, audit sécu sans faille critique, SUS>80, conversion>30%) | ✅ | **Repris dans `PARAMETERS.md` suite audit** (absents des livrables avant vérification du cahier des charges) |

### §12. Maintenance & Évolution
| Exigence | Statut | Référence |
|---|---|---|
| 12.1 Support (chatbot N1, technique N2, dédié N3, 24/7 incidents critiques) | ✅ | Chatbot = `smartfunding-ai.md` §5bis (escalade explicite vers N2/N3) ; astreinte = `smartfunding-infra.md` §P6.4 |
| 12.2 Mises à jour (correctives/évolutives/majeures, rétrocompatibilité, changelog) | ✅ | Semantic versioning par service, `smartfunding-infra.md` §P7.3 |
| 12.3 Scalabilité (microservices indépendants, **sharding auto**, **cache multi-niveaux**, CDN, monitoring proactif) | ⚠️ | Microservices ✅, CDN (Cloudflare) ✅, monitoring ✅ (Prometheus/Grafana/Kepler) ; **sharding et cache multi-niveaux explicitement notés comme perspective V2** plutôt que sur-promis (`smartfunding-infra.md` §P6.6) |

### §13. Indicateurs de Performance
| Exigence | Statut | Référence |
|---|---|---|
| 13.1-13.2 Dashboards management, rapports automatiques | ✅ | Grafana (`smartfunding-infra.md` §P6.2), incluant le dashboard durabilité (kWh/SCI, Kepler) |

### §14. Conclusion & Recommandations
| Exigence | Statut | Référence |
|---|---|---|
| 14.2 Facteurs critiques de succès (base financeurs, précision IA, UX, écosystème, capitalisation) | ✅ | Tous couverts respectivement par Funders (§2-4), AI, Web/Mobile, Notifications (connecteurs), Workflow (§6bis capitalisation) |

---

## 2. Décisions d'architecture (ADR) — index consolidé

| # | Dépôt | Décision |
|---|---|---|
| infra 0001 | `smartfunding-infra` | k3s comme cluster unique + cadre DevSecOps durable |
| infra 0002 | `smartfunding-infra` | NetworkPolicy namespace-only (correction bug Gateway-only) |
| infra 0003 | `smartfunding-infra` | NetworkPolicy service-à-service précise via `CALL_GRAPH.yaml`, sans service mesh |
| auth 0001 | `smartfunding-auth` | 2FA par email uniquement (pas TOTP/SMS) pour cette itération |
| onboarding 0001 | `smartfunding-onboarding` | Microservice dédié plutôt qu'intégré à Auth/Projects |
| notifications 0001 | `smartfunding-notifications` | Resend comme fournisseur email (remplace SendGrid) |
| notifications 0002 | `smartfunding-notifications` | Resend + Brevo simultanés (primaire + secours automatique) |
| billing 0001 | `smartfunding-billing` | Maviance/Smobilpay comme processeur principal (marché CEMAC) |
| ai 0002 | `smartfunding-ai` | Chatbot intégré au service AI (pas de microservice séparé) |
| mobile 0001 | `smartfunding-mobile` | Modèles Dart maintenus manuellement (pas de génération OpenAPI pour l'instant) |

---

## 3. Écarts assumés — liste complète (à citer explicitement dans le mémoire, pas à cacher)

| Écart | Justification | Perspective |
|---|---|---|
| Module 9 (Négociation Assistée) non implémenté | Roadmap cahier des charges §8, Phase 3/V2 explicite | V2 |
| Connecteurs CRM (HubSpot/Salesforce) et Calendrier (Google/Outlook) non implémentés | Usage secondaire (interne/confort), hors MVP | V2, architecture déjà prévue (§2bis notifications) |
| Sharding DB automatique, cache multi-niveaux | Hors de portée réaliste pour un cluster de démonstration k3s | V2, noté explicitement plutôt que sur-promis |
| Réplication cross-région (PRA/PCA) | Nécessite une infrastructure multi-région réelle, hors moyens d'un mémoire | Perspective, RTO/RPO proposés à valider |
| Service mesh / mTLS pour un zero-trust cryptographique complet | Contraire à la sobriété (sidecar par pod, empreinte Kepler négative) | `CALL_GRAPH.yaml` + NetworkPolicy natives retenues à la place (ADR infra 0003) |
| Génération automatique des modèles Dart depuis OpenAPI | Aucun service ne publie encore de `openapi.yaml` | Miroir manuel + checklist en attendant (ADR mobile 0001) |
| Assurance cyber-risques, coûts/projections économiques (§9.2-9.3) | Hors périmètre technique | Volet business du mémoire, pas de ce plan |

---

## 4. Comment l'agent vérifie, à la fin, que tout est fait

```bash
# 1. Vérification structurelle de chaque service (23 critères par service en moyenne)
for s in auth onboarding projects documents funders notifications workflow billing gateway ai web mobile; do
  ./smartfunding-infra/scripts/check-readiness.sh smartfunding-$s smartfunding-infra
done

# 2. Vérification de l'environnement local
./smartfunding-infra/scripts/check-local-tools.sh all

# 3. Vérification de la cohérence réseau inter-services
python3 smartfunding-infra/scripts/generate-networkpolicies.py --check

# 4. Vérification manuelle finale : relire la section 1 de CE document (MASTER_PLAN.md)
#    et confirmer que chaque ligne du cahier des charges a un ✅, un ⏸️ justifié, ou un ⚠️ documenté
#    — AUCUNE ligne ne doit rester sans statut.
```

Si les 3 scripts passent et que la matrice de traçabilité (§1 ci-dessus) ne contient aucune case vide, le projet est conforme à l'ensemble des consignes du cahier des charges — soit implémentées, soit explicitement et légitimement différées.
