(() => {
  const API_BASE = window.AI_API_BASE || "http://localhost:5000";

  const $ = (id) => document.getElementById(id);

  const patterns = [
    ["1", "SV（第1文型）"],
    ["2", "SVC（第2文型）"],
    ["3", "SVO（第3文型）"],
    ["4", "SVOO（第4文型）"],
    ["5", "SVOC（第5文型）"],
  ];

  let currentItem = null;
  let slots = [];
  let bank = [];
  let score = 0;
  let qIndex = 0;

  function normalizeSentence(tokensOrText) {
    const text = Array.isArray(tokensOrText) ? tokensOrText.join(" ") : String(tokensOrText || "");
    return text
      .replace(/\s+([.,!?;:])/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function displaySentence(tokens) {
    return tokens.join(" ").replace(/\s+([.,!?;:])/g, "$1");
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function setStatus(msg, sub = "") {
    $("statusMsg").textContent = msg;
    $("statusSub").textContent = sub;
  }

  function setLoading(isLoading) {
    $("btnAI").disabled = isLoading;
    $("btnAI").textContent = isLoading ? "生成中..." : "AI問題生成";
  }

  function initPatternSelect() {
    const sel = $("patternSel");
    sel.innerHTML = '<option value="">選択…</option>';
    patterns.forEach(([value, label]) => {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      sel.appendChild(opt);
    });
  }

  function renderTokens() {
    const slotsEl = $("slots");
    const bankEl = $("bank");
    slotsEl.innerHTML = "";
    bankEl.innerHTML = "";

    slots.forEach((tok, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tok";
      b.textContent = tok;
      b.addEventListener("click", () => {
        bank.push(tok);
        slots.splice(idx, 1);
        renderTokens();
      });
      slotsEl.appendChild(b);
    });

    bank.forEach((tok, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tok";
      b.textContent = tok;
      b.addEventListener("click", () => {
        slots.push(tok);
        bank.splice(idx, 1);
        renderTokens();
      });
      bankEl.appendChild(b);
    });
  }

  function renderItem(item) {
    currentItem = item;
    slots = [];
    bank = shuffle(item.bank || []);
    qIndex += 1;

    $("jpPrompt").textContent = item.promptJP || "（問題文なし）";
    $("scenePrompt").textContent = item.promptScene || "（AI生成）";
    $("qIndex").textContent = String(qIndex);
    $("targetPreview").textContent = "";
    $("explain").classList.remove("show");
    $("patternSel").value = "";
    renderTokens();
    setStatus("英文＋5文型を答えよう。", "AI生成問題です。CHECKで判定します。APIキーはブラウザ側には置いていません。");
  }

  async function generateQuestion() {
    setLoading(true);
    try {
      const grade = $("gradeSel").value;
      const skill = $("skillSel").value;
      const japanese = $("jpInput").value.trim();

      const res = await fetch(`${API_BASE}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade, skill, japanese }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.detail || data.error || "API error");
      }
      renderItem(data);
    } catch (err) {
      setStatus("AI問題の生成に失敗しました。", String(err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function checkAnswer() {
    if (!currentItem) {
      setStatus("先にAI問題生成を押してください。", "");
      return;
    }

    const userSentence = normalizeSentence(slots);
    const correctSentences = (currentItem.targets || []).map(normalizeSentence);
    const sentenceOK = correctSentences.includes(userSentence);
    const patternOK = $("patternSel").value === String(currentItem.pattern);

    if (sentenceOK && patternOK) {
      score += 1;
      $("score").textContent = String(score);
      setStatus("正解！", `英文: ${displaySentence(slots)} / 文型: ${currentItem.pattern}`);
      showExplanation(true);
    } else {
      const correct = (currentItem.targets || [])[0] || "—";
      const p = currentItem.pattern || "—";
      setStatus(
        "まだ違うところがあります。",
        `英文OK: ${sentenceOK ? "OK" : "NG"} / 文型OK: ${patternOK ? "OK" : "NG"}\n正解例: ${correct}\n文型: ${p}`
      );
      showExplanation(false);
    }
  }

  function showHint() {
    if (!currentItem) {
      setStatus("先にAI問題生成を押してください。", "");
      return;
    }
    const hint = currentItem.hint1 || "ヒントなし";
    setStatus("HINT", hint);
  }

  function showExplanation(isCorrect) {
    if (!currentItem) return;
    $("expTitle").textContent = isCorrect ? "解説" : "確認ポイント";
    $("expDiff").textContent = currentItem.hint1 || "—";
    $("expBody").textContent = currentItem.explanation || "—";
    $("targetPreview").textContent = (currentItem.targets || [])[0] || "";
    $("explain").classList.add("show");
  }

  function clearAnswer() {
    if (!currentItem) return;
    bank = bank.concat(slots);
    slots = [];
    renderTokens();
    setStatus("クリアしました。", "もう一度並べ替えてください。");
  }

  document.addEventListener("DOMContentLoaded", () => {
    initPatternSelect();
    $("btnAI").addEventListener("click", generateQuestion);
    $("btnCheck").addEventListener("click", checkAnswer);
    $("btnHint").addEventListener("click", showHint);
    $("btnClear").addEventListener("click", clearAnswer);
    $("btnNext").addEventListener("click", generateQuestion);
  });
})();
