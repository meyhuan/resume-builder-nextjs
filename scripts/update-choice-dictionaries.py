"""Build local suggestion snapshots from the documented CSV/PDF sources.

Usage: python scripts/update-choice-dictionaries.py --cities-csv <path> --majors-pdf <path>
Requires pypdf for the Education Ministry PDF. Does not download or execute source code.
"""
import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path


def save(name, rows):
    target = Path(__file__).resolve().parents[1] / "src/data/dictionaries" / name
    target.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def cities(source):
    rows = list(csv.DictReader(Path(source).read_text(encoding="utf-8-sig").splitlines()))
    by_id = {row["id"]: row for row in rows}
    # Prefectures and county-level cities; exclude districts/counties and synthetic padding.
    selected = [r for r in rows if (r["deep"] == "1" or (r["deep"] == "2" and r["ext_name"].endswith("市"))
                or (r["deep"] == "0" and r["name"] == "重庆"))
                and r["name"] not in ("省直辖", "自治区直辖", "重庆城区", "重庆郊县")]
    result, seen = [], set()
    for row in selected:
        parent = by_id.get(row["pid"])
        if parent and row["name"] == parent["name"] and row["deep"] == "2":
            continue
        province = parent
        while province and province["deep"] != "0":
            province = by_id.get(province["pid"])
        if province and province["name"] == "国外":
            continue
        if row["name"] in seen:
            continue
        seen.add(row["name"])
        context = province["name"] if province else ""
        if row["deep"] == "2" and parent and parent["name"] not in (context, "省直辖", "自治区直辖"):
            context += " · " + parent["name"]
        if context == row["name"]:
            context = ""
        syllables = row["pinyin"].split()
        result.append([row["name"], context, "".join(syllables), "".join(s[0] for s in syllables), row["ext_name"]])
    assert len(result) > 650, "Unexpected city coverage"
    assert all(r[0] == r[0].strip() and " " not in r[0] for r in result)
    save("city-suggestions.json", result)
    return len(result)


def majors(source):
    from pypdf import PdfReader
    result, category = [], ""
    for page in PdfReader(source).pages:
        for line in page.extract_text(extraction_mode="layout").splitlines():
            discipline = re.match(r"^\s*\d{2}\s+学科门类[：:]\s*(.+?)\s*$", line)
            if discipline:
                category = discipline[1]
            group = re.match(r"^\s*(\d{4})\s+([^\s]+类)\s*$", line)
            if group:
                category = group[2]
            match = re.match(r"^\s*(\d{6,7}[TK]*)\s+(.+?)\s*$", line)
            if not match:
                continue
            name = re.split(r"[（(]注[：:]", match[2])[0].strip()
            result.append([match[1], name, category])
    assert len(result) == 883, f"Expected 883 majors, found {len(result)}"
    assert len({r[0] for r in result}) == 883
    duplicates = [name for name, count in Counter(r[1] for r in result).items() if count > 1]
    assert not duplicates, f"Duplicate major names: {duplicates}"
    assert all(r[2] for r in result), "Missing major category"
    save("major-suggestions.json", result)
    return len(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cities-csv", required=True)
    parser.add_argument("--majors-pdf", required=True)
    args = parser.parse_args()
    print(json.dumps({"cities": cities(args.cities_csv), "majors": majors(args.majors_pdf)}))
