import argparse
import json
import re
from collections import defaultdict
from pathlib import Path
from urllib.request import Request, urlopen


MIRROR = "https://raw.githubusercontent.com/Vexadros/DiscordClasses/main"
CLASS_NAME = r"-?[A-Za-z_][\w-]*?_[\w-]{6}"
CLASS_PATTERN = re.compile(r"\.(" + CLASS_NAME + r")(?![\w-])", re.ASCII)
TOKEN_PATTERN = re.compile(
    r'/\*[\s\S]*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'|'
    r"\.(?P<name>" + CLASS_NAME + r")(?![\w-])",
    re.ASCII,
)


def load_classes(source):
    if source.startswith(("https://", "http://")):
        request = Request(source, headers={"User-Agent": "midnight-cloud-class-updater"})
        with urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8-sig"))
    return json.loads(Path(source).read_text(encoding="utf-8-sig"))


def module_classes(data):
    modules = {}
    for module_id, module in data.items():
        if not isinstance(module, dict):
            continue
        if isinstance(module.get("class_names"), list):
            values = [entry.get("value", "") for entry in module["class_names"]]
        else:
            values = module.values()
        modules[module_id] = {
            token
            for value in values if isinstance(value, str)
            for token in value.split()
            if re.fullmatch(CLASS_NAME, token, re.ASCII)
        }
    return modules


def readable_name(name):
    return re.sub(r"_[\w-]{6}$", "", name, flags=re.ASCII)


def migrate(css, current, previous=None):
    live_modules = module_classes(current)
    live = set().union(*live_modules.values())
    if not live:
        raise ValueError("La fuente no contiene clases de Discord reconocibles.")
    by_name = defaultdict(set)
    for name in live:
        by_name[readable_name(name)].add(name)

    module_candidates = defaultdict(list)
    if previous is not None:
        for module_id, old_names in module_classes(previous).items():
            if module_id not in live_modules:
                continue
            for old in old_names:
                candidates = {
                    new for new in live_modules[module_id]
                    if readable_name(new) == readable_name(old)
                }
                module_candidates[old].append(candidates)

    uses = defaultdict(set)
    matches = list(TOKEN_PATTERN.finditer(css))
    for match in matches:
        if match.group("name"):
            uses[match.group("name")].add(css.count("\n", 0, match.start()) + 1)

    replacements = {}
    pending = []
    for old in sorted(uses):
        if old in live:
            continue
        evidence = module_candidates.get(old)
        candidates = set.intersection(*evidence) if evidence else by_name[readable_name(old)]
        if len(candidates) == 1:
            replacements[old] = next(iter(candidates))
        else:
            pending.append({
                "class": old,
                "lines": sorted(uses[old]),
                "reason": "ambiguous" if candidates else "not_found",
                "candidates": sorted(candidates),
            })

    def replace(match):
        name = match.group("name")
        return "." + replacements[name] if name in replacements else match.group(0)

    return TOKEN_PATTERN.sub(replace, css), {
        "checked": len(uses),
        "already_current": len(set(uses) & live),
        "replaced": replacements,
        "pending": pending,
    }


def main():
    root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=root / "build/midnight-cloud.css")
    parser.add_argument("--output", type=Path, default=root / ".theme-dev/class-migration/output.css")
    parser.add_argument("--source", help="URL o JSON de las clases del cliente actual")
    parser.add_argument("--previous", help="URL o JSON anterior, para relacionar modulos")
    parser.add_argument("--canary", action="store_true", help="Consultar Canary en lugar de Stable")
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        parser.error("Usa un archivo de salida distinto al original.")
    source = args.source or f"{MIRROR}/{'canary' if args.canary else 'stable'}classes.json"
    try:
        current = load_classes(source)
        previous = load_classes(args.previous) if args.previous else None
        css = args.input.read_text(encoding="utf-8-sig")
        output, report = migrate(css, current, previous)
        report.update(source=source, previous=args.previous)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
        report_path = args.output.with_suffix(".report.json")
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    except (OSError, ValueError) as error:
        parser.exit(2, f"Error: {error}\n")
    print(f"Clases: {report['checked']}; vigentes: {report['already_current']}; "
          f"reemplazadas: {len(report['replaced'])}; pendientes: {len(report['pending'])}")
    print(f"CSS: {args.output}\nInforme: {report_path}")
    return 1 if report["pending"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
