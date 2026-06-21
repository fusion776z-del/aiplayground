let level = "4";
let current = generateProblem(level);
let answer = [];

function safe(fn){
  try{ fn(); }
  catch(e){ console.error(e); alert("エラーが発生しました"); }
}

function setLevel(l){
  level = l;
  current = generateProblem(level);
  show();
}

function show(){
  answer = [];
  if(!current || !current.answers){
    current = generateProblem(level);
  }

  document.getElementById("reading").innerHTML = `
    <b>【読んで答えよう】</b><br>
    ${current.passage || current.text || ""}
    <br><br>
    <b>Question:</b><br>
    ${current.question || "What do you think?"}
    <br><br>
    👉 ${current.instruction || "bankから単語を選び、英語で2文作りなさい。"}
  `;

  renderBank(current.answers);
  updateAnswer();
  document.getElementById("result").innerHTML = "";
}

function renderBank(correct){
  const bankDiv = document.getElementById("bank");
  bankDiv.innerHTML = "";
  makeBank(correct).forEach(w => {
    const b = document.createElement("button");
    b.textContent = w;
    b.onclick = () => { answer.push(w); updateAnswer(); };
    bankDiv.appendChild(b);
  });
}

function updateAnswer(){
  const div = document.getElementById("answer");
  div.innerHTML = "";

  answer.forEach((word, i) => {
    const b = document.createElement("button");

    // 表示は単語だけにする
    b.textContent = word;

    // タップで削除
    b.onclick = () => {
      answer.splice(i, 1);
      updateAnswer();
    };

    // ダブルタップで左へ移動
    b.ondblclick = () => {
      if(i > 0){
        const tmp = answer[i];
        answer[i] = answer[i - 1];
        answer[i - 1] = tmp;
        updateAnswer();
      }
    };

    b.title = "タップで削除 / ダブルタップで左へ移動";

    div.appendChild(b);
  });
}
function undo(){
  answer.pop();
  updateAnswer();
}

function clearAll(){
  answer = [];
  updateAnswer();
}

function check(){
  const input = answer.join(" ");
  const model = current.answers.join(" ");
  const r = scoreAnswer(input, model);

  let cls = "bad";
  let txt = "不合格";
  if(r.score >= 80){ cls = "good"; txt = "合格"; }
  else if(r.score >= 60){ cls = "mid"; txt = "あと少し"; }

  document.getElementById("result").innerHTML = `
    <div class="score ${cls}"><b>${r.score}点 - ${txt}</b></div>
    <br>
    ${r.comments.join(" / ") || "OK！"}
    <br><br>
    <b>正解:</b><br>
    ${model}
  `;
}

function next(){
  current = generateProblem(level);
  show();
}

show();
