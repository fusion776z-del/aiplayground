function makeBank(correct){
  try{
    if(!Array.isArray(correct)){
      throw new Error("correct must be array");
    }

    let words = correct
      .filter(x => typeof x === "string")
      .join(" ")
      .replace(/[?!]/g, "")
      .replace(/\./g, " . ")
      .split(/\s+/)
      .filter(Boolean);

    words = [...new Set(words)];
    words = removePlainConnectorDuplicates(words);

    let filler;

    if(level === "3"){
      filler = [
        "First,","Second,",
        "and","but","because","very",
        "good","important","useful",
        "students","people","every",
        "town","park","library","shops",
        "kind","beautiful","interesting",
        "agree","disagree","helpful","affect"
      ];
    }

    else if(level === "pre2"){
      filler = [
        "First,","Second,",
        "One","Another","reason","is","that",
        "because","also","important",
        "more","less","convenient",
        "health","study","problem","useful",
        "town","park","library","shops",
        "people","kind","beautiful","interesting",
        "agree","disagree","helpful","affect"
      ];
    }

    else{
      filler = [
        "First,","Second,",
        "To","begin","with,",
        "In","addition,",
        "however","therefore","although",
        "society","problem","risk",
        "education","communication",
        "useful","important",
        "town","park","library","shops",
        "people","kind","beautiful","interesting",
        "agree","disagree","helpful","affect"
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

function removePlainConnectorDuplicates(words){
  const hasFirstComma = words.includes("First,");
  const hasSecondComma = words.includes("Second,");
  const hasWithComma = words.includes("with,");
  const hasAdditionComma = words.includes("addition,");

  return words.filter(w => {
    if(hasFirstComma && w === "First") return false;
    if(hasSecondComma && w === "Second") return false;
    if(hasWithComma && w === "with") return false;
    if(hasAdditionComma && w === "addition") return false;
    return true;
  });
}

function shuffle(arr){
  return arr.sort(() => Math.random() - 0.5);
}
