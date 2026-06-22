function normalize(s){
  return String(s || "")
    .toLowerCase()
    .replace(/\s+([.,?!])/g, "$1")
    .replace(/[.,?!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreAnswer(input, model, level){
  let score = 0;
  let comments = [];

  const inTok = normalize(input).split(" ").filter(Boolean);
  const coTok = normalize(model).split(" ").filter(Boolean);

  const sentenceCount = input
    .split(".")
    .filter(s => s.trim()).length;

  // 4級は1文でOK、3級以上は2文必要
  if(level === "4"){
    if(sentenceCount >= 1){
      score += 20;
    }else{
      comments.push("1文作ろう");
    }
  }else{
    if(sentenceCount >= 2){
      score += 20;
    }else{
      comments.push("2文必要");
    }
  }

  // 内容点
  const match = coTok.filter(w => inTok.includes(w)).length;
  score += coTok.length
    ? Math.floor((match / coTok.length) * 40)
    : 0;

  // 語順
  if(normalize(input) === normalize(model)){
    score += 20;
  }else{
    comments.push("語順改善");
  }

  // 文の始め方
  if(
    input.includes("I") ||
    input.includes("One") ||
    input.includes("To") ||
    input.includes("First")
  ){
    score += 10;
  }else{
    comments.push("文の始め方を確認しよう");
  }

  // ピリオド
  if(/[.]/.test(input)){
    score += 10;
  }else{
    comments.push("ピリオド必要");
  }

  return {
    score,
    comments
  };
}
