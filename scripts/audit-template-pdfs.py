"""Inspect QA PDFs; current-code evidence requires a validated stable release run."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from pypdf import PdfReader

parser = argparse.ArgumentParser()
parser.add_argument("--poppler", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--render", action="store_true")
args = parser.parse_args()
specification = json.load(sys.stdin)
output = Path(args.output).resolve()
output.mkdir(parents=True, exist_ok=True)
results = []
for item in specification["files"]:
    pdf = Path(item["path"]).resolve()
    record = {**item, "exists": pdf.exists(), "status": "missing", "pages": []}
    if pdf.exists():
        try:
            reader = PdfReader(pdf)
            texts = [page.extract_text() or "" for page in reader.pages]
            normalized = "".join("".join(texts).split())
            expected = (["陈一", "chenyi@example.com", "浙江大学"] if item["fixture"] == "sparse" else
                        ["欧阳承远", "ouyangchengyuan.long.email.address@example-company-domain.com",
                         "上海云启智能科技有限公司", "杭州数桥网络有限公司", "企业智能问答平台", "复旦大学",
                         "学生创新实践中心", "Figma", "自定义模块"] +
                        [f"一家名称非常非常长的科技创新与数字化转型咨询有限公司第{i}事业部" for i in range(1, 5)])
            record["missingText"] = [value for value in expected if "".join(value.split()) not in normalized]
            record["sha256"] = hashlib.sha256(pdf.read_bytes()).hexdigest()
            record["mtime"] = pdf.stat().st_mtime
            record["pages"] = [{"page": i + 1, "textChars": len("".join(text.split()))} for i, text in enumerate(texts)]
            record["blankTextPages"] = [page["page"] for page in record["pages"] if not page["textChars"]]
            record["status"] = "fail" if record["missingText"] or record["blankTextPages"] or not texts else "pass"
            record["currentCodeProven"] = bool(item.get("releaseEvidence"))
            record["sourceFreshness"] = "stale" if pdf.stat().st_mtime < specification["latestTemplateChange"] else "unproven"
            if args.render:
                destination = output / item["id"] / f'{item["fixture"]}-{item["theme"]}'
                destination.mkdir(parents=True, exist_ok=True)
                completed = subprocess.run([args.poppler, "-r", "96", "-png", str(pdf), str(destination / "page")], capture_output=True, text=True)
                if completed.returncode:
                    raise RuntimeError(completed.stderr[:2000] or "Poppler rendering failed")
                rendered = [destination / f"page-{i + 1}.png" for i in range(len(reader.pages))]
                if not all(page.exists() for page in rendered):
                    raise RuntimeError("Poppler did not render every PDF page")
                # Do not treat leftover PNGs from an older PDF as current pages.
                record["rendered"] = [str(page) for page in rendered]
        except Exception as error:
            record["status"] = "error"
            record["error"] = str(error)
    results.append(record)
summary = {"purpose": "PDF content/render checks; current-code correlation requires validated release evidence and does not replace visual approval.",
           "latestTemplateChange": specification["latestTemplateChange"],
           "counts": {state: sum(item["status"] == state for item in results) for state in ["pass", "fail", "missing", "error"]},
           "results": results}
(output / "results.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"counts": summary["counts"], "report": str(output / "results.json"),
                  "failures": [{"id": item["id"], "fixture": item["fixture"], "theme": item["theme"],
                                "missing": item.get("missingText"), "error": item.get("error")} for item in results if item["status"] != "pass"]}, ensure_ascii=False, indent=2))
sys.exit(0 if all(item["status"] == "pass" for item in results) else 1)
