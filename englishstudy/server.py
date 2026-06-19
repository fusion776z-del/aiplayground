import json
import os
import re
from typing import Any, Dict, List

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI

load_dotenv()

app = Flask(__name__)

# For local development you can leave CORS_ORIGINS blank or "*".
# For deployment, set it to your frontend URL, e.g. https://yourname.github.io
cors_origins = os.getenv("CORS_ORIGINS", "*")
if cors_origins.strip() == "*":
    CORS(app)
else:
    CORS(app, origins=[x.strip() for x in cors_origins.split(",") if x.strip()])

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

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
""".strip()


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _tokenize(sentence: str) -> List[str]:
    # Keeps punctuation as separate tokens. Good enough for the sentence-builder game.
    return re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+|[.,!?;:]", sentence)


def _validate_item(item: Dict[str, Any], grade: str, skill: str) -> Dict[str, Any]:
    if not isinstance(item, dict):
        raise ValueError("AI response is not an object")

    item.setdefault("id", "ai_generated")
    item.setdefault("grade", grade)
    item.setdefault("focus", [] if skill == "all" else [skill])
    item.setdefault("promptScene", f"（AI生成）{SKILL_LABELS.get(skill, skill)}")
    item.setdefault("explanation", "AIが生成した問題です。英文と5文型を確認しましょう。")

    if str(item.get("pattern")) not in PATTERNS:
        raise ValueError("pattern must be one of 1,2,3,4,5")
    item["pattern"] = str(item["pattern"])

    if not item.get("promptJP") or not isinstance(item.get("promptJP"), str):
        raise ValueError("promptJP is required")

    targets = item.get("targets")
    if not isinstance(targets, list) or not targets or not isinstance(targets[0], str):
        raise ValueError("targets must be a non-empty string list")
    item["targets"] = [t.strip() for t in targets if isinstance(t, str) and t.strip()]

    bank = item.get("bank")
    if not isinstance(bank, list) or not bank:
        bank = _tokenize(item["targets"][0])
    item["bank"] = [str(x).strip() for x in bank if str(x).strip()]

    # Ensure every token from the first target is present at least once in bank.
    # This is conservative; it appends missing tokens instead of failing.
    target_tokens = _tokenize(item["targets"][0])
    bank_lower = [b.lower() for b in item["bank"]]
    for tok in target_tokens:
        if tok.lower() not in bank_lower:
            item["bank"].append(tok)
            bank_lower.append(tok.lower())

    if not item.get("hint1"):
        item["hint1"] = "S=—\nV=—\nO(物)=—\nC=—\nM=—"

    return item


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "model": MODEL})


@app.post("/api/generate")
def generate_question():
    if not os.getenv("OPENAI_API_KEY"):
        return jsonify({
            "error": "OPENAI_API_KEY is not set. Create .env from .env.example or set the environment variable."
        }), 500

    body = request.get_json(silent=True) or {}
    grade = str(body.get("grade", "3"))
    skill = str(body.get("skill", "all"))
    custom_japanese = str(body.get("japanese", "")).strip()

    user_prompt = {
        "grade": grade,
        "skill": skill,
        "skill_label": SKILL_LABELS.get(skill, skill),
        "custom_japanese": custom_japanese,
        "instruction": "custom_japanese が空でなければ、その日本語文を問題文として使う。空なら新しい問題を1問作る。"
    }

    try:
        response = client.responses.create(
            model=MODEL,
            instructions=SYSTEM_PROMPT,
            input=json.dumps(user_prompt, ensure_ascii=False),
            temperature=0.4,
        )
        raw_text = _strip_code_fence(response.output_text)
        item = json.loads(raw_text)
        item = _validate_item(item, grade, skill)
        return jsonify(item)
    except Exception as e:
        return jsonify({
            "error": "Failed to generate a valid question.",
            "detail": str(e),
        }), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
