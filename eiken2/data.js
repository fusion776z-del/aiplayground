const LEVELS = {
  "4": [
    {
      text: "I play soccer.",
      topic: "soccer",
      adj: ["fun", "good", "nice"]
    },
    {
      text: "He plays baseball.",
      topic: "baseball",
      adj: ["fun", "good", "exciting"]
    },
    {
      text: "She has a dog.",
      topic: "dogs",
      adj: ["cute", "nice", "good"]
    },
    {
      text: "I like music.",
      topic: "music",
      adj: ["fun", "good", "interesting"]
    },
    {
      text: "I read books.",
      topic: "books",
      adj: ["good", "interesting", "fun"]
    }
  ],

"3": [
  {
    text: "Some people read books every day.",
    topic: "reading books",
    adj: ["useful", "important", "good"],
    reason: ["learning", "students", "daily life"]
  },
  {
    text: "Many students play sports after school.",
    topic: "playing sports",
    adj: ["important", "healthy", "good"],
    reason: ["health", "students", "school life"]
  },
  {
    text: "Some students study English every day.",
    topic: "studying English",
    adj: ["important", "useful", "good"],
    reason: ["the future", "school", "communication"]
  },
  {
    text: "Many students use computers at school.",
    topic: "using computers",
    adj: ["useful", "important", "good"],
    reason: ["studying", "school life", "learning"]
  },
  {
    text: "Some people listen to music every day.",
    topic: "listening to music",
    adj: ["fun", "relaxing", "good"],
    reason: ["daily life", "students", "free time"]
  },

  {
    type: "opinion",
    stance: "agree",
    text: "Many students use smartphones every day.",
    topic: "using smartphones",
    question: "Do you agree with using smartphones?",
    adj: ["convenient", "useful", "helpful"],
    reason: ["communication", "studying", "daily life"]
  },
  {
    type: "opinion",
    stance: "disagree",
    text: "Many students use smartphones every day.",
    topic: "using smartphones",
    question: "Do you disagree with using smartphones?",
    adj: ["bad", "a problem", "dangerous"],
    reason: ["studying", "health", "daily life"]
  },
  {
    type: "intro",
    text: "Please introduce your town.",
    topic: "my town",
    question: "Introduce your town. Write two things about it.",
    places: ["a beautiful park", "a big library", "many good shops"],
    features: ["people are kind", "it is quiet", "it is interesting"]
  },
  {
    type: "intro",
    text: "Please introduce your school.",
    topic: "my school",
    question: "Introduce your school. Write two things about it.",
    places: ["a big gym", "a good library", "many classrooms"],
    features: ["teachers are kind", "students are friendly", "it is fun"]
  }
],

"pre2": [
  {
    text: "Some students use smartphones every day.",
    topic: "using smartphones",
    adj: ["convenient", "useful", "important"],
    risk: ["helpful", "useful", "convenient"],
    reason: ["their studies", "communication", "daily life"]
  },
  {
    text: "Many people exercise for their health.",
    topic: "exercising",
    adj: ["important", "useful", "good"],
    risk: ["helpful", "necessary", "good"],
    reason: ["health", "daily life", "students"]
  },
  {
    text: "Students use the internet to study.",
    topic: "using the internet",
    adj: ["useful", "convenient", "important"],
    risk: ["helpful", "useful", "convenient"],
    reason: ["studying", "learning", "communication"]
  },
  {
    text: "Some students do not get enough sleep.",
    topic: "getting enough sleep",
    adj: ["important", "necessary", "good"],
    risk: ["necessary", "important", "good"],
    reason: ["health", "studying", "daily life"]
  },

  {
    type: "opinion",
    stance: "agree",
    text: "Some students use smartphones for studying.",
    topic: "using smartphones",
    question: "Do you agree with students using smartphones for studying?",
    adj: ["convenient", "useful", "helpful"],
    reason: ["their studies", "communication", "daily life"]
  },
  {
    type: "opinion",
    stance: "disagree",
    text: "Some students use smartphones for a long time every day.",
    topic: "using smartphones too much",
    question: "Do you disagree with students using smartphones too much?",
    adj: ["a problem", "bad", "dangerous"],
    reason: ["health", "studying", "daily life"]
  },
  {
    type: "opinion",
    stance: "agree",
    text: "Many students use the internet to learn new things.",
    topic: "using the internet",
    question: "Do you agree with using the internet for learning?",
    adj: ["useful", "convenient", "important"],
    reason: ["learning", "their studies", "communication"]
  },
  {
    type: "opinion",
    stance: "disagree",
    text: "Some students spend too much time on the internet.",
    topic: "using the internet too much",
    question: "Do you disagree with using the internet too much?",
    adj: ["a problem", "bad", "dangerous"],
    reason: ["health", "studying", "daily life"]
  },
  {
    type: "intro",
    text: "Please introduce your town or school.",
    topic: "my town",
    question: "Introduce your town. Write two things about it.",
    places: ["a large park", "a useful library", "many local shops"],
    features: [
      "people can enjoy their free time",
      "students can learn many things",
      "it is good for daily life"
    ]
  }
],

"2": [
  {
    text: "Technology makes life easier, but it can also cause problems.",
    topic: "technology",
    adj: ["useful", "convenient", "important"],
    risk: ["problem", "risk", "challenge"],
    field: ["society", "education", "communication"]
  },
  {
    text: "More people are using smartphones, and this may affect communication.",
    topic: "smartphones",
    adj: ["convenient", "powerful", "useful"],
    risk: ["problem", "risk", "challenge"],
    field: ["communication", "society", "daily life"]
  },
  {
    text: "The internet is useful, but it also has risks.",
    topic: "the internet",
    adj: ["useful", "important", "convenient"],
    risk: ["risk", "problem", "danger"],
    field: ["society", "education", "communication"]
  },
  {
    text: "Online learning is becoming more common.",
    topic: "online learning",
    adj: ["useful", "convenient", "important"],
    risk: ["problem", "challenge", "risk"],
    field: ["education", "society", "daily life"]
  },

  {
    type: "opinion",
    stance: "agree",
    text: "More people are using AI tools in daily life.",
    topic: "AI tools",
    question: "Do you agree that AI tools are useful in modern society?",
    adj: ["useful", "convenient", "important"],
    reason: ["education", "work", "daily life"]
  },
  {
    type: "opinion",
    stance: "disagree",
    text: "More people are using AI tools in daily life.",
    topic: "AI tools",
    question: "Do you disagree that AI tools are always useful?",
    adj: ["a problem", "a risk", "a challenge"],
    reason: ["education", "communication", "society"]
  },
  {
    type: "opinion",
    stance: "agree",
    text: "Online learning is becoming common in many countries.",
    topic: "online learning",
    question: "Do you agree that online learning is good for students?",
    adj: ["useful", "convenient", "important"],
    reason: ["education", "studying", "daily life"]
  },
  {
    type: "opinion",
    stance: "disagree",
    text: "Some students study online for many hours every day.",
    topic: "online learning",
    question: "Do you disagree that online learning is always good for students?",
    adj: ["a problem", "a risk", "a challenge"],
    reason: ["communication", "health", "school life"]
  },
  {
    type: "opinion",
    stance: "agree",
    text: "Some towns are trying to attract more visitors.",
    topic: "local tourism",
    question: "Do you agree that local tourism is important for towns?",
    adj: ["important", "useful", "helpful"],
    reason: ["the economy", "the community", "local shops"]
  },
  {
    type: "intro",
    text: "Some towns are trying to attract more visitors.",
    topic: "my town",
    question: "Introduce your town. Write two things that would be interesting for visitors.",
    places: ["a historical place", "a beautiful park", "local shops"],
    features: [
      "visitors can enjoy local food",
      "people can learn about history",
      "it is good for the community"
    ]
  }
]
