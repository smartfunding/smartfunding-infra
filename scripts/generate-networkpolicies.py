#!/usr/bin/env python3
"""
generate-networkpolicies.py — Régénère UNIQUEMENT le champ spec.ingress du document
"allow-internal" de chaque k3s/base/networkpolicy.yaml, à partir de CALL_GRAPH.yaml
(source unique de vérité, cf. docs/adr/0003-networkpolicy-service-a-service.md).

Le document "default-deny" et le champ spec.egress (bases de données, APIs externes,
DNS) de chaque service sont préservés tels quels — ce script ne les touche jamais,
ils restent gérés manuellement par service.

Usage :
  python3 generate-networkpolicies.py                    # régénère tous les fichiers
  python3 generate-networkpolicies.py --check             # vérifie tous les services (CI), exit 1 si dérive
  python3 generate-networkpolicies.py --check --service auth  # vérifie UN SEUL service (usage : check-readiness.sh)
"""
import sys
import yaml
from pathlib import Path
from copy import deepcopy

INFRA_ROOT = Path(__file__).resolve().parent.parent
CALL_GRAPH_FILE = INFRA_ROOT / "CALL_GRAPH.yaml"
REPOS_ROOT = INFRA_ROOT.parent

PORTS = {
    "auth": 3001, "projects": 3002, "documents": 3003, "funders": 3004,
    "ai": 3005, "workflow": 3006, "notifications": 3007, "billing": 3008,
    "gateway": 4000, "web": 3000, "onboarding": 3009,
}

INGRESS_COMMENT = (
    "GÉNÉRÉ AUTOMATIQUEMENT depuis smartfunding-infra/CALL_GRAPH.yaml — ne pas éditer ce "
    "bloc à la main, régénérer avec scripts/generate-networkpolicies.py"
)


def build_ingress_rules(service: str, callers: list) -> list:
    port = PORTS[service]
    if not callers:
        return []  # aucun appelant interne (gateway/web : exposition externe uniquement)
    return [
        {"from": [{"podSelector": {"matchLabels": {"app.kubernetes.io/name": f"smartfunding-{c}"}}}],
         "ports": [{"port": port}]}
        for c in callers
    ]


def process_service(service: str, callers: list, check_only: bool) -> tuple:
    """Retourne (status, message) où status in {'ok','changed','missing','drift'}."""
    target_file = REPOS_ROOT / f"smartfunding-{service}" / "k3s" / "base" / "networkpolicy.yaml"
    if not target_file.exists():
        return "missing", f"smartfunding-{service} : networkpolicy.yaml introuvable"

    docs = list(yaml.safe_load_all(target_file.read_text()))
    if len(docs) != 2:
        return "missing", f"smartfunding-{service} : structure inattendue ({len(docs)} document(s), 2 attendus)"

    default_deny, allow_internal = docs
    new_ingress = build_ingress_rules(service, callers)
    old_ingress = allow_internal.get("spec", {}).get("ingress", [])

    if old_ingress == new_ingress:
        return "ok", f"smartfunding-{service} : déjà synchronisé ({len(callers)} appelant(s))"

    if check_only:
        return "drift", f"smartfunding-{service} : DÉRIVE — ingress actuel ne correspond pas à CALL_GRAPH.yaml"

    new_allow_internal = deepcopy(allow_internal)
    new_allow_internal["spec"]["ingress"] = new_ingress

    header = f"# {INGRESS_COMMENT}\n"
    content = (
        yaml.dump(default_deny, sort_keys=False, default_flow_style=False)
        + "---\n"
        + header
        + yaml.dump(new_allow_internal, sort_keys=False, default_flow_style=False)
    )
    target_file.write_text(content)
    return "changed", f"smartfunding-{service} : régénéré ({len(callers)} appelant(s) autorisé(s) : {', '.join(callers) if callers else 'aucun'})"


def main():
    check_only = "--check" in sys.argv
    service_filter = None
    if "--service" in sys.argv:
        service_filter = sys.argv[sys.argv.index("--service") + 1]

    graph = yaml.safe_load(CALL_GRAPH_FILE.read_text())["services"]
    if service_filter:
        if service_filter not in graph:
            print(f"❌ '{service_filter}' absent de CALL_GRAPH.yaml")
            sys.exit(1)
        graph = {service_filter: graph[service_filter]}

    results = {"ok": [], "changed": [], "missing": [], "drift": []}
    for service, cfg in graph.items():
        status, message = process_service(service, cfg.get("allowed_callers", []), check_only)
        results[status].append(message)
        symbol = {"ok": "✓", "changed": "✓", "missing": "!", "drift": "✗"}[status]
        print(f"  {symbol} {message}")

    print()
    if results["drift"] or results["missing"]:
        print(f"❌ {len(results['drift'])} dérive(s), {len(results['missing'])} manquant(s)")
        sys.exit(1)
    print(f"✅ {len(results['ok']) + len(results['changed'])}/{len(graph)} service(s) synchronisé(s) avec CALL_GRAPH.yaml")


if __name__ == "__main__":
    main()
