#!/bin/bash
# check-readiness.sh — Vérifie qu'un service a TOUT le nécessaire pour être implémenté,
# AVANT que l'agent commence à écrire du code métier.
#
# Usage : ./check-readiness.sh <chemin-vers-le-service> [chemin-vers-smartfunding-infra]
# Exemple : ./check-readiness.sh ../smartfunding-auth ../smartfunding-infra
# Exit code : 0 si tout est prêt, 1 sinon (utilisable dans un pipeline CI en pré-check).

set -uo pipefail

SERVICE_DIR="${1:?Usage: $0 <chemin-vers-le-service> [chemin-vers-smartfunding-infra]}"
INFRA_DIR="${2:-$(dirname "$SERVICE_DIR")/smartfunding-infra}"
SERVICE_NAME=$(basename "$SERVICE_DIR")

PASS=0
FAIL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

check() {
  local description="$1" condition="$2"
  if eval "$condition"; then
    echo -e "  ${GREEN}✓${NC} $description"
    PASS=$((PASS+1))
  else
    echo -e "  ${RED}✗${NC} $description"
    FAIL=$((FAIL+1))
  fi
}

warn() {
  echo -e "  ${YELLOW}!${NC} $1"
}

echo "=== Vérification de préparation : $SERVICE_NAME ==="
echo ""

echo "-- Documentation --"
check "TASKS.md présent et non vide"        "[ -s '$SERVICE_DIR/TASKS.md' ]"
check "README.md présent"                    "[ -f '$SERVICE_DIR/README.md' ]"
check "docs/threat-model.md présent"         "[ -f '$SERVICE_DIR/docs/threat-model.md' ]"
check "docs/adr/ présent"                    "[ -d '$SERVICE_DIR/docs/adr' ]"

echo ""
echo "-- Configuration & secrets --"
check ".env.example présent"                 "[ -f '$SERVICE_DIR/.env.example' ]"
check ".gitignore présent (protège .env)"    "[ -f '$SERVICE_DIR/.gitignore' ] && grep -q '^\.env$' '$SERVICE_DIR/.gitignore'"

echo ""
echo "-- Stack applicative --"
if [ -f "$SERVICE_DIR/pubspec.yaml" ]; then
  # --- Cas Flutter/Dart : pas de Docker/k3s (application cliente), outillage différent ---
  check "pubspec.yaml présent"               "true"
  check "analysis_options.yaml présent (lint)" "[ -f '$SERVICE_DIR/analysis_options.yaml' ]"
  warn "Dépôt Flutter détecté : Dockerfile et manifestes k3s non applicables (application cliente, cf. README.md)"
elif [ -f "$SERVICE_DIR/package.json" ]; then
  check "package.json présent"               "true"
  check "Dockerfile présent"                 "[ -f '$SERVICE_DIR/Dockerfile' ]"
  if [ "$SERVICE_NAME" != "smartfunding-web" ]; then
    check "@smartfunding/common-dto déclaré en dépendance" \
      "grep -q '@smartfunding/common-dto' '$SERVICE_DIR/package.json' 2>/dev/null || [ -d '$SERVICE_DIR/node_modules/@smartfunding/common-dto' ]"
  fi
elif [ -f "$SERVICE_DIR/requirements.txt" ]; then
  check "requirements.txt présent"           "true"
  check "Dockerfile présent"                 "[ -f '$SERVICE_DIR/Dockerfile' ]"
else
  check "Manifeste de dépendances présent (package.json, requirements.txt ou pubspec.yaml)" "false"
fi

echo ""
echo "-- CI/CD & sécurité DevSecOps --"
check "workflow ci.yml présent"              "[ -f '$SERVICE_DIR/.github/workflows/ci.yml' ]"
check "workflow cd.yml présent"              "[ -f '$SERVICE_DIR/.github/workflows/cd.yml' ]"
if [ -f "$SERVICE_DIR/pubspec.yaml" ]; then
  check "OSV-Scanner référencé dans ci.yml (SCA Dart/pub)" "grep -q 'osv-scanner' '$SERVICE_DIR/.github/workflows/ci.yml' 2>/dev/null"
else
  check "workflow iac-scan.yml présent"      "[ -f '$SERVICE_DIR/.github/workflows/iac-scan.yml' ]"
fi
check "hook pre-commit (gitleaks) présent"   "[ -f '$SERVICE_DIR/.husky/pre-commit' ] || [ -f '$SERVICE_DIR/.pre-commit-config.yaml' ]"

echo ""
if [ -f "$SERVICE_DIR/pubspec.yaml" ]; then
  echo "-- Déploiement k3s : SANS OBJET (application cliente distribuée aux stores) --"
else
  echo "-- Déploiement k3s --"
  check "k3s/base/deployment.yaml présent"     "[ -f '$SERVICE_DIR/k3s/base/deployment.yaml' ]"
  check "k3s/base/service.yaml présent"        "[ -f '$SERVICE_DIR/k3s/base/service.yaml' ] || [ -f '$SERVICE_DIR/k3s/base/scaledobject.yaml' ]"
  check "k3s/base/networkpolicy.yaml présent"  "[ -f '$SERVICE_DIR/k3s/base/networkpolicy.yaml' ]"
  check "overlays dev/staging/prod présents"   "[ -d '$SERVICE_DIR/k3s/overlays/dev' ] && [ -d '$SERVICE_DIR/k3s/overlays/staging' ] && [ -d '$SERVICE_DIR/k3s/overlays/prod' ]"
  if [ -f "$INFRA_DIR/CALL_GRAPH.yaml" ] && [ -f "$INFRA_DIR/scripts/generate-networkpolicies.py" ]; then
    SHORT_NAME="${SERVICE_NAME#smartfunding-}"
    check "NetworkPolicy synchronisée avec CALL_GRAPH.yaml (cf. ADR-0003 infra)" \
      "python3 '$INFRA_DIR/scripts/generate-networkpolicies.py' --check --service '$SHORT_NAME' > /dev/null 2>&1"
  else
    check "NetworkPolicy n'est pas restreinte au Gateway seul (fallback, CALL_GRAPH.yaml absent)" \
      "! grep -A2 '^  ingress:' '$SERVICE_DIR/k3s/base/networkpolicy.yaml' 2>/dev/null | grep -q 'smartfunding-gateway'"
  fi
fi
check "aucun placeholder __XXX__ résiduel"   "! grep -rq '__SERVICE_NAME__\|__PORT__\|__COMPONENT__' '$SERVICE_DIR' 2>/dev/null"

echo ""
echo "-- Dépendance transverse : contracts (smartfunding-infra) --"
if [ -d "$INFRA_DIR" ]; then
  check "smartfunding-infra trouvé ($INFRA_DIR)"                 "true"
  if [ -f "$SERVICE_DIR/pubspec.yaml" ]; then
    check "contracts/dist buildé (source TS de référence valide, à mirorer en Dart — cf. docs/CONTRACTS_SYNC.md)" \
      "[ -f '$INFRA_DIR/contracts/dist/index.js' ] && [ -f '$INFRA_DIR/contracts/dist/index.d.ts' ]"
  else
    check "contracts/dist/index.js buildé"                          "[ -f '$INFRA_DIR/contracts/dist/index.js' ]"
    check "contracts/dist/index.d.ts buildé"                        "[ -f '$INFRA_DIR/contracts/dist/index.d.ts' ]"
  fi
  check "PARAMETERS.md présent (valeurs numériques tranchées)"    "[ -f '$INFRA_DIR/PARAMETERS.md' ]"
  check "BUILD_ORDER.md présent (dépendances/mocks)"              "[ -f '$INFRA_DIR/BUILD_ORDER.md' ]"
else
  check "smartfunding-infra trouvé (chemin : $INFRA_DIR)" "false"
  warn "Précisez le bon chemin en 2e argument si smartfunding-infra n'est pas au bon endroit"
fi

echo ""
echo "======================================"
echo -e "Résultat : ${GREEN}$PASS OK${NC} / ${RED}$FAIL manquant(s)${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}→ $SERVICE_NAME est PRÊT à être implémenté.${NC}"
  exit 0
else
  echo -e "${RED}→ $SERVICE_NAME N'EST PAS prêt. Corrige les points ✗ ci-dessus avant de commencer.${NC}"
  exit 1
fi
