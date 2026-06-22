function pick(value){
  if(Array.isArray(value) && value.length > 0){
    return value[Math.floor(Math.random() * value.length)];
  }

  if(typeof value === "string"){
    return value;
  }

  return "good";
}

function pickPair(pairs){
  return pairs[Math.floor(Math.random() * pairs.length)];
}

/*
  級ごとの接続表現。
  4級は通常問題では1文回答なので、通常問題では使わない。
  3級は First / Second 固定。
  準2級は First / Second または One reason / Another reason。
  2級は First / Second または To begin with / In addition。
*/
function getConnectors(level){
  if(level === "4" || level === "3"){
    return {
      first: "First,",
      second: "Second,"
    };
  }

  if(level === "pre2"){
    const pair = pickPair([
      ["First,", "Second,"],
      ["One reason is that", "Another reason is that"]
    ]);

    return {
      first: pair[0],
      second: pair[1]
    };
  }

  const pair = pickPair([
    ["First,", "Second,"],
    ["To begin with,", "In addition,"]
  ]);

  return {
    first: pair[0],
    second: pair[1]
  };
}

/*
  質問文で useful / important を使い分ける。
  sleep や exercise は useful より important の方が自然。
*/
function questionAdjectiveFor(topic){
  const importantTopics = [
    "getting enough sleep",
    "exercising"
  ];

  if(importantTopics.includes(topic)){
    return "important";
  }

  return "useful";
}

/*
  紹介型問題。
  例:
  Introduce your town. Write two things about it.
  First, my town has a beautiful park.
  Second, people are kind.
*/
function generateIntroProblem(level, base, connectors){
  const firstLead = connectors.first;
  const secondLead = connectors.second;

  const place = pick(base.places);
  const feature = pick(base.features);

  return {
    passage: base.text || "Please introduce something.",
    question: base.question || "Introduce it. Write two things about it.",
    instruction: "bankから単語を選び、2つのことがらについて英語で紹介しなさい。",
    answers: [
      `${firstLead} ${base.topic || "it"} has ${place}.`,
      `${secondLead} ${feature}.`
    ]
  };
}

/*
  賛成・反対型問題。
  例:
  Do you agree with using smartphones?
  First, it is convenient.
  Second, it helps communication.
*/
function generateOpinionProblem(level, base, connectors){
  const firstLead = connectors.first;
  const secondLead = connectors.second;

  const adj = pick(base.adj);
  const reason = pick(base.reason);

  if(base.stance === "agree"){
    return {
      passage: base.text || "",
      question: base.question || `Do you agree with ${base.topic || "this idea"}?`,
      instruction: "bankから単語を選び、賛成の理由を英語で2つ作りなさい。",
      answers: [
        `${firstLead} it is ${adj}.`,
        `${secondLead} it helps ${reason}.`
      ]
    };
  }

  return {
    passage: base.text || "",
    question: base.question || `Do you disagree with ${base.topic || "this idea"}?`,
    instruction: "bankから単語を選び、反対の理由を英語で2つ作りなさい。",
    answers: [
      `${firstLead} it is ${adj}.`,
      `${secondLead} it can affect ${reason}.`
    ]
  };
}

function generateProblem(level){
  try{
    if(!LEVELS[level] || LEVELS[level].length === 0){
      throw new Error("LEVELデータなし: " + level);
    }

    const base = LEVELS[level][Math.floor(Math.random() * LEVELS[level].length)];

    const topic = base.topic || "it";
    let passage = base.text || "";
    let question = "";
    let instruction = "";
    let answers = [];

    const connectors = getConnectors(level);

    /*
      type付き問題を先に処理する。
      これにより、3級・準2級・2級すべてで
      intro / opinion 型が使える。
    */
    if(base.type === "intro"){
      return generateIntroProblem(level, base, connectors);
    }

    if(base.type === "opinion"){
      return generateOpinionProblem(level, base, connectors);
    }

    /*
      通常問題：4級
      4級だけは1文で答える。
    */
    if(level === "4"){
      const questionTopic = base.questionTopic || topic;

      passage = base.text || "";

      question = `Make one sentence about ${questionTopic}.`;
      instruction = "bankから単語を選び、英語で1文作りなさい。";

      answers = [
        `I like ${topic}.`
      ];
    }

    /*
      通常問題：3級
    */
    else if(level === "3"){
      const adj = pick(base.adj);
      const reason = pick(base.reason);

      question = `Do you think ${topic} is good for students?`;
      instruction = "bankから単語を選び、あなたの考えを英語で2文作りなさい。";

      const first = [
        `${connectors.first} I think ${topic} is ${adj}.`,
        `${connectors.first} I think ${topic} is very ${adj}.`
      ];

      const second = [
        `${connectors.second} it is good for ${reason}.`,
        `${connectors.second} it helps ${reason}.`
      ];

      answers = [
        pick(first),
        pick(second)
      ];
    }

    /*
      通常問題：準2級
    */
    else if(level === "pre2"){
      const adj = pick(base.adj);
      const risk = pick(base.risk);
      const reason = pick(base.reason);

      passage += " Some people have different opinions.";

      question = `Do you think ${topic} is ${questionAdjectiveFor(topic)} for students?`;
      instruction = "bankから単語を選び、理由をふくめて英語で2文作りなさい。";

      const first = [
        `${connectors.first} ${topic} is ${adj}.`,
        `${connectors.first} ${topic} is very ${adj}.`
      ];

      const second = [
        `${connectors.second} it is ${risk} for ${reason}.`,
        `${connectors.second} it can affect ${reason}.`
      ];

      answers = [
        pick(first),
        pick(second)
      ];
    }

    /*
      通常問題：2級
    */
    else{
      const adj = pick(base.adj);
      const risk = pick(base.risk);
      const field = pick(base.field);

      passage += " Some people have different opinions.";

      question = `Do you think ${topic} is good for society?`;
      instruction = "bankから単語を選び、理由または対比をふくめて英語で2文作りなさい。";

      const first = [
        `${connectors.first} ${topic} is ${adj}.`,
        `${connectors.first} ${topic} is very ${adj}.`
      ];

      const second = [
        `${connectors.second} it can be a ${risk} in ${field}.`,
        `${connectors.second} it may cause a ${risk} in ${field}.`
      ];

      answers = [
        pick(first),
        pick(second)
      ];
    }

    return {
      passage,
      question,
      instruction,
      answers
    };

  }catch(e){
    console.error("generator error:", e);

    return {
      passage: "Error generating problem.",
      question: "What do you think?",
      instruction: "bankから単語を選び、英語で2文作りなさい。",
      answers: [
        "First, I think it is good.",
        "Second, it is important."
      ]
    };
  }
}
