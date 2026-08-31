#!/bin/bash
# check-local-tools.sh — Vérifie que les outils nécessaires sont installés SUR LA MACHINE
# de développement, avant de commencer à implémenter un service.
# Complète check-readiness.sh (qui vérifie le contenu d'un dépôt, pas l'environnement local).
#
# Usage : ./check-local-tools.sh [node|python|flutter|infra|all]
# Sans argument : "all"

set -uo pipefail
PROFILE="${1:-all}"
PASS=0; FAIL=0; MISSING_OPTIONAL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'

check() {
  local name="$1" cmd="$2" hint="$3" required="${4:-required}"
  if command -v "$cmd" >/dev/null 2>&1; then
    local version
    version=$("$cmd" --version 2>&1 | head -1)
    echo -e "  ${GREEN}✓${NC} $name : $version"
    PASS=$((PASS+1))
  else
    if [ "$required" = "required" ]; then
      echo -e "  ${RED}✗${NC} $name — MANQUANT. Installation : $hint"
      FAIL=$((FAIL+1))
    else
      echo -e "  ${YELLOW}!${NC} $name — absent (optionnel). Installation : $hint"
      MISSING_OPTIONAL=$((MISSING_OPTIONAL+1))
    fi
  fi
}

echo "=== Vérification des outils locaux — profil : $PROFILE ==="
echo ""

echo "-- Socle commun (tous les services) --"
check "Git"      git    "https://git-scm.com/downloads"
check "Docker"   docker "https://docs.docker.com/get-docker/"
check "kubectl"  kubectl "https://kubernetes.io/docs/tasks/tools/"
check "k3s (via k3s ou k3s kubectl)" k3s "curl -sfL https://get.k3s.io | sh -  (ou vérifier sudo k3s --version si installé en root)" optional
check "gitleaks" gitleaks "https://github.com/gitleaks/gitleaks/releases (secrets scanning, requis avant tout commit)"

if [ "$PROFILE" = "node" ] || [ "$PROFILE" = "all" ]; then
  echo ""
  echo "-- Stack Node.js / NestJS / Next.js (auth, projects, documents, funders, workflow,"
  echo "   notifications, billing, gateway, onboarding, web) --"
  check "Node.js (v20 LTS attendu)" node "https://nodejs.org (nvm install 20 recommandé)"
  check "pnpm" pnpm "npm install -g pnpm"
  check "Semgrep (SAST)" semgrep "pip install --break-system-packages semgrep"
  check "Trivy (scan image/dépendances)" trivy "https://trivy.dev/latest/getting-started/installation/"
  check "Syft (SBOM)" syft "https://github.com/anchore/syft#installation"
  check "Cosign (signature d'image)" cosign "https://docs.sigstore.dev/cosign/system_config/installation/"
fi

if [ "$PROFILE" = "python" ] || [ "$PROFILE" = "all" ]; then
  echo ""
  echo "-- Stack Python / FastAPI (ai) --"
  check "Python 3.11+" python3 "https://www.python.org/downloads/"
  check "pip" pip3 "fourni avec Python 3"
  check "pre-commit (hooks Python)" pre-commit "pip install --break-system-packages pre-commit"
  check "bandit (SAST Python)" bandit "pip install --break-system-packages bandit"
fi

if [ "$PROFILE" = "flutter" ] || [ "$PROFILE" = "all" ]; then
  echo ""
  echo "-- Stack Flutter / Dart (mobile) --"
  check "Flutter SDK" flutter "https://docs.flutter.dev/get-started/install"
  check "Dart" dart "fourni avec Flutter SDK"
  check "OSV-Scanner (SCA Dart/pub)" osv-scanner "https://google.github.io/osv-scanner/installation/"
fi

if [ "$PROFILE" = "infra" ] || [ "$PROFILE" = "all" ]; then
  echo ""
  echo "-- Infrastructure (smartfunding-infra) --"
  check "Terraform" terraform "https://developer.hashicorp.com/terraform/install"
  check "kustomize" kustomize "https://kubectl.docs.kubernetes.io/installation/kustomize/"
  check "Helm" helm "https://helm.sh/docs/intro/install/" optional
fi

echo ""
echo "======================================"
echo -e "Résultat : ${GREEN}$PASS installé(s)${NC} / ${RED}$FAIL manquant(s) requis${NC} / ${YELLOW}$MISSING_OPTIONAL optionnel(s) absent(s)${NC}"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}→ Environnement local prêt pour le profil '$PROFILE'.${NC}"
  exit 0
else
  echo -e "${RED}→ Installe les outils ✗ ci-dessus avant de commencer à coder.${NC}"
  exit 1
fi
