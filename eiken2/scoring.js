function normalize(s){
  return String(s || "")
    .toLowerCase()
    .replace(/\s+([.,?!])/g, "$1")
    .replace(/[.,?!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeForFeedback(s){
  return normalize(s)
    .split(" ")
    .filter(Boolean);
}

/*
  単語の意味グループ。
  完全な同義語ではなく、「近い意味」として部分点に使う。
*/
const WORD_GROUPS = {
  useful: ["useful", "helpful", "convenient"],
  important: ["important", "necessary"],
  good: ["good", "nice"],
  fun: ["fun", "interesting", "exciting", "relaxing"],
  problem: ["problem", "risk", "challenge", "danger"],
  study: ["study", "studying", "studies", "learning"],
  students: ["students", "student"],
  health: ["health", "healthy"]
};

function getWordGroup(word){
  for(const key in WORD_GROUPS){
    if(WORD_GROUPS[key].includes(word)){
      return key;
    }
  }
  return null;
}

/*
  完全一致なら1点。
  近い意味なら0.6点。
  それ以外は0点。
*/
function wordSimilarity(inputWord, modelWord){
  if(inputWord === modelWord) return 1;

  const inputGroup = getWordGroup(inputWord);
  const modelGroup = getWordGroup(modelWord);

  if(inputGroup && modelGroup && inputGroup === modelGroup){
    return 0.8;
  }

  /*
    good は広い意味なので、useful / important に対して
    完全正解ではないが部分点にする。
  */
  if(inputWord === "good" && (modelWord === "useful" || modelWord === "important")){
    return 0.6;
  }

  if(modelWord === "good" && (inputWord === "useful" || inputWord === "important")){
    return 0.8;
  }

  return 0;
}

function scoreAnswer(input, model){
  let score = 0;
  let comments = [];

  const inputWords = tokenizeForFeedback(input);
  const modelWords = tokenizeForFeedback(model);

  if(input.split(".").filter(s => s.trim()).length >= 2){
    score += 20;
  }else{
    comments.push("2文必要");
  }

  /*
    内容点：完全一致だけでなく、意味が近い単語も部分点。
  */
  let contentPoints = 0;

  modelWords.forEach(modelWord => {
    let best = 0;

    inputWords.forEach(inputWord => {
      best = Math.max(best, wordSimilarity(inputWord, modelWord));
    });

    contentPoints += best;
  });

  score += modelWords.length
    ? Math.floor((contentPoints / modelWords.length) * 40)
    : 0;

  if(normalize(input) === normalize(model)){
    score += 20;
  }else{
    comments.push("語順または語句の選び方を確認しよう");
  }

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

  if(/[.]/.test(input)){
    score += 10;
  }else{
    comments.push("ピリオド必要");
  }

  const wordFeedback = explainWordChoices(input, model);

  return {
    score,
    comments,
    wordFeedback
  };
}

/*
  なぜ減点されたかを説明する。
  「模範解答だから」ではなく、
  意味・文脈・具体性の違いを説明する。
*/
function explainWordChoices(input, model){
  const inputWords = tokenizeForFeedback(input);
  const modelWords = tokenizeForFeedback(model);

  const feedback = [];

  modelWords.forEach(modelWord => {
    const exact = inputWords.includes(modelWord);

    if(exact) return;

    let closest = null;
    let bestScore = 0;

    inputWords.forEach(inputWord => {
      const sim = wordSimilarity(inputWord, modelWord);
      if(sim > bestScore){
        bestScore = sim;
        closest = inputWord;
      }
    });

    if(bestScore >= 0.6){
      feedback.push(makeMeaningFeedback(closest, modelWord));
    }else{
      feedback.push(makeMissingFeedback(modelWord));
    }
  });

  /*
    余分な単語も軽く説明する。
  */
  inputWords.forEach(inputWord => {
    const exact = modelWords.includes(inputWord);
    if(exact) return;

    const hasCloseModel = modelWords.some(modelWord => {
      return wordSimilarity(inputWord, modelWord) >= 0.6;
    });

    if(!hasCloseModel){
      feedback.push(makeExtraFeedback(inputWord));
    }
  });

  return [...new Set(feedback)];
}

function makeMeaningFeedback(inputWord, modelWord){

  if(inputWord === "good" && modelWord === "useful"){
    return "good は「良い」という広い意味です。この問題では「役に立つか」を答える流れなので、useful の方が具体的です。good でも大きな間違いではありませんが、少し弱い表現です。";
  }

  if(inputWord === "good" && modelWord === "important"){
    return "good は広い意味ですが、important は「大切だ」という意味です。理由として強く伝えたいときは important の方がはっきりします。";
  }

  if(inputWord === "useful" && modelWord === "good"){
    return "useful は「役に立つ」という具体的な意味です。good より具体的なので、この文脈では十分自然です。";
  }

  if(inputWord === "important" && modelWord === "good"){
    return "important は「大切な」という意味で、good より強い表現です。この文脈では自然です。";
  }

  if(inputWord === "helpful" && modelWord === "useful"){
    return "helpful と useful はどちらも「役に立つ」という意味に近いので、ほぼ同じ考えを表せています。";
  }

  if(inputWord === "necessary" && modelWord === "important"){
    return "necessary は「必要な」、important は「大切な」という意味です。近い意味ですが、necessary の方が少し強い表現です。";
  }

  if(inputWord === "study" && modelWord === "studying"){
    return "study は名詞・動詞として使えますが、for の後では studying の形が自然です。";
  }

  if(inputWord === "student" && modelWord === "students"){
    return "student は単数、students は複数です。一般的な話をするときは students の複数形が自然です。";
  }

  return `${inputWord} は ${modelWord} と意味が近いですが、この文では ${modelWord} の方が文脈に合いやすいです。`;
}

function makeMissingFeedback(word){

  const explanations = {
    useful: "useful が不足しています。これは「役に立つ」という意味で、質問が usefulness や便利さを聞いているときに合います。",
    important: "important が不足しています。これは「大切な」という意味で、理由を強く伝えるときに使います。",
    convenient: "convenient が不足しています。これは「便利な」という意味で、スマホやインターネットなどの話題に合います。",
    students: "students が不足しています。この問題は生徒について聞いているので、people より students の方が具体的です。",
    studying: "studying が不足しています。for の後や「勉強すること」という意味では studying が自然です。",
    health: "health が不足しています。健康に関する理由を述べるときに必要です。",
    communication: "communication が不足しています。スマホやインターネットの影響を説明するときによく使います。"
  };

  return explanations[word] || `${word} が不足しています。この単語は質問に答えるために必要な内容を表しています。`;
}

function makeExtraFeedback(word){

  const explanations = {
    good: "good は広い意味なので便利ですが、質問によっては useful・important・convenient など、より具体的な語の方がよい場合があります。",
    people: "people は一般的な「人々」です。問題が students について聞いている場合は、students の方が具体的です。",
    bad: "bad は形容詞です。a problem や risk のような名詞が必要な文では使いにくいです。",
    fun: "fun は「楽しい」という意味です。役に立つ・大切だと言いたい問題では useful や important の方が合います。"
  };

  return explanations[word] || `${word} はこの模範解答には入っていません。質問に直接答える単語か確認しましょう。`;
}
