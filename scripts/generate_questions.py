import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from openai import OpenAI

MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
GRADES = [x.strip() for x in os.getenv("GRADES", "3,pre2,2,pre1").split(",") if x.strip()]
SKILL = os.getenv("SKILL", "all").strip() or "all"
COUNT_PER_GRADE = int(os.getenv("COUNT_PER_GRADE", "10"))
OUTPUT_FILE = Path(os.getenv("OUTPUT_FILE", "questions_ai.json"))

PATTERNS = {
    "1": "SV（第1文型）",
    "2": "SVC（第2文型）",
    "3": "SVO（第3文型）",
    "4": "SVOO（第4文型）",
    "5": "SVOC（第5文型）",
}

SKILL_LABELS = {
    "all": "総合",
    "tense": "時制（現在・過去・未来・完了）",
    "modal": "助動詞",
    "prep": "前置詞",
    "conj": "接続詞",
    "comp": "比較",
    "qneg": "疑問文・否定文",
    "pron": "代名詞・数量",
    "verbprep": "動詞＋前置詞",
    "rel": "関係詞",
    "passive": "受動態",
    "subj": "仮定法",
    "inv": "倒置",
    "part": "分詞構文",
    "emph": "強調構文",
    "usage": "語法",
}

SYSTEM_PROMPT = """
あなたは英語学習ブラウザゲーム用の作問エンジンです。
ユーザーは日本語を見て、英単語を並べ替え、5文型を選びます。

必ず JSON だけを返してください。Markdown、説明文、コードフェンスは禁止です。

返すJSONの形式:
{
  "items": [
    {
      "id": "ai_短いID",
      "grade": "3 | pre2 | 2 | pre1",
      "pattern": "1 | 2 | 3 | 4 | 5",
      "focus": ["tense"],
      "promptJP": "日本語の問題文",
      "promptScene": "短い場面説明。例: （日常）現在形",
      "targets": ["正解英文。"],
      "bank": ["並び替え用", "単語", ".", "ダミー単語"],
      "hint1": "S=...\nV=...\nO(物)=...\nC=...\nM=...",
      "explanation": "日本語で短い解説"
    }
  ]
}

5文型:
1=SV
2=SVC
3=SVO
4=SVOO
5=SVOC

ルール:
- targets は自然で学習レベルに合う英文を1〜2個。
- bank には targets[0] を完成させる全単語を必ず含める。
- bank にはダミー単語を2〜5個入れる。
- 句読点 . ? ! , は独立トークンにする。
- bank の単語は重複が必要な場合だけ重複させる。
- promptJP と targets の意味を一致させる。
- pattern は targets[0] の主要文型で判定する。
- hint1 は S/V/O/C/M を必ず改行区切りで書く。
- id は同じ実行内で重複させない。
""".strip()


def strip_code_fence(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def tokenize(sentence: str) -> List[str]:
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[.,!?;:]", sentence)


def validate_item(item: Dict[str, Any], fallback_grade: str, skill: str, index: int) -> Dict[str, Any]:
    if not isinstance(item, dict):
        raise ValueError("item is not an object")

    item["id"] = str(item.get("id") or f"ai_{fallback_grade}_{skill}_{index:03d}")
    item["grade"] = str(item.get("grade") or fallback_grade)
    item["pattern"] = str(item.get("pattern") or "")
    if item["pattern"] not in PATTERNS:
        raise ValueError(f"invalid pattern: {item.get('pattern')}")

    if not isinstance(item.get("focus"), list):
        item["focus"] = [] if skill == "all" else [skill]

    for key in ["promptJP", "promptScene", "explanation"]:
        if not isinstance(item.get(key), str) or not item[key].strip():
            if key == "promptScene":
                item[key] = f"（AI生成）{SKILL_LABELS.get(skill, skill)}"
            elif key == "explanation":
                item[key] = "英文の語順と5文型を確認しましょう。"
            else:
                raise ValueError(f"{key} is required")

    targets = item.get("targets")
    if not isinstance(targets, list) or not targets or not isinstance(targets[0], str):
        raise ValueError("targets must be a non-empty list")
    item["targets"] = [x.strip() for x in targets if isinstance(x, str) and x.strip()]

    bank = item.get("bank")
    if not isinstance(bank, list):
        bank = []
    bank = [str(x).strip() for x in bank if str(x).strip()]

    # Append missing target tokens so the puzzle is always solvable.
    lower_bank = [x.lower() for x in bank]
    for tok in tokenize(item["targets"][0]):
        if tok.lower() not in lower_bank:
            bank.append(tok)
            lower_bank.append(tok.lower())
    item["bank"] = bank

    if not isinstance(item.get("hint1"), str) or not item["hint1"].strip():
        item["hint1"] = "S=—\nV=—\nO(物)=—\nC=—\nM=—"

    return item


def generate_batch(client: OpenAI, grade: str, skill: str, count: int) -> List[Dict[str, Any]]:
    user_payload = {
        "grade": grade,
        "skill": skill,
        "skill_label": SKILL_LABELS.get(skill, skill),
        "count": count,
        "instruction": "指定された級・分野に合う並び替え英作文問題を作成してください。"
    }

    response = client.responses.create(
        model=MODEL,
        instructions=SYSTEM_PROMPT,
        input=json.dumps(user_payload, ensure_ascii=False),
        temperature=0.5,
    )
    raw = strip_code_fence(response.output_text)
    data = json.loads(raw)
    items = data.get("items")
    if not isinstance(items, list):
        raise ValueError("response.items is not a list")
    return [validate_item(x, grade, skill, i + 1) for i, x in enumerate(items)]


def main() -> None:
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("OPENAI_API_KEY is not set. Add it to GitHub Actions Secrets.")

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    all_items: List[Dict[str, Any]] = []

    for grade in GRADES:
        print(f"Generating grade={grade}, skill={SKILL}, count={COUNT_PER_GRADE}")
        items = generate_batch(client, grade, SKILL, COUNT_PER_GRADE)
        all_items.extend(items)
        time.sleep(0.5)

    # De-duplicate IDs defensively.
    seen = set()
    for i, item in enumerate(all_items, start=1):
        base = item["id"]
        if base in seen:
            item["id"] = f"{base}_{i}"
        seen.add(item["id"])

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "model": MODEL,
        "skill": SKILL,
        "grades": GRADES,
        "patterns": [[k, v] for k, v in PATTERNS.items()],
        "items": all_items,
    }

    OUTPUT_FILE.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_FILE} with {len(all_items)} questions")


if __name__ == "__main__":
    main()
