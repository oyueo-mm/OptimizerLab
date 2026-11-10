import {OPTIMIZERS,LANDSCAPES,getOptimizer,getLandscape,simulate} from './engine.js';
import {SurfaceRenderer} from './renderer.js';
import {activePreviewEnd,previewFrame,homePreviewChoice} from './preview.js';
import {homePreviewStart} from './home-starts.js';
const $=s=>document.querySelector(s);
const safe=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number.isFinite(n)?Math.abs(n)>=100?n.toFixed(1):Math.abs(n)>=1?n.toFixed(3):n.toFixed(5):'—';
const navItems=[['home','⌂','홈'],['catalog','▦','도감'],['experiment','◉','실험실'],['compare','◫','비교'],['lineage','⌁','계보']];
const DEFAULT_COMP=['sgd','momentum','nesterov','adagrad','adam','adamw'];
const MAX_COMPARE=6;
const COMPARE_COLORS=['#2563eb','#ea8b35','#8b5cf6','#0891b2','#16a34a','#db2777'];
const SETTINGS_KEYS=['optimizer','landscape','lr','momentum','beta1','beta2','weightDecay','steps','speed'];
const HOME_FIRST_ALGORITHMS=['sgd','momentum','adamw','adam'];
const HOME_FIRST_MAPS=['erosionMountains','twistedCanyon','falseBasin','isolatedWells'];
const HOME_ALGORITHMS=[...HOME_FIRST_ALGORITHMS,...OPTIMIZERS.map(a=>a.id).filter(id=>!HOME_FIRST_ALGORITHMS.includes(id))];
const HOME_MAPS=[...HOME_FIRST_MAPS,...LANDSCAPES.map(f=>f.id).filter(id=>!HOME_FIRST_MAPS.includes(id))];
const HOME_MOVE_SECONDS=4.2,HOME_HOLD_SECONDS=.7;
const state={page:'home',sidebar:false,mobile:false,mode:'3d',optimizer:'adam',landscape:'wavy',start:{...LANDSCAPES[0].start},lr:getOptimizer('adam').defaults.lr,momentum:0.9,beta1:0.9,beta2:0.999,weightDecay:0.01,steps:180,speed:18,vectors:false,settingsOpen:false,settingsDraft:null,position:0,playing:false,filter:'전체',query:'',compare:[...DEFAULT_COMP],compareDraft:null};
const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderers=[],series=[],lastTime=0,lastPreview=0,previewTime=0,observer=null;
const choice=(a,b,selected)=>'<option value="'+a+'"'+(a===selected?' selected':'')+'>'+safe(b)+'</option>';
function getOptions(override={}){return {lr:state.lr,momentum:state.momentum,beta1:state.beta1,beta2:state.beta2,weightDecay:state.weightDecay,steps:state.steps,bounds:'stop',...override};}
function recompute(){
  const field=getLandscape(state.landscape);
  series=(state.page==='compare'?state.compare:[state.optimizer]).map(id=>{
    const algo=getOptimizer(id),lr=state.page==='compare'?Math.min(algo.defaults.lr,['sgd','momentum','nesterov'].includes(id)?Math.max(0.008,field.lr):Infinity):state.lr;
    return {...simulate(id,field,state.start,getOptions({lr})),color:state.page==='compare'?COMPARE_COLORS[state.compare.indexOf(id)%MAX_COMPARE]:algo.color,name:algo.name};
  });
  state.position=0;state.playing=false;
}
function maxStep(){return Math.max(0,...series.map(s=>s.history.length-1));}
function appChrome(content){
  const title=({home:'홈',catalog:'도감',experiment:'실험실',compare:'비교',detail:getOptimizer(state.optimizer).name,lineage:'계보'})[state.page];
  const nav=navItems.map(([id,ico,label])=>'<button class="nav-button '+(state.page===id||(state.page==='detail'&&id==='catalog')?'active':'')+'" data-nav="'+id+'" title="'+label+'"><span class="nav-icon">'+ico+'</span><span class="nav-label">'+label+'</span></button>').join('');
  const compact=['detail','experiment','compare'].includes(state.page);
  const top=state.page==='home'||compact?'':'<header class="topbar"><div style="display:flex;align-items:center;gap:10px"><button class="btn ghost icon mobile-menu" data-mobile aria-label="메뉴 열기">☰</button><span class="topbar-title">'+safe(title)+'</span></div></header>';
  const mobile=state.page==='home'?'<button class="btn ghost icon home-mobile-menu" data-mobile aria-label="메뉴 열기">☰</button>':'';
  return '<div class="app-shell"><aside class="sidebar '+(state.sidebar?'collapsed ':'')+(state.mobile?'open':'')+'"><div class="brand"><span class="brand-icon">O</span><span class="brand-title">OptimizerLab</span><button class="sidebar-collapse" data-sidebar title="사이드바 접기/펼치기" aria-label="사이드바 접기/펼치기">'+(state.sidebar?'›':'‹')+'</button></div><nav>'+nav+'</nav></aside><main class="main">'+top+'<div class="page '+(compact?'workspace-page':'')+'">'+mobile+content+'</div></main></div>';
}
function home(){
  return '<section class="home"><div class="home-copy"><h1>OptimizerLab</h1><p class="lead">옵티마이저 도감</p></div><div class="home-showcase">'+HOME_FIRST_ALGORITHMS.map((unused,i)=>{const choice=homePreviewChoice(i,0,HOME_ALGORITHMS,HOME_MAPS),a=getOptimizer(choice.optimizerId),field=getLandscape(choice.landscapeId);return '<button class="hero-card" data-open="'+a.id+'"><div class="hero-card-heading"><h3>'+safe(a.name)+'</h3><span class="hero-map-name">'+safe(field.name)+'</span></div><canvas data-preview="'+a.id+'" data-preview-land="'+field.id+'" data-home-slot="'+i+'" aria-label="'+safe(a.name+' / '+field.name)+' 3D 궤적 미리보기"></canvas></button>';}).join('')+'</div></section>';
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
  const field=getLandscape(state.landscape),detail=state.page==='detail';
  const title=detail?getOptimizer(state.optimizer).name:state.page==='compare'?'비교':'실험실';
  const back=detail?'<button class="btn tiny workspace-back" data-nav="catalog" title="도감으로 돌아가기">← 도감</button>':'';
  const compare=detail||state.page==='experiment'?'<button class="btn tiny workspace-compare" data-nav="compare" title="옵티마이저 비교하기">비교</button>':'';
  const menu='<button class="btn ghost icon mobile-menu workspace-mobile" data-mobile aria-label="메뉴 열기">☰</button>';
  const legend=state.page==='compare'?'<div id="legend" class="legend">'+series.map(s=>'<span class="legend-item"><span class="dot" style="background:'+s.color+'"></span>'+s.name+'</span>').join('')+'</div>':'<div id="legend" class="legend" hidden></div>';
  return '<section class="visual-panel"><div class="visual-top">'+menu+back+'<div class="workspace-heading"><span class="visual-title">'+safe(title)+'</span><span class="visual-landscape">'+safe(field.name)+'</span></div><div class="workspace-actions">'+compare+'<button class="btn tiny" data-vectors title="기울기 및 업데이트 방향 보기" aria-pressed="'+state.vectors+'">벡터'+(state.vectors?' ✓':'')+'</button><button class="btn tiny settings-toggle" data-settings-toggle aria-controls="settings-overlay" aria-expanded="'+state.settingsOpen+'" title="시뮬레이션 설정 열기">⚙ 설정</button><div class="toggle" role="group" aria-label="시각화 모드"><button data-mode="2d" class="'+(state.mode==='2d'?'active':'')+'">2D</button><button data-mode="3d" class="'+(state.mode==='3d'?'active':'')+'">3D</button></div></div></div><div class="canvas-wrap"><canvas id="main-canvas" title="'+(state.mode==='3d'?'클릭: 시작점 · 드래그: 회전 · 휠: 확대':'클릭: 시작점 · 휠: 확대')+'" aria-label="시작점을 클릭으로 배치하는 최적화 손실 지형"></canvas><div class="canvas-corner"><button class="floating-button" data-fullscreen title="캔버스 전체 화면" aria-label="캔버스 전체 화면">⛶</button><button class="floating-button" data-camera="reset" title="카메라 초기화" aria-label="카메라 초기화">⤾</button></div></div>'+legend+'<div class="playbar"><button data-reset title="처음으로" aria-label="처음으로">↺</button><button data-prev title="한 단계 뒤로" aria-label="한 단계 뒤로">⟨</button><button class="play" data-play title="재생/일시정지" aria-label="재생/일시정지">'+(state.playing?'Ⅱ':'▶')+'</button><button data-next title="한 단계 앞으로" aria-label="한 단계 앞으로">⟩</button><input type="range" data-frame min="0" max="'+maxStep()+'" value="'+Math.floor(state.position)+'" aria-label="단계 위치"><span class="steps" data-step-label>0 / '+maxStep()+'</span></div></section>';
}
function settings(){
  const form=state.settingsDraft||state;
  return '<div class="settings-overlay" id="settings-overlay" data-settings-overlay'+(state.settingsOpen?'':' hidden')+'><button type="button" class="settings-backdrop" data-settings-close aria-label="설정 닫기"></button><aside class="control-panel settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title"><h2 class="panel-heading" id="settings-title">시뮬레이션 설정 <button type="button" class="btn tiny" data-settings-close aria-label="설정 닫기">닫기 ×</button></h2><div class="field"><div class="field-top"><span>손실 함수</span></div><select data-setting="landscape">'+LANDSCAPES.map(l=>choice(l.id,l.name,form.landscape)).join('')+'</select></div><div class="field">'+(state.page==='compare'?'<div class="field-top"><span>옵티마이저</span><strong>다중 비교</strong></div><p class="note" style="margin-top:0">각 알고리즘의 권장 초기 학습률 사용</p>':'<div class="field-top"><span>옵티마이저</span></div><select data-setting="optimizer">'+OPTIMIZERS.map(a=>choice(a.id,a.name,form.optimizer)).join('')+'</select>')+'</div>'+(state.page==='compare'?'':'<div class="field slider-block"><div class="field-top"><span>학습률</span><strong data-value="lr">'+number(form.lr)+'</strong></div><input type="range" data-setting="lr" min="-4" max="0.20" step=".02" value="'+Math.log10(form.lr)+'" aria-label="학습률, 로그 눈금"></div>')+'<div class="field slider-block"><div class="field-top"><span>최대 단계</span><strong data-value="steps">'+form.steps+'</strong></div><input type="range" data-setting="steps" min="30" max="400" step="10" value="'+form.steps+'"></div><div class="field slider-block"><div class="field-top"><span>재생 속도</span><strong data-value="speed">'+form.speed+' 단계/초</strong></div><input type="range" data-setting="speed" min="1" max="200" step="1" value="'+form.speed+'"></div><div class="field slider-block"><div class="field-top"><span>모멘텀 / β₁</span><strong data-value="momentum">'+form.momentum.toFixed(2)+'</strong></div><input type="range" data-setting="momentum" min="0" max=".99" step=".01" value="'+form.momentum+'"></div><div class="field slider-block"><div class="field-top"><span>β₂</span><strong data-value="beta2">'+form.beta2.toFixed(3)+'</strong></div><input type="range" data-setting="beta2" min=".8" max=".999" step=".001" value="'+form.beta2+'"></div><div class="field slider-block"><div class="field-top"><span>가중치 감쇠 (AdamW / Lion)</span><strong data-value="weightDecay">'+form.weightDecay.toFixed(3)+'</strong></div><input type="range" data-setting="weightDecay" min="0" max=".3" step=".005" value="'+form.weightDecay+'"></div><div class="control-buttons settings-footer"><button type="button" class="btn" data-settings-close>취소</button><button type="button" class="btn primary" data-settings-apply>적용</button></div><p class="note">손실 함수의 가로·세로축은 파라미터 θ₁, θ₂입니다. 높이는 손실값이며, 공은 중력이 아닌 최적화 수식대로 이동합니다.</p></aside></div>';
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
  return '<div class="workspace-stage"><div class="work-grid"><div>'+visual()+'</div>'+settings()+'</div></div><div class="workspace-extras">'+metrics()+'<article class="info-panel"><h3>작동 원리</h3><p>'+a.description+'</p><div class="formula">'+safe(a.formula)+'</div></article></div>';
}
function experiment(){
  return '<div class="workspace-stage"><div class="work-grid"><div>'+visual()+'</div>'+settings()+'</div></div><div class="workspace-extras">'+metrics()+'</div>';
}
function compare(){
  const draft=state.compareDraft||state.compare;
  const rows=series.map(s=>{const last=s.history.at(-1)||{};return '<tr><td><span class="dot" style="background:'+s.color+'"></span>'+s.name+'</td><td>'+number(last.loss)+'</td><td>'+(s.history.length-1)+'</td><td>'+({complete:'완료',converged:'수렴',diverged:'발산',out_of_bounds:'범위 이탈'}[s.status]||'—')+'</td></tr>';}).join('');
  const choices=OPTIMIZERS.map(a=>{const index=draft.indexOf(a.id),selected=index>=0;return '<button type="button" '+(!selected&&draft.length>=MAX_COMPARE?'disabled ':'')+'class="compare-pill '+(selected?'active':'')+'" data-compare="'+a.id+'" aria-pressed="'+selected+'"><span class="bullet" style="background:'+(selected?COMPARE_COLORS[index]:a.color)+'"></span><span class="compare-name">'+a.name+'</span><span class="compare-check">'+(selected?'✓':'')+'</span></button>';}).join('');
  return '<div class="workspace-stage"><div class="work-grid"><div>'+visual()+'</div>'+settings()+'</div></div><div class="workspace-extras"><details class="compare-choices"><summary>비교 알고리즘 선택 ('+draft.length+'/'+MAX_COMPARE+')</summary><div class="compare-selection">'+choices+'</div><p class="compare-error" data-compare-error role="alert" hidden>비교할 알고리즘을 최소 1개 선택해 주세요.</p><div class="compare-actions"><span class="compare-note">최대 '+MAX_COMPARE+'개 선택 · 적용 전까지 비교 결과 유지</span><button type="button" class="btn" data-compare-cancel>취소</button><button type="button" class="btn primary" data-compare-apply>적용</button></div></details>'+metrics()+'<article class="info-panel"><h3>최종 단계 비교</h3><table class="compare-results"><thead><tr><th>옵티마이저</th><th>손실값</th><th>단계</th><th>상태</th></tr></thead><tbody>'+rows+'</tbody></table></article></div>';
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
function homePreviewSimulation(algorithmId,landscapeId){
  const algorithm=getOptimizer(algorithmId),field=getLandscape(landscapeId);
  const lr=Math.min(algorithm.defaults.lr,['adam','adamw'].includes(algorithmId)?Math.max(.04,field.lr*2):Math.max(.018,field.lr));
  const result=simulate(algorithm.id,field,homePreviewStart(algorithm.id,field),{lr,steps:100,bounds:'stop'});
  return {algorithm,field,series:[{...result,color:algorithm.color}],end:activePreviewEnd(result.history)};
}
function rotateHomePreview(rec){
  const choice=homePreviewChoice(rec.homeSlot,rec.homeTurn,HOME_ALGORITHMS,HOME_MAPS);
  const next=homePreviewSimulation(choice.optimizerId,choice.landscapeId);
  rec.activeEnd=next.end;rec.series=next.series;
  rec.canvas.dataset.preview=next.algorithm.id;rec.canvas.dataset.previewLand=next.field.id;
  rec.canvas.setAttribute('aria-label',next.algorithm.name+' / '+next.field.name+' 3D 궤적 미리보기');
  const card=rec.canvas.closest('.hero-card');
  if(card){card.dataset.open=next.algorithm.id;const name=card.querySelector('h3'),map=card.querySelector('.hero-map-name');if(name)name.textContent=next.algorithm.name;if(map)map.textContent=next.field.name;}
  rec.renderer.setScene(next.field,rec.series,0);
}
function mountPreview(){
  const canvases=[...document.querySelectorAll('[data-preview]')];
  if(!canvases.length)return;
  const catalog=state.page==='catalog';
  function activate(canvas){
    let rec=renderers.find(r=>r.canvas===canvas);
    if(rec){rec.visible=true;return;}
    const id=canvas.dataset.preview,field=getLandscape(canvas.dataset.previewLand||'wavy'),algo=getOptimizer(id);
    const lr=Math.min(algo.defaults.lr,field.lr*2);
    const simulation=catalog?simulate(id,field,field.start,{lr,steps:120,bounds:'stop'}):homePreviewSimulation(id,field.id);
    const trajectory=catalog?simulation:simulation.series[0],end=catalog?activePreviewEnd(trajectory.history):simulation.end;
    const renderer=new SurfaceRenderer(canvas,{mode:'3d',field,preview:true,previewKind:catalog?'catalog':'home'});
    rec={renderer,canvas,visible:true,preview:true,catalog,activeEnd:end,elapsed:0,homeSlot:catalog?null:Number(canvas.dataset.homeSlot),homeTurn:0,series:catalog?[{...trajectory,color:algo.color}]:simulation.series};
    renderers.push(rec);
    renderer.setFrame(rec.series,prefersReduced?end:0);
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
  state.page=view;state.mobile=false;state.settingsOpen=false;state.settingsDraft=null;state.compareDraft=null;state.playing=false;state.position=0;window.scrollTo({top:0,behavior:'instant'});render();
}
function chooseOptimizer(id){
  state.settingsOpen=false;state.settingsDraft=null;state.optimizer=id;state.lr=getOptimizer(id).defaults.lr;state.page='detail';state.position=0;state.playing=false;render();
}
function syncSettingsForm(){
  const draft=state.settingsDraft;if(!draft)return;
  for(const key of SETTINGS_KEYS){
    const control=$('[data-setting="'+key+'"]');
    if(control)control.value=String(key==='lr'?Math.log10(draft.lr):draft[key]);
    const label=$('[data-value="'+key+'"]');
    if(label)label.textContent=key==='lr'?number(draft.lr):key==='speed'?draft.speed+' 단계/초':key==='steps'?String(draft.steps):Number(draft[key]).toFixed(key==='beta2'||key==='weightDecay'?3:2);
  }
}
function updateSetting(k,v){
  const draft=state.settingsDraft;if(!draft||!SETTINGS_KEYS.includes(k))return;
  if(k==='optimizer'){
    draft.optimizer=v;
    draft.lr=getOptimizer(v).defaults.lr;
    syncSettingsForm();return;
  }
  if(k==='landscape'){
    const field=getLandscape(v);
    draft.landscape=field.id;
    state.landscape=field.id;
    state.start={...field.start};
    recompute();
    const rec=renderers.find(r=>!r.preview);
    if(rec){rec.renderer.setField(field);rec.renderer.setFrame(series,0);}
    const title=$('.visual-landscape');if(title)title.textContent=field.name;
    const legend=$('#legend');if(legend&&!legend.hidden)legend.innerHTML=series.map(s=>'<span class="legend-item"><span class="dot" style="background:'+s.color+'"></span>'+s.name+'</span>').join('');
    redraw();syncSettingsForm();return;
  }
  if(k==='lr')draft.lr=10**Number(v);
  else if(k==='momentum'){draft.momentum=Number(v);draft.beta1=draft.momentum;}
  else draft[k]=Number(v);
  syncSettingsForm();
}
function setSettingsOpen(open){
  state.settingsOpen=!!open;
  state.settingsDraft=state.settingsOpen?Object.fromEntries(SETTINGS_KEYS.map(k=>[k,state[k]])):null;
  const overlay=$('[data-settings-overlay]');if(overlay)overlay.hidden=!state.settingsOpen;
  const toggle=$('[data-settings-toggle]');if(toggle)toggle.setAttribute('aria-expanded',String(state.settingsOpen));
  if(state.settingsOpen){syncSettingsForm();overlay?.querySelector('.settings-drawer [data-settings-close]')?.focus();}
  else toggle?.focus();
}
function applySettings(){
  const draft=state.settingsDraft;if(!draft)return;
  const previousLandscape=state.landscape;
  const changed=SETTINGS_KEYS.some(k=>state[k]!==draft[k]);
  for(const key of SETTINGS_KEYS)state[key]=draft[key];
  state.settingsDraft=null;state.settingsOpen=false;
  if(previousLandscape!==state.landscape)state.start={...getLandscape(state.landscape).start};
  if(changed)render();
  else setSettingsOpen(false);
}
function syncComparePicker(){
  const draft=state.compareDraft||state.compare;
  const summary=$('.compare-choices summary');
  if(summary)summary.textContent='비교 알고리즘 선택 ('+draft.length+'/'+MAX_COMPARE+')';
  for(const item of document.querySelectorAll('[data-compare]')){
    const index=draft.indexOf(item.dataset.compare),selected=index>=0;
    item.classList.toggle('active',selected);
    item.disabled=!selected&&draft.length>=MAX_COMPARE;
    item.setAttribute('aria-pressed',String(selected));
    const marker=item.querySelector('.compare-check');if(marker)marker.textContent=selected?'✓':'';
    const bullet=item.querySelector('.bullet');if(bullet)bullet.style.background=selected?COMPARE_COLORS[index]:getOptimizer(item.dataset.compare).color;
  }
}
function chooseCompareDraft(id){
  if(state.page!=='compare')return;
  const draft=state.compareDraft??(state.compareDraft=[...state.compare]);
  const index=draft.indexOf(id);
  if(index>=0)draft.splice(index,1);
  else if(draft.length<MAX_COMPARE)draft.push(id);
  const error=$('[data-compare-error]');if(error)error.hidden=true;
  syncComparePicker();
}
function cancelCompareDraft(){
  state.compareDraft=null;
  syncComparePicker();
  const picker=$('.compare-choices');if(picker)picker.open=false;
}
function applyCompareDraft(){
  if(state.page!=='compare')return;
  const draft=state.compareDraft||state.compare;
  if(draft.length===0){const error=$('[data-compare-error]');if(error)error.hidden=false;return;}
  const changed=draft.length!==state.compare.length||draft.some((id,i)=>id!==state.compare[i]);
  state.compare=[...draft];state.compareDraft=null;
  if(changed){render();window.scrollTo({top:0,behavior:'instant'});}
  else cancelCompareDraft();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.nav){changeView(b.dataset.nav);return;}
  if(b.dataset.open){chooseOptimizer(b.dataset.open);return;}
  if(b.hasAttribute('data-sidebar')){state.sidebar=!state.sidebar;render();return;}
  if(b.hasAttribute('data-mobile')){state.mobile=!state.mobile;render();return;}
  if(b.hasAttribute('data-settings-toggle')){setSettingsOpen(!state.settingsOpen);return;}
  if(b.hasAttribute('data-settings-close')){setSettingsOpen(false);return;}
  if(b.hasAttribute('data-settings-apply')){applySettings();return;}
  if(b.hasAttribute('data-fullscreen')){const area=b.closest('.canvas-wrap');if(!document.fullscreenElement){area?.requestFullscreen?.();}else{document.exitFullscreen?.();}return;}
  if(b.hasAttribute('data-vectors')){state.vectors=!state.vectors;const rec=renderers.find(x=>!x.preview);if(rec)rec.renderer.setVectors(state.vectors);b.textContent='벡터'+(state.vectors?' ✓':'');b.classList.toggle('selected',state.vectors);b.setAttribute('aria-pressed',String(state.vectors));return;}
  if(b.dataset.mode){state.mode=b.dataset.mode;const rec=renderers.find(r=>!r.preview);if(rec)rec.renderer.setMode(state.mode);for(const btn of document.querySelectorAll('[data-mode]'))btn.classList.toggle('active',btn.dataset.mode===state.mode);if(rec)rec.canvas.title=state.mode==='3d'?'클릭: 시작점 · 드래그: 회전 · 휠: 확대':'클릭: 시작점 · 휠: 확대';return;}
  if(b.hasAttribute('data-play')){if(state.position>=maxStep())state.position=0;state.playing=!state.playing;redraw();return;}
  if(b.hasAttribute('data-reset')){state.playing=false;state.position=0;redraw();return;}
  if(b.hasAttribute('data-next')){state.playing=false;state.position=Math.min(maxStep(),Math.floor(state.position)+1);redraw();return;}
  if(b.hasAttribute('data-prev')){state.playing=false;state.position=Math.max(0,Math.floor(state.position)-1);redraw();return;}
  if(b.hasAttribute('data-place-default')){state.start={...getLandscape(state.landscape).start};recompute();redraw();return;}
  if(b.dataset.camera){const rec=renderers.find(r=>!r.preview);if(rec){rec.renderer.yaw=.68;rec.renderer.pitch=.73;rec.renderer.zoom=1;rec.renderer.invalidate();rec.renderer.draw();}return;}
  if(b.dataset.filter){state.filter=b.dataset.filter;render();return;}
  if(b.hasAttribute('data-compare-cancel')){cancelCompareDraft();return;}
  if(b.hasAttribute('data-compare-apply')){applyCompareDraft();return;}
  if(b.dataset.compare){chooseCompareDraft(b.dataset.compare);return;}
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
        rec.elapsed+=elapsed;
        if(rec.catalog)rec.renderer.setFrame(rec.series,previewFrame(rec.elapsed,rec.activeEnd));
        else{
          const hold=HOME_HOLD_SECONDS+rec.homeSlot*.45,duration=HOME_MOVE_SECONDS+hold;
          if(rec.elapsed>=duration){rec.elapsed%=duration;rec.homeTurn++;rotateHomePreview(rec);}
          rec.renderer.setFrame(rec.series,previewFrame(rec.elapsed,rec.activeEnd,HOME_MOVE_SECONDS,hold));
        }
        used++;
      }
    }
  }
  requestAnimationFrame(tick);
}
render();requestAnimationFrame(tick);
