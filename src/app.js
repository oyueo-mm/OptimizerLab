import {OPTIMIZERS,LANDSCAPES,getOptimizer,getLandscape,simulate} from './engine.js';
import {SurfaceRenderer} from './renderer.js';
import {activePreviewEnd,previewFrame} from './preview.js';
const $=s=>document.querySelector(s);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number.isFinite(n)?Math.abs(n)>=100?n.toFixed(1):Math.abs(n)>=1?n.toFixed(3):n.toFixed(5):'—';
const navItems=[['home','⌂','홈'],['catalog','▦','도감'],['experiment','◉','실험실'],['compare','◫','비교'],['lineage','⌁','계보']];
const DEFAULT_COMP=['sgd','momentum','adam','adamw'];
const state={page:'home',sidebar:false,mobile:false,mode:'3d',optimizer:'adam',landscape:'wavy',start:{...LANDSCAPES[0].start},lr:getOptimizer('adam').defaults.lr,momentum:0.9,beta1:0.9,beta2:0.999,weightDecay:0.01,steps:180,speed:18,vectors:false,settingsOpen:false,position:0,playing:false,filter:'전체',query:'',compare:[...DEFAULT_COMP]};
const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderers=[],series=[],lastTime=0,lastPreview=0,previewTime=0,observer=null;
const choice=(a,b,selected)=>'<option value="'+a+'"'+(a===selected?' selected':'')+'>'+safe(b)+'</option>';
function getOptions(override={}){return {lr:state.lr,momentum:state.momentum,beta1:state.beta1,beta2:state.beta2,weightDecay:state.weightDecay,steps:state.steps,...override};}
function recompute(){
  const field=getLandscape(state.landscape);
  series=(state.page==='compare'?state.compare:[state.optimizer]).map(id=>{
    const algo=getOptimizer(id),lr=state.page==='compare'?Math.min(algo.defaults.lr,['sgd','momentum','nesterov'].includes(id)?Math.max(0.008,field.lr):Infinity):state.lr;
    return {...simulate(id,field,state.start,getOptions({lr})),color:algo.color,name:algo.name};
  });
  state.position=0;state.playing=false;
}
function maxStep(){return Math.max(0,...series.map(s=>s.history.length-1));}
function appChrome(content){
  const title=({home:'홈',catalog:'도감',experiment:'실험실',compare:'비교',detail:getOptimizer(state.optimizer).name,lineage:'계보'})[state.page];
  const nav=navItems.map(([id,ico,label])=>'<button class="nav-button '+(state.page===id||(state.page==='detail'&&id==='catalog')?'active':'')+'" data-nav="'+id+'" title="'+label+'"><span class="nav-icon">'+ico+'</span><span class="nav-label">'+label+'</span></button>').join('');
  const top=state.page==='home'?'':'<header class="topbar"><div style="display:flex;align-items:center;gap:10px"><button class="btn ghost icon mobile-menu" data-mobile aria-label="메뉴 열기">☰</button><span class="topbar-title">'+safe(title)+'</span></div></header>';
  const mobile=state.page==='home'?'<button class="btn ghost icon home-mobile-menu" data-mobile aria-label="메뉴 열기">☰</button>':'';
  return '<div class="app-shell"><aside class="sidebar '+(state.sidebar?'collapsed ':'')+(state.mobile?'open':'')+'"><div class="brand"><span class="brand-icon">O</span><span class="brand-title">OptimizerLab</span></div><nav>'+nav+'</nav><button class="sidebar-collapse" data-sidebar title="사이드바 접기/펼치기">☰</button></aside><main class="main">'+top+'<div class="page">'+mobile+content+'</div></main></div>';
}
function home(){
  const cards=['sgd','momentum','adamw','adam'];
  return '<section class="home"><div class="home-copy"><h1>OptimizerLab</h1><p class="lead">최적화 알고리즘 도감</p></div><div class="home-showcase">'+cards.map((id,i)=>{const a=getOptimizer(id);return '<button class="hero-card" data-open="'+id+'"><h3>'+a.name+'</h3><canvas data-preview="'+id+'" data-preview-land="'+['ravine','wavy','rosenbrock','bowl'][i]+'" aria-label="'+a.name+' 궤적 미리보기"></canvas></button>';}).join('')+'</div></section>';
}
function catalogCard(a){
  return '<button class="catalog-card" data-open="'+a.id+'"><canvas data-preview="'+a.id+'" data-preview-land="wavy" aria-label="'+a.name+' 애니메이션"></canvas><div class="catalog-name">'+a.name+'</div></button>';
}
function catalog(){
  const categories=['전체',...new Set(OPTIMIZERS.map(a=>a.family))];
  const list=OPTIMIZERS.filter(a=>(state.filter==='전체'||a.family===state.filter)&&(a.name+' '+a.family+' '+a.description).toLowerCase().includes(state.query.toLowerCase()));
  return '<div class="page-header"><h1>도감</h1></div><div class="catalog-toolbar"><div class="chips">'+categories.map(c=>'<button class="chip '+(state.filter===c?'active':'')+'" data-filter="'+safe(c)+'">'+safe(c)+'</button>').join('')+'</div><label class="search"><span>⌕</span><input data-search placeholder="옵티마이저 검색" value="'+safe(state.query)+'" aria-label="도감 검색"></label></div><div class="catalog-grid">'+(list.length?list.map(catalogCard).join(''):'<div class="empty">검색 결과가 없습니다.</div>')+'</div>';
}
function visual(){
  const field=getLandscape(state.landscape);
  return '<section class="visual-panel"><div class="visual-top"><div><div class="visual-title">'+field.name+'</div><div class="visual-subtitle">'+field.subtitle+'</div></div><button class="btn tiny" data-vectors title="기울기 및 업데이트 방향 보기">벡터 '+(state.vectors?'✓':'')+'</button><button class="btn tiny settings-toggle" data-settings-toggle aria-controls="settings-overlay" aria-expanded="'+state.settingsOpen+'" title="시뮬레이션 설정 열기">⚙ 설정</button><div class="toggle" role="group" aria-label="시각화 모드"><button data-mode="2d" class="'+(state.mode==='2d'?'active':'')+'">2D</button><button data-mode="3d" class="'+(state.mode==='3d'?'active':'')+'">3D</button></div></div><div class="canvas-wrap"><canvas id="main-canvas" aria-label="시작점을 클릭으로 배치하는 최적화 손실 지형"></canvas><span class="canvas-hint">'+(state.mode==='3d'?'클릭: 시작점 · 드래그: 회전 · 휠: 확대':'클릭: 시작점 · 휠: 확대')+'</span><div class="canvas-corner"><button class="floating-button" data-fullscreen title="캔버스 전체 화면" aria-label="캔버스 전체 화면">⛶</button><button class="floating-button" data-camera="reset" title="카메라 초기화">⤾</button></div></div><div id="legend" class="legend">'+series.map(s=>'<span class="legend-item"><span class="dot" style="background:'+s.color+'"></span>'+s.name+'</span>').join('')+'</div><div class="playbar"><button data-reset title="처음으로">↺</button><button data-prev title="한 단계 뒤로">⟨</button><button class="play" data-play title="재생/일시정지">'+(state.playing?'Ⅱ':'▶')+'</button><button data-next title="한 단계 앞으로">⟩</button><input type="range" data-frame min="0" max="'+maxStep()+'" value="'+Math.floor(state.position)+'" aria-label="단계 위치"><span class="steps" data-step-label>0 / '+maxStep()+'</span></div></section>';
}
function settings(){
  return '<div class="settings-overlay" id="settings-overlay" data-settings-overlay'+(state.settingsOpen?'':' hidden')+'><button type="button" class="settings-backdrop" data-settings-close aria-label="설정 닫기"></button><aside class="control-panel settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title"><h2 class="panel-heading" id="settings-title">시뮬레이션 설정 <button type="button" class="btn tiny" data-settings-close aria-label="설정 닫기">닫기 ×</button></h2><div class="field"><div class="field-top"><span>손실 함수</span></div><select data-setting="landscape">'+LANDSCAPES.map(l=>choice(l.id,l.name,state.landscape)).join('')+'</select></div><div class="field">'+(state.page==='compare'?'<div class="field-top"><span>옵티마이저</span><strong>다중 비교</strong></div><p class="note" style="margin-top:0">각 알고리즘의 권장 초기 학습률 사용</p>':'<div class="field-top"><span>옵티마이저</span></div><select data-setting="optimizer">'+OPTIMIZERS.map(a=>choice(a.id,a.name,state.optimizer)).join('')+'</select>')+'</div>'+(state.page==='compare'?'':'<div class="field slider-block"><div class="field-top"><span>학습률</span><strong data-value="lr">'+number(state.lr)+'</strong></div><input type="range" data-setting="lr" min="-4" max="0.20" step=".02" value="'+Math.log10(state.lr)+'" aria-label="학습률, 로그 눈금"></div>')+'<div class="field slider-block"><div class="field-top"><span>최대 단계</span><strong data-value="steps">'+state.steps+'</strong></div><input type="range" data-setting="steps" min="30" max="400" step="10" value="'+state.steps+'"></div><div class="field slider-block"><div class="field-top"><span>재생 속도</span><strong data-value="speed">'+state.speed+' 단계/초</strong></div><input type="range" data-setting="speed" min="1" max="200" step="1" value="'+state.speed+'"></div><div class="field slider-block"><div class="field-top"><span>모멘텀 / β₁</span><strong data-value="momentum">'+state.momentum.toFixed(2)+'</strong></div><input type="range" data-setting="momentum" min="0" max=".99" step=".01" value="'+state.momentum+'"></div><div class="field slider-block"><div class="field-top"><span>β₂</span><strong data-value="beta2">'+state.beta2.toFixed(3)+'</strong></div><input type="range" data-setting="beta2" min=".8" max=".999" step=".001" value="'+state.beta2+'"></div><div class="field slider-block"><div class="field-top"><span>가중치 감쇠 (AdamW / Lion)</span><strong data-value="weightDecay">'+state.weightDecay.toFixed(3)+'</strong></div><input type="range" data-setting="weightDecay" min="0" max=".3" step=".005" value="'+state.weightDecay+'"></div><div class="control-buttons"><button class="btn tiny" data-reset>초기화</button><button class="btn tiny" data-place-default>시작점 복원</button></div><p class="note">손실 함수의 가로·세로축은 파라미터 θ₁, θ₂입니다. 높이는 손실값이며, 공은 중력이 아닌 최적화 수식대로 이동합니다.</p></aside></div>';
}
function metrics(){
  return '<div class="metrics"><div class="metric-panel"><div class="metric-label">현재 손실값</div><div class="metric-number" data-metric="loss">—</div></div><div class="metric-panel"><div class="metric-label">기울기 크기</div><div class="metric-number" data-metric="gradient">—</div></div><div class="metric-panel"><div class="metric-label">현재 단계</div><div class="metric-number" data-metric="step">0</div></div></div><div class="loss-panel"><div class="loss-panel-heading">손실 변화</div><canvas id="loss-canvas" aria-label="손실값 변화 그래프"></canvas></div>';
}
function drawLossChart(){
  const canvas=$('#loss-canvas');if(!canvas||!series.length)return;
  const width=Math.max(200,canvas.clientWidth||200),height=Math.max(90,canvas.clientHeight||90),dpr=Math.min(window.devicePixelRatio||1,2);
  if(canvas.width!==Math.round(width*dpr)||canvas.height!==Math.round(height*dpr)){canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);}
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,width,height);
  const values=series.flatMap(s=>s.history.map(p=>p.loss)).filter(Number.isFinite);if(!values.length)return;
  const lower=Math.min(...values),upper=Math.max(...values),span=Math.max(1e-8,upper-lower),left=9,right=width-10,top=9,bottom=height-13;
  const x=i=>left+i/Math.max(1,maxStep())*(right-left),y=v=>bottom-(v-lower)/span*(bottom-top);
  g.strokeStyle='rgba(107,129,151,.14)';g.lineWidth=1;
  for(let i=0;i<4;i++){const gy=top+(bottom-top)*i/3;g.beginPath();g.moveTo(left,gy);g.lineTo(right,gy);g.stroke();}
  for(const s of series){
    const history=s.history;if(!history.length)continue;
    g.beginPath();for(let i=0;i<history.length;i++){if(i===0)g.moveTo(x(i),y(history[i].loss));else g.lineTo(x(i),y(history[i].loss));}g.strokeStyle=s.color;g.globalAlpha=.2;g.lineWidth=1.65;g.stroke();
    const count=Math.min(history.length-1,Math.floor(state.position));g.beginPath();for(let i=0;i<=count;i++){if(i===0)g.moveTo(x(i),y(history[i].loss));else g.lineTo(x(i),y(history[i].loss));}g.strokeStyle=s.color;g.globalAlpha=1;g.lineWidth=2.2;g.stroke();
    g.beginPath();g.arc(x(count),y(history[count].loss),3.5,0,Math.PI*2);g.fillStyle=s.color;g.fill();
  }
  g.globalAlpha=1;
}
function details(){
  const a=getOptimizer(state.optimizer);
  return '<div class="page-header"><div><h1>'+a.name+'</h1><p class="page-description">'+a.family+' · '+a.year+'</p></div><div class="header-actions"><button class="btn" data-nav="catalog">← 도감</button><button class="btn" data-nav="compare">비교하기 ↗</button></div></div><div class="work-grid"><div>'+visual()+metrics()+'<article class="info-panel"><h3>작동 원리</h3><p>'+a.description+'</p><div class="formula">'+safe(a.formula)+'</div><p class="note">모든 점은 동일한 손실 함수의 실제 업데이트로 계산합니다. 화면의 중간 움직임은 단계 간 시각적 보간입니다.</p></article></div>'+settings()+'</div>';
}
function experiment(){
  return '<div class="page-header"><div><h1>실험실</h1><p class="page-description">지형 위에 시작점을 놓고 최적화 경로를 관찰하세요.</p></div><div class="header-actions"><button class="btn" data-nav="compare">4개 동시 비교 ↗</button></div></div><div class="work-grid"><div>'+visual()+metrics()+'</div>'+settings()+'</div>';
}
function compare(){
  const rows=series.map(s=>{const last=s.history.at(-1)||{};return '<tr><td><span class="dot" style="background:'+s.color+'"></span>'+s.name+'</td><td>'+number(last.loss)+'</td><td>'+(s.history.length-1)+'</td><td>'+({complete:'완료',converged:'수렴',diverged:'발산'}[s.status]||'—')+'</td></tr>';}).join('');
  return '<div class="page-header"><div><h1>비교</h1><p class="page-description">동일한 시작점·손실 함수에서 최대 4개 옵티마이저의 경로를 비교합니다.</p></div></div><div class="compare-selection">'+OPTIMIZERS.map(a=>'<button class="compare-pill '+(state.compare.includes(a.id)?'active':'')+'" data-compare="'+a.id+'"><span class="bullet" style="background:'+a.color+'"></span>'+a.name+(state.compare.includes(a.id)?' ✓':'')+'</button>').join('')+'</div><div class="work-grid"><div>'+visual()+metrics()+'<article class="info-panel"><h3>최종 단계 비교</h3><table class="compare-results"><thead><tr><th>옵티마이저</th><th>손실값</th><th>단계</th><th>상태</th></tr></thead><tbody>'+rows+'</tbody></table><p class="note">비교 시 각 옵티마이저의 권장 초기 학습률을 사용합니다. 성능 순위가 아닌 동작 탐구를 위한 비교이며, 공정한 성능 평가는 개별 하이퍼파라미터 탐색이 필요합니다.</p></article></div>'+settings()+'</div>';
}
function lineage(){
  const rows=[['sgd'],['momentum','adagrad','rmsprop'],['nesterov','adam','adadelta'],['nadam','adamw','adamax','amsgrad','lion']];
  return '<div class="page-header"><div><h1>계보</h1><p class="page-description">최적화 방법의 개념적 관계와 계열을 탐색합니다.</p></div></div><div class="lineage">'+rows.map((row,i)=>(i?'<div class="lineage-arrow">↓</div>':'')+'<div class="lineage-row">'+row.map(id=>{const a=getOptimizer(id);return '<button class="lineage-node" data-open="'+id+'">'+a.name+'<small>'+a.family+'</small></button>';}).join('')+'</div>').join('')+'</div><p class="note" style="text-align:center;margin-top:22px">위 연결은 이해를 돕는 개념적 구성입니다. 엄밀한 논문 인용 관계 또는 연대기 전체를 뜻하지 않습니다.</p>';
}
function viewContent(){if(state.page==='home')return home();if(state.page==='catalog')return catalog();if(state.page==='compare')return compare();if(state.page==='experiment')return experiment();if(state.page==='detail')return details();return lineage();}
function destroyRenderers(){
  if(observer){observer.disconnect();observer=null;}
  for(const rec of renderers)rec.renderer.destroy();renderers=[];
}
function mountPreview(){
  const canvases=[...document.querySelectorAll('[data-preview]')];
  if(!canvases.length)return;
  const catalog=state.page==='catalog';
  function activate(canvas){
    let rec=renderers.find(r=>r.canvas===canvas);
    if(rec){rec.visible=true;return;}
    const id=canvas.dataset.preview,field=getLandscape(canvas.dataset.previewLand||'wavy'),algo=getOptimizer(id);
    const trajectory=simulate(id,field,field.start,{lr:Math.min(algo.defaults.lr,field.lr*2),steps:catalog?120:100});
    const end=catalog?activePreviewEnd(trajectory.history):trajectory.history.length-1;
    const renderer=new SurfaceRenderer(canvas,{mode:'2d',field,preview:true,previewKind:catalog?'catalog':'home'});
    if(catalog)renderer.setPreviewPath(trajectory.history.slice(0,end+1));
    rec={renderer,canvas,visible:true,preview:true,catalog,activeEnd:end,elapsed:0,series:[{...trajectory,color:algo.color}]};
    renderers.push(rec);
    renderer.setFrame(rec.series,catalog?(prefersReduced?end:0):Math.min(trajectory.history.length-1,27));
  }
  observer=new IntersectionObserver(entries=>{
    for(const e of entries){if(e.isIntersecting)activate(e.target);else{const rec=renderers.find(r=>r.canvas===e.target);if(rec)rec.visible=false;}}
  },{rootMargin:'80px',threshold:0.01});
  for(const canvas of canvases)observer.observe(canvas);
}
function mountMain(){
  const canvas=$('#main-canvas');if(!canvas)return;
  const renderer=new SurfaceRenderer(canvas,{mode:state.mode,field:getLandscape(state.landscape),onPlace:pt=>{state.start=pt;recompute();redraw();const root=$('#legend');if(root)root.innerHTML=series.map(s=>'<span class="legend-item"><span class="dot" style="background:'+s.color+'"></span>'+s.name+'</span>').join('');}});
  renderers.push({renderer,canvas,preview:false,visible:true});renderer.showVectors=state.vectors;renderer.setFrame(series,state.position);updateMetrics();
}
function render(){
  destroyRenderers();if(state.page==='experiment'||state.page==='compare'||state.page==='detail')recompute();
  $('#app').innerHTML=appChrome(viewContent());mountMain();mountPreview();
  document.title=(state.page==='home'?'OptimizerLab':({catalog:'도감',experiment:'실험실',compare:'비교',detail:getOptimizer(state.optimizer).name,lineage:'계보'}[state.page]+' · OptimizerLab'));
}
function redraw(){
  const rec=renderers.find(r=>!r.preview);if(rec)rec.renderer.setFrame(series,state.position);
  const slider=$('[data-frame]');if(slider){slider.max=String(maxStep());slider.value=String(Math.floor(state.position));}
  const label=$('[data-step-label]');if(label)label.textContent=Math.floor(state.position)+' / '+maxStep();
  const play=$('[data-play]');if(play)play.textContent=state.playing?'Ⅱ':'▶';
  updateMetrics();
}
function updateMetrics(){
  const s=series[0];if(!s)return;
  const step=Math.min(Math.floor(state.position),s.history.length-1);
  const p=s.history[step]||s.history[0];if(!p)return;
  for(const [type,value] of [['loss',number(p.loss)],['gradient',number(p.norm)],['step',String(step)]]){const el=$('[data-metric="'+type+'"]');if(el)el.textContent=value;}
  drawLossChart();
}
function changeView(view){
  state.page=view;state.mobile=false;state.settingsOpen=false;state.playing=false;state.position=0;window.scrollTo({top:0,behavior:'instant'});render();
}
function chooseOptimizer(id){
  state.settingsOpen=false;state.optimizer=id;state.lr=getOptimizer(id).defaults.lr;state.page='detail';state.position=0;state.playing=false;render();
}
function updateSetting(k,v){
  if(k==='landscape'){const field=getLandscape(v);state.landscape=v;state.start={...field.start};state.lr=Math.min(getOptimizer(state.optimizer).defaults.lr,['sgd','momentum','nesterov'].includes(state.optimizer)?field.lr:Infinity);render();return;}
  if(k==='optimizer'){chooseOptimizer(v);return;}
  if(k==='speed'){state.speed=Number(v);const el=$('[data-value="speed"]');if(el)el.textContent=state.speed+' 단계/초';return;}
  if(k==='lr'){state.lr=10**Number(v);}
  else if(k==='momentum'){state.momentum=Number(v);state.beta1=state.momentum;}
  else if(k==='beta2'){state.beta2=Number(v);}
  else if(k==='weightDecay'){state.weightDecay=Number(v);}
  else if(k==='steps'){state.steps=Number(v);}
  const el=$('[data-value="'+k+'"]');if(el)el.textContent=k==='lr'?number(state.lr):k==='steps'?String(state.steps):Number(state[k]).toFixed(k==='beta2'||k==='weightDecay'?3:2);
  recompute();const legend=$('#legend');if(legend)legend.innerHTML=series.map(s=>'<span class="legend-item"><span class="dot" style="background:'+s.color+'"></span>'+s.name+'</span>').join('');redraw();
}
function setSettingsOpen(open){
  state.settingsOpen=!!open;
  const overlay=$('[data-settings-overlay]');if(overlay)overlay.hidden=!state.settingsOpen;
  const toggle=$('[data-settings-toggle]');if(toggle)toggle.setAttribute('aria-expanded',String(state.settingsOpen));
  if(state.settingsOpen){const first=overlay?.querySelector('.settings-drawer [data-settings-close]');first?.focus();}
  else if(toggle){toggle.focus();}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.nav){changeView(b.dataset.nav);return;}
  if(b.dataset.open){chooseOptimizer(b.dataset.open);return;}
  if(b.hasAttribute('data-sidebar')){state.sidebar=!state.sidebar;render();return;}
  if(b.hasAttribute('data-mobile')){state.mobile=!state.mobile;render();return;}
  if(b.hasAttribute('data-settings-toggle')){setSettingsOpen(!state.settingsOpen);return;}
  if(b.hasAttribute('data-settings-close')){setSettingsOpen(false);return;}
  if(b.hasAttribute('data-fullscreen')){const area=b.closest('.canvas-wrap');if(!document.fullscreenElement){area?.requestFullscreen?.();}else{document.exitFullscreen?.();}return;}
  if(b.hasAttribute('data-vectors')){state.vectors=!state.vectors;const rec=renderers.find(x=>!x.preview);if(rec)rec.renderer.setVectors(state.vectors);b.textContent='벡터 '+(state.vectors?'✓':'');b.classList.toggle('selected',state.vectors);return;}
  if(b.dataset.mode){state.mode=b.dataset.mode;const rec=renderers.find(r=>!r.preview);if(rec)rec.renderer.setMode(state.mode);for(const btn of document.querySelectorAll('[data-mode]'))btn.classList.toggle('active',btn.dataset.mode===state.mode);const hint=$('.canvas-hint');if(hint)hint.textContent=state.mode==='3d'?'클릭: 시작점 · 드래그: 회전 · 휠: 확대':'클릭: 시작점 · 휠: 확대';return;}
  if(b.hasAttribute('data-play')){if(state.position>=maxStep())state.position=0;state.playing=!state.playing;redraw();return;}
  if(b.hasAttribute('data-reset')){state.playing=false;state.position=0;redraw();return;}
  if(b.hasAttribute('data-next')){state.playing=false;state.position=Math.min(maxStep(),Math.floor(state.position)+1);redraw();return;}
  if(b.hasAttribute('data-prev')){state.playing=false;state.position=Math.max(0,Math.floor(state.position)-1);redraw();return;}
  if(b.hasAttribute('data-place-default')){state.start={...getLandscape(state.landscape).start};recompute();redraw();return;}
  if(b.dataset.camera){const rec=renderers.find(r=>!r.preview);if(rec){rec.renderer.yaw=.68;rec.renderer.pitch=.73;rec.renderer.zoom=1;rec.renderer.invalidate();rec.renderer.draw();}return;}
  if(b.dataset.filter){state.filter=b.dataset.filter;render();return;}
  if(b.dataset.compare){
    const id=b.dataset.compare,has=state.compare.includes(id);
    if(has&&state.compare.length>1)state.compare=state.compare.filter(x=>x!==id);
    else if(!has&&state.compare.length<4)state.compare.push(id);
    render();return;
  }
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.matches('[data-setting]')&&t.tagName==='INPUT'){updateSetting(t.dataset.setting,t.value);return;}
  if(t.matches('[data-frame]')){state.position=Number(t.value);state.playing=false;redraw();return;}
  if(t.matches('[data-search]')){
    const sel=t.selectionStart;state.query=t.value;render();
    const fresh=$('[data-search]');if(fresh){fresh.focus();fresh.setSelectionRange(sel,sel);}return;
  }
});
document.addEventListener('change',e=>{const t=e.target;if(t.matches('select[data-setting]'))updateSetting(t.dataset.setting,t.value);});
window.addEventListener('keydown',e=>{
  if(e.code==='Space'&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName)&&(state.page==='experiment'||state.page==='detail'||state.page==='compare')){e.preventDefault();state.playing=!state.playing;redraw();}
  if(e.code==='Escape'&&state.settingsOpen){setSettingsOpen(false);return;}
  if(e.code==='Escape'&&state.mobile){state.mobile=false;render();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.playing=false;}lastTime=0;});
function tick(now){
  const dt=lastTime?Math.min(.1,(now-lastTime)/1000):0;lastTime=now;
  if(!document.hidden){
    if(state.playing){
      state.position=Math.min(maxStep(),state.position+dt*state.speed);
      if(state.position>=maxStep())state.playing=false;
      redraw();
    }
    if(!prefersReduced&&now-lastPreview>45){
      const elapsed=lastPreview?Math.min(.12,(now-lastPreview)/1000):0;
      lastPreview=now;previewTime+=Math.min(.12,dt);
      let used=0;
      for(const rec of renderers){
        if(!rec.preview||!rec.visible||used>=(rec.catalog?20:8))continue;
        if(rec.catalog){rec.elapsed+=elapsed;rec.renderer.setFrame(rec.series,previewFrame(rec.elapsed,rec.activeEnd));}
        else{const len=rec.series[0].history.length-1;rec.renderer.setFrame(rec.series,(previewTime*10)%Math.max(1,len));}
        used++;
      }
    }
  }
  requestAnimationFrame(tick);
}
render();requestAnimationFrame(tick);
