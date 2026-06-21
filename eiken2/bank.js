function makeBank(correct){
  try{
    if(!Array.isArray(correct)){
      throw new Error("correct must be array");
    }

    /*
      correct 例:
      [
        "First, I like baseball.",
        "Second, it is good."
      ]

      ここでは、
      - カンマは残す
      - ピリオドは単語として残す
      - ? ! は削除
    */
    let words = correct
      .filter(x => typeof x === "string")
      .join(" ")
      .replace(/[?!]/g, "")
      .replace(/\./g, " . ")
      .split(/\s+/)
      .filter(Boolean);

    // 重複削除
    words = [...new Set(words)];

    // First と First, のような重複を整理
    words = removePlainConnectorDuplicates(words);

    let filler;

    if(level === "4"){
      filler = [
        "First,","Second,",
        "I","you","he","she",
        "like","love","have","is",
        "good","fun","nice","a","the"
      ];
    }

    else if(level === "3"){
      filler = [
        "First,","Second,",
        "and","but","because","very",
        "good","important","useful",
        "students","people","every"
      ];
    }

    else if(level === "pre2"){
      filler = [
        "One","Another","reason","is","that",
        "because","also","important",
        "more","less","convenient",
        "health","study","problem","useful"
      ];
    }

    else{
      filler = [
        "To","begin","with,",
        "In","addition,",
        "however","therefore","although",
        "society","problem","risk",
        "education","communication",
        "useful","important"
      ];
    }

    let safety = 0;

    while(words.length < 20 && safety < 80){
      const f = filler[Math.floor(Math.random() * filler.length)];

      if(!words.includes(f)){
        words.push(f);
      }

      safety++;
    }

    // filler追加後にも念のためもう一度整理
    words = [...new Set(words)];
    words = removePlainConnectorDuplicates(words);

    return shuffle(words);

  }catch(e){
    console.error("bank error:", e);

    return [
      "First,","Second,",
      "I","think","it","is","good",
      ".","because","important","students",
      "study","health"
    ];
  }
}

/*
  カンマ付きの接続語がある場合、
  カンマなし版を削る。

  例:
  ["First,", "First"] → ["First,"]
  ["Second,", "Second"] → ["Second,"]
  ["with,", "with"] → ["with,"]
  ["addition,", "addition"] → ["addition,"]
*/
function removePlainConnectorDuplicates(words){
  const hasFirstComma = words.includes("First,");
  const hasSecondComma = words.includes("Second,");
  const hasWithComma = words.includes("with,");
  const hasAdditionComma = words.includes("addition,");

  return words.filter(w => {
    if(hasFirstComma && w === "First") return false;
    if(hasSecondComma && w === "Second") return false;

    // 2級用: To begin with, / In addition,
    if(hasWithComma && w === "with") return false;
    if(hasAdditionComma && w === "addition") return false;

    return true;
  });
}

function shuffle(arr){
  return arr.sort(() => Math.random() - 0.5);
}