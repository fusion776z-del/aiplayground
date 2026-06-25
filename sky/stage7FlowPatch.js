/* stage7FlowPatch.js
   Load after game.js. Defensive helper for the desired final flow.
*/
(function(){
  "use strict";
  window.__stage7FlowPatchVersion = "stage7-flow-v1";

  function isStage7(){
    try{
      if(typeof G === "undefined") return false;
      return (G.stageIndex === 6) || (G.map && G.map.id === "stage7") || (G.map && String(G.map.name || "").indexOf("虚空") >= 0);
    }catch(e){ return false; }
  }

  function ensureStage7Flags(){
    if(typeof G === "undefined" || !G.map || !isStage7()) return;
    if(!G.stage7Flow){
      G.stage7Flow = {keyUsed:false, normalCircle:false, bossRushStarted:false, bossRushCleared:false, trueCircle:false, abyssStarted:false};
    }
  }

  function addCircle(kind){
    if(typeof G === "undefined" || !G.map) return;
    ensureStage7Flags();
    var circle = {
      id: kind === "true" ? "true_magic_circle" : "magic_circle",
      kind: kind || "normal",
      x: Math.floor((G.map.width || 860) / 2) - 24,
      y: Math.floor((G.map.height || 1600) * 0.34),
      w: 48,
      h: 48,
      label: kind === "true" ? "真の魔法陣" : "魔法陣"
    };
    G.map.magicCircles = G.map.magicCircles || [];
    if(!G.map.magicCircles.some(function(c){ return c.id === circle.id; })){
      G.map.magicCircles.push(circle);
    }
    G.message = circle.label + "が出現した！";
    G.map.objective = kind === "true" ? "真の魔法陣に乗る" : "魔法陣に乗る";
  }

  window.Stage7Flow = {
    onVoidKeyUsed:function(){
      if(!isStage7()) return;
      ensureStage7Flags();
      G.stage7Flow.keyUsed = true;
      G.stage7Flow.normalCircle = true;
      addCircle("normal");
    },
    onNormalCircleStep:function(){
      if(!isStage7()) return;
      ensureStage7Flags();
      G.stage7Flow.bossRushStarted = true;
      G.map.objective = "ボスラッシュを突破する";
      if(typeof window.startBossRush === "function") window.startBossRush();
      else if(typeof startBossRush === "function") startBossRush();
      else G.message = "ボスラッシュ開始！";
    },
    onBossRushClear:function(){
      if(!isStage7()) return;
      ensureStage7Flags();
      G.stage7Flow.bossRushCleared = true;
      G.stage7Flow.trueCircle = true;
      addCircle("true");
    },
    onTrueCircleStep:function(){
      if(!isStage7()) return;
      ensureStage7Flags();
      G.stage7Flow.abyssStarted = true;
      G.map.objective = "アビス・オーバーロードを倒す";
      if(typeof window.startAbyssBattle === "function") window.startAbyssBattle();
      else if(typeof startAbyssBattle === "function") startAbyssBattle();
      else G.message = "アビス・オーバーロード出現！";
    }
  };

  setInterval(function(){ try{ ensureStage7Flags(); }catch(e){} }, 250);
  console.log("stage7FlowPatch loaded:", window.__stage7FlowPatchVersion);
})();
