(()=>{'use strict';
const $=id=>document.getElementById(id),SS=window.SCENARIOS,C=$('game'),X=C.getContext('2d');
let save=JSON.parse(localStorage.getItem('uwasaAction')||'{"unlocked":1,"done":[]}');
let S={stage:null,node:'start',words:[],selected:[],trust:50,stress:35,rumor:30,tool:null};
let run=false,keys={},just={},frame=0,G=null;
const ACTIONS={
1:{name:'消えた名前の校舎',desc:'名簿の文字を5つ集め、黒板へ名前を返す。先生に見つからないよう机の陰を使おう。'},
2:{name:'無音踏切からの脱出',desc:'警告灯と線路の影を読み、放送片を4つ集めて踏切を鳴らす。'},
3:{name:'増殖する集合写真',desc:'フラッシュの瞬間は静止。迷子の生徒を4人集め、空席へ導こう。'},
4:{name:'赤い傘の約束',desc:'傘の子を雨から守りながら駅へ進む。離れすぎると少女は立ち止まる。'},
5:{name:'鏡像のふたつの出口',desc:'左右反転する本体と鏡像を同時に導き、別々の出口へ到達させる。'},
6:{name:'巨大猫と町の記憶',desc:'消される前に町の記憶を5つ集め、巨大猫を帰り道へ誘導する。'},
7:{name:'六つの証言を語り直す',desc:'六事件の証言を回収し、地下の「名もなき空白」で物語を語り直す。'}
};
function show(id){document.querySelectorAll('.screen').forEach(e=>e.classList.remove('active'));$(id).classList.add('active')}
function persist(){localStorage.setItem('uwasaAction',JSON.stringify(save))}function clamp(n){return Math.max(0,Math.min(100,n))}
$('newGame').onclick=()=>{save={unlocked:1,done:[]};persist();map()};$('continueGame').onclick=map;
function map(){run=false;show('map');$('stageLabel').textContent='';$('stageCards').innerHTML='';SS.forEach(s=>{let b=document.createElement('button'),ok=s.id<=save.unlocked;b.className='card '+(save.done.includes(s.id)?'done':'');b.disabled=!ok;b.innerHTML=`<b>第${s.id}話 ${s.icon} ${s.title}</b><p>${ok?ACTIONS[s.id].name:'未解決'}</p>`;b.onclick=()=>start(s);$('stageCards').appendChild(b)})}
function start(s){S={stage:s,node:'start',words:[],selected:[],trust:50,stress:35,rumor:30,tool:null};$('stageLabel').textContent=`第${s.id}話 ${s.title}`;$('speakerName').textContent=s.speaker[0];$('speakerIcon').textContent=s.speaker[1];show('talk');talk()}
function add(w){if(w&&!S.words.includes(w))S.words.push(w)}
function talk(){let n=S.stage.nodes[S.node];$('speech').textContent=n.text;$('trustN').textContent=S.trust;$('stressN').textContent=S.stress;$('trust').value=S.trust;$('stress').value=S.stress;$('mood').textContent=S.stress>65?'ひどく動揺している':S.trust>70?'こちらを信頼している':'様子をうかがっている';$('words').innerHTML=S.words.map(w=>`<span class="tag">《${w}》</span>`).join('')||'なし';$('choices').innerHTML='';n.choices.filter(c=>!c.requires||S.words.includes(c.requires)).forEach(c=>{let b=document.createElement('button');b.textContent=c.label;b.onclick=()=>{S.trust=clamp(S.trust+(c.trust||0));S.stress=clamp(S.stress+(c.stress||0));S.rumor=clamp(S.rumor+(c.rumor||0));add(c.gain);if(c.action==='prep')return prep();S.node=c.next;talk()};$('choices').appendChild(b)})}
function prep(){show('prep');renderPrep()}
function renderPrep(){$('wordList').innerHTML='';S.words.forEach(w=>{let b=document.createElement('button');b.className='word'+(S.selected.includes(w)?' selected':'');b.textContent=`《${w}》`;b.onclick=()=>{if(S.selected.includes(w))S.selected.splice(S.selected.indexOf(w),1);else{if(S.selected.length===2)S.selected.shift();S.selected.push(w)}renderPrep()};$('wordList').appendChild(b)});$('slots').textContent=(S.selected[0]?`《${S.selected[0]}》`:'言葉A')+' ＋ '+(S.selected[1]?`《${S.selected[1]}》`:'言葉B');let r=S.stage.recipe,ok=[r[0],r[1]].every(w=>S.selected.includes(w));S.tool=S.selected.length===2?{name:ok?r[2]:'即興の言葉',true:ok}:null;$('bulletName').textContent=S.tool?S.tool.name:'未生成';$('bulletDesc').textContent=S.tool?(ok?'真相の言葉。Xで強力な助けを呼べる':'Xで短時間だけ危険を退ける'):'言葉を2つ選択';$('deploy').disabled=!S.tool;$('bossIcon').textContent=S.stage.icon;$('bossName').textContent=ACTIONS[S.stage.id].name;$('routeInfo').textContent=ACTIONS[S.stage.id].desc}
$('deploy').onclick=setup;
addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(!keys[k])just[k]=1;keys[k]=1;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault()});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=0);
function obj(x,y,r=14,t=''){return{x,y,r,t,got:false}}function setup(){show('battle');frame=0;run=false;G={id:S.stage.id,p:{x:90,y:520,r:13,hp:S.words.includes('誤解')?3:5,inv:0},items:[],haz:[],goal:{x:870,y:80,r:34},power:0,dash:0,count:0,need:S.stage.id===2?4:S.stage.id===3?4:S.stage.id===7?6:5,npc:null,mirror:null,msg:'',timer:0};
if(G.id===1)G.items=[[170,130],[350,470],[530,170],[700,420],[850,140]].map((p,i)=>obj(...p,14,'名'[i%1]));
if(G.id===2)G.items=[[210,500],[390,330],[610,480],[820,260]].map(p=>obj(...p,13,'放'));
if(G.id===3)G.items=[[180,150],[360,440],[620,180],[800,420]].map(p=>obj(...p,16,'人'));
if(G.id===4){G.npc={x:60,y:540,r:14};G.need=1;G.goal={x:875,y:70,r:42}}
if(G.id===5){G.mirror={x:870,y:520,r:13};G.goal={x:870,y:75,r:30};G.goal2={x:90,y:75,r:30};G.need=1}
if(G.id===6)G.items=[[170,180],[330,450],[500,120],[690,390],[830,180]].map(p=>obj(...p,15,'記'));
if(G.id===7)G.items=[[130,120],[300,230],[470,110],[640,250],[820,130],[480,430]].map((p,i)=>obj(...p,18,String(i+1)));
$('overlay').classList.remove('hide');$('overlayText').innerHTML=`<b>${ACTIONS[G.id].name}</b><br>${ACTIONS[G.id].desc}`;$('battleStart').textContent='調査開始';hud();draw()}
$('battleStart').onclick=()=>{run=true;$('overlay').classList.add('hide');requestAnimationFrame(loop)};
function loop(){if(!run)return;update();draw();just={};if(run)requestAnimationFrame(loop)}
function move(q,mirror=false){let v=G.dash?8:4.2,dx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),dy=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);if(mirror)dx=-dx;if(dx&&dy){dx*=.707;dy*=.707}q.x=clampPos(q.x+dx*v,18,942);q.y=clampPos(q.y+dy*v,70,580)}function clampPos(n,a,b){return Math.max(a,Math.min(b,n))}
function hit(a,b,d=0){return Math.hypot(a.x-b.x,a.y-b.y)<a.r+b.r+d}function hurt(){if(G.power||G.p.inv)return;G.p.hp--;G.p.inv=80;G.msg='ウワサに触れた';if(G.p.hp<=0)finish(false)}
function collect(){G.items.forEach(o=>{if(!o.got&&hit(G.p,o,5)){o.got=true;G.count++;G.msg=`回収 ${G.count}/${G.need}`}})}
function update(){frame++;let p=G.p;if(just[' '])G.dash=14;if(G.dash)G.dash--;if(just.x)G.power=S.tool.true?180:75;if(G.power)G.power--;if(p.inv)p.inv--;move(p);if(G.id===5)move(G.mirror,true);if(G.id!==4&&G.id!==5)collect();
if(G.id===1){let t={x:480+Math.sin(frame/80)*390,y:300+Math.cos(frame/55)*190,r:35};G.enemy=t;if(hit(p,t,8))hurt();if(G.count===5&&hit(p,G.goal))finish(true)}
if(G.id===2){G.trainWarn=frame%240;let active=G.trainWarn>150&&G.trainWarn<205;if(active&&p.y>250&&p.y<390)hurt();if(G.count===4&&hit(p,G.goal))finish(true)}
if(G.id===3){G.flash=frame%180;if(G.flash>155&&G.flash<165&&(keys.w||keys.a||keys.s||keys.d||keys.arrowup||keys.arrowdown||keys.arrowleft||keys.arrowright))hurt();if(G.count===4&&hit(p,G.goal))finish(true)}
if(G.id===4){let n=G.npc,dist=Math.hypot(p.x-n.x,p.y-n.y);if(dist<110){n.x+=(p.x-n.x)*.035;n.y+=(p.y-n.y)*.035}if(frame%75===0&&dist>150&&!G.power){n.x-=25;G.msg='少女が立ち止まった'}if(frame%55<15&&dist>85)hurt();if(hit(n,G.goal)&&hit(p,G.goal,30))finish(true)}
if(G.id===5){G.haz=[{x:300,y:310,r:42},{x:660,y:310,r:42}];G.haz.forEach(h=>{if(hit(p,h)||hit(G.mirror,h))hurt()});if(hit(p,G.goal)&&hit(G.mirror,G.goal2))finish(true)}
if(G.id===6){G.enemy={x:480+Math.sin(frame/90)*360,y:285+Math.cos(frame/65)*150,r:48};if(hit(p,G.enemy,6))hurt();if(frame%300===0){let left=G.items.find(o=>!o.got);if(left&&!G.power){left.got=true;G.need--;G.msg='町の記憶が食べられた'}}if(G.count>=G.need&&hit(p,G.goal))finish(true)}
if(G.id===7){G.enemy={x:480,y:300,r:55+Math.sin(frame/20)*12};if(G.count<6&&hit(p,G.enemy,20))hurt();if(G.count===6&&hit(p,G.enemy,25)&&just.x)finish(true)}hud()}
function hud(){$('hpN').textContent=G?G.need-G.count:0;$('coreN').textContent=G?G.count:0;$('hp').max=G?G.need:1;$('hp').value=G?Math.max(0,G.need-G.count):0;$('core').max=G?G.need:1;$('core').value=G?G.count:0;$('rush').textContent=G?ACTIONS[G.id].name:'';$('life').textContent=G?'体力 '+'●'.repeat(Math.max(0,G.p.hp))+'｜Space 回避｜X 言葉の力':''}
function circle(o,color){X.fillStyle=color;X.beginPath();X.arc(o.x,o.y,o.r,0,7);X.fill()}function text(t,x,y,size=24,color='#fff'){X.fillStyle=color;X.font=`bold ${size}px sans-serif`;X.textAlign='center';X.fillText(t,x,y)}
function draw(){X.fillStyle=['','#1a1715','#14202a','#33283d','#182b35','#201e2d','#2a2118','#161626'][G.id];X.fillRect(0,0,960,600);X.strokeStyle='#ffffff18';for(let x=0;x<960;x+=80){X.beginPath();X.moveTo(x,0);X.lineTo(x,600);X.stroke()}circle(G.goal,'#4a8c70');text(G.id===1?'黒板':G.id===2?'踏切':G.id===3?'空席':G.id===4?'駅':G.id===5?'出口':G.id===6?'帰路':'',G.goal.x,G.goal.y+8,18);
G.items.forEach(o=>{if(!o.got){circle(o,'#e6c56d');text(o.t,o.x,o.y+7,18,'#282218')}});
if(G.id===1){circle(G.enemy,'#8e5260');text('先生',G.enemy.x,G.enemy.y+7,16)}
if(G.id===2){X.fillStyle=G.trainWarn>120?'#d34a4a':'#6f5930';X.fillRect(0,250,960,140);if(G.trainWarn>150&&G.trainWarn<205){X.fillStyle='#ccd3d8';X.fillRect(0,270,960,90);text('無音列車',480,325,28,'#222')}}
if(G.id===3&&G.flash>150){X.fillStyle=`rgba(255,255,255,${(G.flash-150)/35})`;X.fillRect(0,0,960,600);text('止まれ',480,300,42,'#181818')}
if(G.id===4){circle(G.npc,'#d94152');text('傘',G.npc.x,G.npc.y-22,16);if(frame%55<15){X.strokeStyle='#91bce0';for(let x=0;x<960;x+=35){X.beginPath();X.moveTo(x,60);X.lineTo(x-14,590);X.stroke()}}}
if(G.id===5){circle(G.goal2,'#745a96');text('鏡出口',G.goal2.x,G.goal2.y+7,15);G.haz.forEach(h=>circle(h,'#7e3345'));circle(G.mirror,'#c184e8')}
if(G.id===6){circle(G.enemy,'#bd8e50');text('巨大猫',G.enemy.x,G.enemy.y+7,18)}
if(G.id===7){circle(G.enemy,G.count===6?'#e7d27c':'#09090c');text(G.count===6?'Xで語り直す':'名もなき空白',G.enemy.x,G.enemy.y+8,18)}
X.globalAlpha=G.p.inv&&frame%8<4?.3:1;circle(G.p,G.power?'#f5dc77':'#75d9ef');X.globalAlpha=1;text('局',G.p.x,G.p.y+6,14,'#15202a');if(G.msg){text(G.msg,480,575,18);if(frame%120===0)G.msg=''}}
function finish(ok){run=false;show('result');$('resultTitle').textContent=ok?'事件解決':'調査失敗';let suffix=S.words.includes('暴露')?' 真相は公表された。':S.words.includes('誤解')?' ただし誤解の種が残った。':'';$('resultText').textContent=ok?S.stage.ending+suffix:'聞き込み方や言葉の組み合わせを変えて再挑戦しよう。';if(ok){if(!save.done.includes(S.stage.id))save.done.push(S.stage.id);save.unlocked=Math.max(save.unlocked,Math.min(7,S.stage.id+1));persist()}$('next').onclick=map}
map();show('title');
})();
