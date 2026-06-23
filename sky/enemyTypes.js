
const EnemyTypes = {
  slime:{type:'slime',hp:3,speed:0.9,color:'#78df72'},
  fast:{type:'fast',hp:2,speed:1.5,color:'#ffcc66'},
  wind_bat:{type:'bat',hp:2,speed:1.25,color:'#8de7ff'}
};

function createEnemyFromPlacement(e){
  const base=EnemyTypes[e.id]||EnemyTypes.slime;
  return {...base,...e};
}
