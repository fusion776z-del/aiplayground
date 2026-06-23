const makeEnemy = (e) => e;

const Stage5 = {
  id: 'stage5',
  enemies: [
    { id:'slime', x:100, y:800 },
    { id:'fast', x:200, y:700 },
    { id:'wind_bat', x:300, y:600 }
  ].map(makeEnemy)
};
