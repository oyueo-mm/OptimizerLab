// Additional optimizers on a true two-parameter objective. Each call updates p in place.
// State is private to one simulation and is never shared across cards or comparison runs.
const item=(id,name,family,year,color,description,formula,lr)=>({id,name,family,year,color,description,formula,defaults:{lr}});
export const EXTRA_OPTIMIZERS=[
  item('sgdw','SGDW','경사하강법',2017,'#1d4ed8','SGD 모멘텀에 분리된 가중치 감쇠를 적용합니다.','v ← μv+g ; θ ← (1−ηλ)θ−ηv',0.045),
  item('signsgd','SignSGD','부호 기반',2018,'#be123c','기울기의 크기를 버리고 부호만 이용해 이동합니다.','θ ← θ−η·sign(g)',0.06),
  item('qhm','QHM','모멘텀',2018,'#c2410c','현재 기울기와 지수 이동 평균을 혼합하는 준초곡률 모멘텀입니다.','m ← βm+(1−β)g ; Δθ ← −η[(1−ν)g+νm]',0.065),
  item('aggmo','AggMo','모멘텀',2018,'#a16207','서로 다른 관성 계수 세 개의 모멘텀을 평균해 이동합니다.','vᵢ ← βᵢvᵢ+g ; Δθ ← −ηmean(vᵢ)',0.028),
  item('rprop','RProp','적응형 학습률',1993,'#0891b2','좌표별 기울기 부호 변화에 따라 개별 이동 폭을 조정합니다.','Δᵢ ← clip(Δᵢ·η±) ; θᵢ ← θᵢ−Δᵢsign(gᵢ)',0.03),
  item('yogi','Yogi','적응형 학습률',2018,'#7c3aed','기울기 제곱 추정치를 부호 기반으로 제어하는 Adam 계열입니다.','v ← v−(1−β₂)sign(v−g²)g²',0.05),
  item('radam','RAdam','Adam 계열',2019,'#047857','초기 2차 모멘트 추정의 분산을 정류하는 Adam 변형입니다.','ρₜ > 5이면 정류 계수 rₜ를 적용',0.055),
  item('radamw','RAdamW','Adam 계열',2019,'#0d9488','RAdam에 분리된 가중치 감쇠를 적용한 변형입니다.','θ ← (1−ηλ)θ−η·RAdam방향',0.055),
  item('adabelief','AdaBelief','Adam 계열',2020,'#9333ea','기울기와 1차 모멘트 사이 편차의 제곱을 2차 통계로 사용합니다.','s ← β₂s+(1−β₂)(g−m)²',0.05),
  item('adabeliefw','AdaBeliefW','Adam 계열',2020,'#a855f7','AdaBelief에 분리된 가중치 감쇠를 추가합니다.','θ ← (1−ηλ)θ−ηm̂/(√ŝ+ε)',0.05),
  item('adabound','AdaBound','적응형 학습률',2019,'#e11d48','Adam형 좌표별 유효 학습률에 동적인 상하한을 적용합니다.','ηeff ← clip(η/√v̂, lowerₜ, upperₜ)',0.06),
  item('adamod','AdaMod','Adam 계열',2019,'#db2777','Adam의 유효 학습률을 EMA 상한으로 제한해 과도한 증가를 억제합니다.','ηeff ← min(η/√v̂, EMA(η/√v̂))',0.055),
  item('diffgrad','diffGrad','Adam 계열',2019,'#b45309','현재와 직전 기울기의 차이에 따라 Adam 업데이트를 조절합니다.','ξ ← sigmoid(|gₜ−gₜ₋₁|)',0.055),
  item('padam','PAdam','Adam 계열',2018,'#0e7490','Adam 분모의 모멘트 지수를 조절하는 부분 적응형 방법입니다.','Δθ ← −ηm̂/(v̂ᵖ+ε), p=1/8',0.055),
  item('qhadam','QHAdam','Adam 계열',2018,'#2563eb','즉시 기울기와 편향 보정 모멘트를 혼합합니다.','m̄=(1−ν₁)g+ν₁m̂ ; v̄=(1−ν₂)g²+ν₂v̂',0.055),
  item('laprop','LaProp','적응형 학습률',2020,'#0f766e','정규화된 기울기에 모멘텀을 적용해 적응성과 관성을 분리합니다.','u=g/(√v̂+ε); m←β₁m+(1−β₁)u',0.05),
  item('novograd','NovoGrad','대규모 배치',2019,'#7c2d12','벡터 전체의 기울기 노름을 이용하는 메모리 효율형 모멘텀입니다.','v ← β₂v+(1−β₂)||g||² ; m ← β₁m+g/√v',0.045),
  item('lars','LARS','대규모 배치',2017,'#15803d','전체 2차원 파라미터를 하나의 층으로 간주해 층별 신뢰 비율을 적용합니다.','r=τ||θ||/(||g||+λ||θ||) ; Δθ=−ηr(g+λθ)',0.16),
  item('lamb','LAMB','대규모 배치',2019,'#16a34a','Adam 방향에 파라미터/업데이트 노름 비율을 곱합니다.','r=||θ||/||u|| ; θ ← θ−ηr·u',0.065),
  item('lookahead','Lookahead SGD','조합형',2019,'#ea580c','빠른 SGD 궤적을 여러 단계 수행하고 느린 가중치와 동기화합니다.','fast ← SGD ; slow ← slow+α(fast−slow) (5단계마다)',0.095),
  item('ranger','Ranger','조합형',2020,'#65a30d','RAdam의 빠른 업데이트와 Lookahead 동기화를 결합합니다.','fast ← RAdam ; slow ← slow+α(fast−slow)',0.055),
  item('adafactor','Adafactor (비인수분해)','적응형 학습률',2018,'#475569','벡터 파라미터에 적용하는 비인수분해 2차 모멘트·RMS 클리핑 변형입니다.','v ← β₂ₜv+(1−β₂ₜ)g² ; u ← clipRMS(g/√v)',0.05),
  item('optimistic','Optimistic GD','경사하강법',2018,'#1e40af','직전 기울기를 보정에 사용해 변화 방향을 예상합니다.','θ ← θ−2ηgₜ+ηgₜ₋₁',0.035),
  item('nadamw','NAdamW','Adam 계열',2016,'#14b8a6','NAdam형 모멘트 보정과 분리된 가중치 감쇠를 사용합니다.','θ ← (1−ηλ)θ−ηm̄/(√v̂+ε)',0.055),
  item('adagradw','AdaGradW','적응형 학습률',2017,'#0284c7','AdaGrad에 분리된 가중치 감쇠를 결합합니다.','G ← G+g² ; θ ← (1−ηλ)θ−ηg/(√G+ε)',0.25)
];
const pair=(st,key)=>st[key]??(st[key]=[0,0]);
const norm=a=>Math.hypot(a[0],a[1]);
function moments(st,g,b1,b2,t){const m=pair(st,'m'),v=pair(st,'v');for(let i=0;i<2;i++){m[i]=b1*m[i]+(1-b1)*g[i];v[i]=b2*v[i]+(1-b2)*g[i]*g[i];}return {mhat:m.map(x=>x/(1-b1**t)),vhat:v.map(x=>x/(1-b2**t))};}
function radam(p,g,t,o,st,decay=false){const {lr,b1,b2,wd,eps}=o,{mhat,vhat}=moments(st,g,b1,b2,t),rInf=2/(1-b2)-1,rt=rInf-2*t*b2**t/(1-b2**t),r=rt>5?Math.sqrt((rt-4)*(rt-2)*rInf/((rInf-4)*(rInf-2)*rt)):1;for(let i=0;i<2;i++){const amount=rt>5?r*mhat[i]/(Math.sqrt(vhat[i])+eps):mhat[i];p[i]=(decay?(1-lr*wd)*p[i]:p[i])-lr*amount;}}
export function stepExtra(id,p,g,t,o,st){
  const {lr,mu,b1,b2,wd,eps}=o;
  if(id==='sgdw'){const m=pair(st,'m');for(let i=0;i<2;i++){m[i]=mu*m[i]+g[i];p[i]=(1-lr*wd)*p[i]-lr*m[i];}return;}
  if(id==='signsgd'){for(let i=0;i<2;i++)p[i]-=lr*Math.sign(g[i]);return;}
  if(id==='qhm'){const m=pair(st,'m'),nu=.7;for(let i=0;i<2;i++){m[i]=mu*m[i]+(1-mu)*g[i];p[i]-=lr*((1-nu)*g[i]+nu*m[i]);}return;}
  if(id==='aggmo'){const banks=st.banks??(st.banks=[[0,0],[0,0],[0,0]]);const betas=[0,.9,.99];for(let i=0;i<2;i++){let sum=0;for(let j=0;j<3;j++){banks[j][i]=betas[j]*banks[j][i]+g[i];sum+=banks[j][i];}p[i]-=lr*sum/3;}return;}
  if(id==='rprop'){const prev=pair(st,'prev'),steps=st.steps??(st.steps=[lr,lr]);for(let i=0;i<2;i++){const product=g[i]*prev[i];let gi=g[i];if(product>0)steps[i]=Math.min(50,1.2*steps[i]);else if(product<0){steps[i]=Math.max(1e-6,.5*steps[i]);gi=0;}p[i]-=steps[i]*Math.sign(gi);prev[i]=gi;}return;}
  if(id==='adagradw'){const v=pair(st,'v');for(let i=0;i<2;i++){v[i]+=g[i]*g[i];p[i]=(1-lr*wd)*p[i]-lr*g[i]/(Math.sqrt(v[i])+eps);}return;}
  if(id==='yogi'){const m=pair(st,'m'),v=pair(st,'v');for(let i=0;i<2;i++){m[i]=b1*m[i]+(1-b1)*g[i];const g2=g[i]*g[i];v[i]=Math.max(0,v[i]-(1-b2)*Math.sign(v[i]-g2)*g2);const mhat=m[i]/(1-b1**t),vhat=v[i]/(1-b2**t);p[i]-=lr*mhat/(Math.sqrt(vhat)+eps);}return;}
  if(id==='radam'||id==='radamw'){radam(p,g,t,o,st,id==='radamw');return;}
  if(id==='adabelief'||id==='adabeliefw'){const m=pair(st,'m'),v=pair(st,'v');for(let i=0;i<2;i++){m[i]=b1*m[i]+(1-b1)*g[i];const residual=g[i]-m[i];v[i]=b2*v[i]+(1-b2)*residual*residual;const mhat=m[i]/(1-b1**t),vhat=v[i]/(1-b2**t);p[i]=(id==='adabeliefw'?(1-lr*wd)*p[i]:p[i])-lr*mhat/(Math.sqrt(vhat)+eps);}return;}
  if(id==='adabound'){const {mhat,vhat}=moments(st,g,b1,b2,t),gamma=.001,lower=lr*(1-1/(gamma*t+1)),upper=lr*(1+1/(gamma*t));for(let i=0;i<2;i++){const rate=Math.max(lower,Math.min(upper,lr/(Math.sqrt(vhat[i])+eps)));p[i]-=rate*mhat[i];}return;}
  if(id==='adamod'){const {mhat,vhat}=moments(st,g,b1,b2,t),smooth=pair(st,'smooth'),beta3=.999;for(let i=0;i<2;i++){const rate=lr/(Math.sqrt(vhat[i])+eps);smooth[i]=beta3*smooth[i]+(1-beta3)*rate;p[i]-=Math.min(rate,smooth[i])*mhat[i];}return;}
  if(id==='diffgrad'){const {mhat,vhat}=moments(st,g,b1,b2,t),prev=pair(st,'prev');for(let i=0;i<2;i++){const diff=Math.abs(g[i]-prev[i]),coef=1/(1+Math.exp(-diff));p[i]-=lr*coef*mhat[i]/(Math.sqrt(vhat[i])+eps);prev[i]=g[i];}return;}
  if(id==='padam'){const {mhat,vhat}=moments(st,g,b1,b2,t);for(let i=0;i<2;i++)p[i]-=lr*mhat[i]/(Math.pow(vhat[i],.125)+eps);return;}
  if(id==='qhadam'){const {mhat,vhat}=moments(st,g,b1,b2,t),nu1=.7,nu2=1;for(let i=0;i<2;i++){const q=(1-nu1)*g[i]+nu1*mhat[i],u=(1-nu2)*g[i]*g[i]+nu2*vhat[i];p[i]-=lr*q/(Math.sqrt(u)+eps);}return;}
  if(id==='laprop'){const m=pair(st,'m'),v=pair(st,'v');for(let i=0;i<2;i++){v[i]=b2*v[i]+(1-b2)*g[i]*g[i];const gnorm=g[i]/(Math.sqrt(v[i]/(1-b2**t))+eps);m[i]=b1*m[i]+(1-b1)*gnorm;p[i]-=lr*m[i]/(1-b1**t);}return;}
  if(id==='novograd'){const gradSq=g[0]*g[0]+g[1]*g[1];st.scalar=st.scalar===undefined?gradSq:b2*st.scalar+(1-b2)*gradSq;const m=pair(st,'m');for(let i=0;i<2;i++){m[i]=b1*m[i]+g[i]/(Math.sqrt(st.scalar)+eps);p[i]-=lr*(m[i]+wd*p[i]);}return;}
  if(id==='lars'){const pnorm=norm(p),gnorm=norm(g),trust=pnorm>0?.05*pnorm/(gnorm+wd*pnorm+eps):1,m=pair(st,'m');for(let i=0;i<2;i++){m[i]=mu*m[i]+trust*(g[i]+wd*p[i]);p[i]-=lr*m[i];}return;}
  if(id==='lamb'){const {mhat,vhat}=moments(st,g,b1,b2,t),dir=mhat.map((x,i)=>x/(Math.sqrt(vhat[i])+eps)+wd*p[i]),denom=norm(dir),pnorm=norm(p),trust=pnorm>0&&denom>0?pnorm/denom:1;for(let i=0;i<2;i++)p[i]-=lr*trust*dir[i];return;}
  if(id==='lookahead'){const slow=pair(st,'slow');if(t===1){slow[0]=p[0];slow[1]=p[1];}for(let i=0;i<2;i++)p[i]-=lr*g[i];if(t%5===0){for(let i=0;i<2;i++){slow[i]+=.5*(p[i]-slow[i]);p[i]=slow[i];}}return;}
  if(id==='ranger'){const slow=pair(st,'slow');if(t===1){slow[0]=p[0];slow[1]=p[1];}radam(p,g,t,o,st);if(t%6===0){for(let i=0;i<2;i++){slow[i]+=.5*(p[i]-slow[i]);p[i]=slow[i];}}return;}
  if(id==='adafactor'){const v=pair(st,'v'),beta=1-t**(-.8),u=[0,0];for(let i=0;i<2;i++){v[i]=beta*v[i]+(1-beta)*g[i]*g[i];u[i]=g[i]/(Math.sqrt(v[i])+eps);}const clip=Math.max(1,norm(u)/Math.sqrt(2));for(let i=0;i<2;i++)p[i]-=lr*u[i]/clip;return;}
  if(id==='optimistic'){const prev=pair(st,'prev');for(let i=0;i<2;i++){p[i]-=2*lr*g[i]-lr*prev[i];prev[i]=g[i];}return;}
  if(id==='nadamw'){const {mhat,vhat}=moments(st,g,b1,b2,t);for(let i=0;i<2;i++){const n=b1*mhat[i]+(1-b1)*g[i]/(1-b1**t);p[i]=(1-lr*wd)*p[i]-lr*n/(Math.sqrt(vhat[i])+eps);}return;}
  throw new Error('등록되지 않은 확장 옵티마이저: '+id);
}
