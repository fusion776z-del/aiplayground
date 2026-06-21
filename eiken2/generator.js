function pick(value){
  if(Array.isArray(value) && value.length > 0){
    return value[Math.floor(Math.random() * value.length)];
  }

  if(typeof value === "string"){
    return value;
  }

  return "good";
}

function getConnectors(level){
  if(level === "4" || level === "3"){
    return {

      first: "First,",
      second: "Second,"

    };
  }

  if(level === "pre2"){
    return {
      first: "One reason is that",
      second: "Another reason is that"
    };
  }

  return {
    first: "To begin with",
    second: "In addition"
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
    const firstLead = connectors.first;
    const secondLead = connectors.second;

    if(level === "4"){
      const adj = pick(base.adj);

      question = `What do you think about ${topic}?`;
      instruction = "bankから単語を選び、英語で2文作りなさい。";

      answers = [
        `${firstLead} I like ${topic}.`,
        `${secondLead} it is ${adj}.`
      ];
    }

    else if(level === "3"){
      const adj = pick(base.adj);
      const reason = pick(base.reason);

      question = `Do you think ${topic} is good for students?`;
      instruction = "bankから単語を選び、あなたの考えを英語で2文作りなさい。";

      const first = [
        `${firstLead} I think ${topic} is ${adj}.`,
        `${firstLead} I think ${topic} is very ${adj}.`
      ];

      const second = [
        `${secondLead} it is good for ${reason}.`,
        `${secondLead} it helps ${reason}.`
      ];

      answers = [
        pick(first),
        pick(second)
      ];
    }

else if(level === "pre2"){
  const adj = pick(base.adj);
  const risk = pick(base.risk);
  const reason = pick(base.reason);

  passage += " Some people have different opinions.";

  if(topic === "getting enough sleep"){
    question = `Do you think ${topic} is important for students?`;
  }else{
    question = `Do you think ${topic} is useful for students?`;
  }

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

    else{
      const adj = pick(base.adj);
      const risk = pick(base.risk);
      const field = pick(base.field);

      passage += " Some people have different opinions.";

      question = `Do you think ${topic} is good for society?`;
      instruction = "bankから単語を選び、理由または対比をふくめて英語で2文作りなさい。";

      const first = [
        `${firstLead} ${topic} is ${adj}.`,
        `${firstLead} ${topic} is very ${adj}.`
      ];

      const second = [
        `${secondLead} it can be a ${risk} in ${field}.`,
        `${secondLead} it may cause a ${risk} in ${field}.`
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
        "First I think it is good.",
        "Second it is important."
      ]
    };
  }
}
