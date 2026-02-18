// app.js
const $ = (s)=>document.querySelector(s);

const LIKERT = [
  {v:1, t:"非常不同意"},
  {v:2, t:"不同意"},
  {v:3, t:"普通"},
  {v:4, t:"同意"},
  {v:5, t:"非常同意"},
];

const state = {
  queue: [],
  answers: new Map(),
  idx: 0,
  used: { RL:new Set(), SE:new Set(), HA:new Set(), FG:new Set() },
  phase: "GTI-12",
};

function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function scoreItem(item, x){
  return item.reverse ? (6 - x) : x;
}

function computeDimStats(){
  const dims = { RL:[], SE:[], HA:[], FG:[] };
  for(const item of state.queue){
    const x = state.answers.get(item.id);
    if(!x) continue;
    dims[item.dim].push(scoreItem(item, x));
  }

  const mean = {};
  const n = {};
  for(const d of Object.keys(dims)){
    n[d] = dims[d].length;
    mean[d] = n[d] ? (dims[d].reduce((a,b)=>a+b,0)/n[d]) : 3;
  }

  const stability = (Math.abs(mean.RL-3)+Math.abs(mean.SE-3)+Math.abs(mean.HA-3)+Math.abs(mean.FG-3))/4;

  const uncertain = {};
  for(const d of ["RL","SE","HA","FG"]){
    uncertain[d] = Math.abs(mean[d]-3) < 0.35;
  }

  return { mean, n, stability, uncertain };
}

const ELEMENTS = {
  "星潮-守護": { zh:"氫", en:"Hydrogen", symbol:"H" },
  "星潮-建構": { zh:"碳", en:"Carbon",   symbol:"C" },
  "星潮-調和": { zh:"氖", en:"Neon",     symbol:"Ne" },

  "日曜-守護": { zh:"氧", en:"Oxygen",   symbol:"O" },
  "日曜-建構": { zh:"鐵", en:"Iron",     symbol:"Fe" },
  "日曜-調和": { zh:"鈉", en:"Sodium",   symbol:"Na" },

  "月影-守護": { zh:"銀", en:"Silver",   symbol:"Ag" },
  "月影-建構": { zh:"矽", en:"Silicon",  symbol:"Si" },
  "月影-調和": { zh:"氬", en:"Argon",    symbol:"Ar" },

  "符紋-守護": { zh:"鈣", en:"Calcium",  symbol:"Ca" },
  "符紋-建構": { zh:"鈦", en:"Titanium", symbol:"Ti" },
  "符紋-調和": { zh:"銅", en:"Copper",   symbol:"Cu" },
};

function addAdaptiveQuestions(){
  const { n, stability, uncertain } = computeDimStats();

  if(Object.values(uncertain).every(v=>v===false)) return false;
  if(state.queue.length >= 120) return false;

  const perDim = (stability < 0.45) ? 3 : 2;

  let added = 0;
  for(const d of ["RL","SE","HA","FG"]){
    if(n[d] >= 30) continue;
    if(!uncertain[d]) continue;

    const pool = window.GTI_BANK.pools[d] || [];
    const candidates = pool.filter(q => !state.used[d].has(q.id));
    const pick = shuffle(candidates).slice(0, perDim);

    for(const q of pick){
      state.queue.push(q);
      state.used[d].add(q.id);
      added++;
      if(state.queue.length >= 120) break;
    }
  }

  state.phase = "正在進行 A.V.B 心理校準…";
  return added > 0;
}

function typeFromScores(mean){
  const pct = (m)=>Math.round(((m-1)/4)*100);

  const hi = (m)=> (m>=3.2) ? true : (m<=2.8) ? false : (m>=3);

  const R = hi(mean.RL);
  const S = hi(mean.SE);

  const M = mean.HA - mean.FG;
  const mode = (M>=0.4) ? "守護" : (M<=-0.4) ? "建構" : "調和";

  const quad = (R && S) ? "星潮" : (R && !S) ? "日曜" : (!R && S) ? "月影" : "符紋";
  const full = `${quad}-${mode}`;

  const oneLinerMap = {
    "星潮-守護":"你用靈感連結人心，也傾向先守護關係再推動改變。",
    "星潮-建構":"你把想像變成路線圖，喜歡用結構讓願景落地。",
    "星潮-調和":"你能在混沌裡找秩序，擅長把創意協作拉回可行。",

    "日曜-守護":"你用溫度推動事情，既要前進也要顧人。",
    "日曜-建構":"你走在前面讓事完成，偏好清楚目標與強執行。",
    "日曜-調和":"你讓節奏剛剛好，務實協作、穩定推進。",

    "月影-守護":"你安靜但很懂人，深度共感、容易替人撐著。",
    "月影-建構":"你在夜裡整理星圖，擅長把直覺變成系統洞察。",
    "月影-調和":"你用靜默聽見答案，會先做小實驗再決定方向。",

    "符紋-守護":"你用細節守護重要的人，可靠、細緻、有溫度。",
    "符紋-建構":"你把生活刻成符文，穩健耐心、一步步把事做成。",
    "符紋-調和":"你不喧嘩但很穩，低耗能高產出，常被低估。",
  };

  return {
    full,
    oneLiner: oneLinerMap[full] || "你的結果已生成。",
    RL: pct(mean.RL), SE: pct(mean.SE), HA: pct(mean.HA), FG: pct(mean.FG),
    mode,
  };
}

function render(){
  const total = state.queue.length;
  const i = state.idx;

  $("#pct").textContent = `${Math.min(i+1,total)}/${total}`;
  $("#bar").style.width = `${Math.round(((i)/Math.max(1,total))*100)}%`;

  const item = state.queue[i];
  $("#phase").textContent = state.phase;

  $("#qText").textContent = item.text;
  $("#choices").innerHTML = "";

  const chosen = state.answers.get(item.id) || 0;
  for(const opt of LIKERT){
    const div = document.createElement("div");
    div.className = "choice" + (opt.v===chosen ? " active" : "");
    div.innerHTML = `<div>${opt.t}</div><small>(${opt.v})</small>`;
    div.onclick = ()=>{
      state.answers.set(item.id, opt.v);
      render();
    };
    $("#choices").appendChild(div);
  }

  $("#btnBack").disabled = (i===0);
  $("#btnNext").textContent = (i===total-1) ? "生成我的結果" : "下一題 →";

  const { n, stability, uncertain } = computeDimStats();
  const unsureDims = Object.entries(uncertain).filter(([,v])=>v).map(([k])=>k).join(", ");
  $("#micro").textContent =
    (state.phase==="GTI-12")
      ? "提示：做完 12 題後，若落在邊界，會自動補問校準。"
      : (unsureDims ? `校準中：邊界向度 ${unsureDims}（已答 RL:${n.RL} SE:${n.SE} HA:${n.HA} FG:${n.FG}）` : "校準完成，準備生成結果。");
}

function show(el){ el.classList.remove("hidden"); }
function hide(el){ el.classList.add("hidden"); }

function start(){
  state.queue = [...window.GTI_BANK.core12];
  state.answers = new Map();
  state.idx = 0;
  state.used = { RL:new Set(), SE:new Set(), HA:new Set(), FG:new Set() };
  state.phase = "GTI-12";

  hide($("#start"));
  hide($("#result"));
  show($("#quiz"));
  render();
}

function next(){
  const item = state.queue[state.idx];
  if(!state.answers.get(item.id)){
    $("#micro").textContent = "請先選一個選項再前進。";
    return;
  }

  if(state.idx === state.queue.length - 1){
    const added = addAdaptiveQuestions();
    if(added){
      render();
      return;
    }
    finish();
    return;
  }

  state.idx++;
  render();
}

function back(){
  if(state.idx>0){
    state.idx--;
    render();
  }
}

function finish(){
  const { mean, stability, uncertain } = computeDimStats();
  const t = typeFromScores(mean);

  hide($("#quiz"));
  show($("#result"));

  const el = ELEMENTS[t.full] || { zh:"—", en:"—", symbol:"" };
  $("#elementBadge").textContent = `人格元素：${el.zh}${el.symbol ? "（"+el.symbol+"）" : ""} · ${el.en}`;
  $("#modeBadge").textContent = `模式：${t.mode}`;
  $("#stabilityBadge").textContent = `題數：${state.queue.length} / 120`;

  $("#rTitle").textContent = `你的心理類型：${t.full.replace("-", "－")}`;
  $("#rOneLiner").textContent = t.oneLiner;

  const setBar = (id, val)=>{ $(id).style.width = `${val}%`; };
  setBar("#mRL", t.RL); setBar("#mSE", t.SE); setBar("#mHA", t.HA); setBar("#mFG", t.FG);

  $("#tRL").textContent = `分數 ${t.RL}/100 · ${(mean.RL>=3)?"偏 R（外放）":"偏 L（內收）"}`;
  $("#tSE").textContent = `分數 ${t.SE}/100 · ${(mean.SE>=3)?"偏 S（象徵）":"偏 E（證據）"}`;
  $("#tHA").textContent = `分數 ${t.HA}/100 · ${(mean.HA>=3)?"偏 H（共感）":"偏 A（分析）"}`;
  $("#tFG").textContent = `分數 ${t.FG}/100 · ${(mean.FG>=3)?"偏 G（結構）":"偏 F（流動）"}`;

  const unsure = Object.entries(uncertain).filter(([,v])=>v).map(([k])=>k);
  const label = (stability>=0.75) ? "高" : (stability>=0.55) ? "中" : "低";
  $("#clarityText").textContent =
    `穩定度：${label}（${stability.toFixed(2)}）。`
    + (unsure.length ? ` 邊界向度：${unsure.join(", ")}（代表你在兩端之間更靈活；若想更穩，可再做更長版/更多題）。` : " 類型相對穩定。");

  $("#btnCopy").onclick = async ()=>{
    const url = location.href;
    const text = `我剛做了 GTI—人類心理 A.V.B 測驗（人格心理類型測驗）！\n結果：${t.full.replace("-", "－")}\n人格元素：${el.zh}${el.symbol ? "（"+el.symbol+"）" : ""} · ${el.en}\n一句話：${t.oneLiner}\n快來測：${url}`;
    try{ await navigator.clipboard.writeText(text); alert("已複製分享文案！"); }
    catch(e){ prompt("你的瀏覽器不允許自動複製，請手動複製：", text); }
  };

  $("#btnRestart").onclick = start;
}

$("#btnStart").onclick = start;
$("#btnNext").onclick = next;
$("#btnBack").onclick = back;
