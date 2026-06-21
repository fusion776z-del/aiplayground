function normalize(s){
  return String(s || "")
    .toLowerCase()
    .replace(/[.,?!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreAnswer(input, model){
  let score = 0;
  let comments = [];

  const inTok = normalize(input).split(" ").filter(Boolean);
  const coTok = normalize(model).split(" ").filter(Boolean);

  if(input.split(".").filter(s => s.trim()).length >= 2){
    score += 20;
  }else{
    comments.push("2文必要");
  }

  const match = coTok.filter(w => inTok.includes(w)).length;
  score += coTok.length ? Math.floor((match / coTok.length) * 40) : 0;

  if(normalize(input) === normalize(model)){
    score += 20;
  }else{
    comments.push("語順改善");
  }

  if(input.includes("I") || input.includes("One") || input.includes("To")){
    score += 10;
  }else{
    comments.push("文の始め方を確認しよう");
  }

  if(input.includes(".")){
    score += 10;
  }else{
    comments.push("ピリオド必要");
  }

  return {
    score,
    comments
  };
}