import {EXTRA_OPTIMIZERS,stepExtra} from './advanced.js';
import {SECOND_ORDER_OPTIMIZERS,stepSecondOrder} from './second-order.js';
import {COMPLEX_LANDSCAPES} from './landscapes-complex.js';
import {NEW_LANDSCAPES} from './landscapes-v3.js';
export const OPTIMIZERS = [
  { id:'sgd', name:'SGD', family:'기본 경사하강법', year:1951, color:'#2563eb', description:'현재 기울기의 반대 방향으로 일정한 학습률만큼 이동합니다.', formula:'θₜ = θₜ₋₁ − ηgₜ', defaults:{lr:0.055} },
  { id:'momentum', name:'SGD Momentum', family:'모멘텀', year:1964, color:'#ea8b35', description:'이전 기울기의 이동 방향을 누적해 진동을 줄이고 가속합니다.', formula:'vₜ = μvₜ₋₁ + gₜ  ·  θₜ = θₜ₋₁ − ηvₜ', defaults:{lr:0.025} },
  { id:'nesterov', name:'Nesterov Momentum', family:'모멘텀', year:1983, color:'#7c3aed', description:'누적 모멘텀을 반영한 앞선 방향의 보정 항을 사용합니다.', formula:'vₜ = μvₜ₋₁ + gₜ  ·  θₜ = θₜ₋₁ − η(gₜ + μvₜ)', defaults:{lr:0.018} },
  { id:'adagrad', name:'AdaGrad', family:'적응형 학습률', year:2011, color:'#0891b2', description:'좌표별 기울기 제곱 누적량을 사용해 학습률을 조절합니다.', formula:'Gₜ = Gₜ₋₁ + gₜ²  ·  θₜ = θₜ₋₁ − ηgₜ/(√Gₜ + ε)', defaults:{lr:0.35} },
  { id:'rmsprop', name:'RMSProp', family:'적응형 학습률', year:2012, color:'#db2777', description:'최근 기울기 제곱의 지수 이동 평균으로 업데이트 크기를 정규화합니다.', formula:'vₜ = ρvₜ₋₁ + (1−ρ)gₜ²  ·  θₜ = θₜ₋₁ − ηgₜ/(√vₜ + ε)', defaults:{lr:0.038} },
  { id:'adadelta', name:'AdaDelta', family:'적응형 학습률', year:2012, color:'#64748b', description:'기울기와 업데이트의 이동 평균을 함께 이용해 단위에 맞는 변화를 계산합니다.', formula:'Δθₜ = −RMS[Δθ]ₜ₋₁/RMS[g]ₜ · gₜ', defaults:{lr:1} },
  { id:'adam', name:'Adam', family:'Adam 계열', year:2014, color:'#059669', description:'기울기의 1차·2차 모멘트와 편향 보정을 이용합니다.', formula:'m̂ₜ = mₜ/(1−β₁ᵗ)  ·  v̂ₜ = vₜ/(1−β₂ᵗ)  ·  Δθ = −ηm̂ₜ/(√v̂ₜ+ε)', defaults:{lr:0.06} },
  { id:'adamw', name:'AdamW', family:'Adam 계열', year:2017, color:'#2563eb', description:'Adam에 분리된 가중치 감쇠(decoupled weight decay)를 적용합니다.', formula:'θₜ = (1−ηλ)θₜ₋₁ − ηm̂ₜ/(√v̂ₜ+ε)', defaults:{lr:0.06} },
  { id:'amsgrad', name:'AMSGrad', family:'Adam 계열', year:2018, color:'#b45309', description:'2차 모멘트의 보정된 최대값을 유지하여 업데이트 분모가 감소하지 않게 합니다.', formula:'v̄ₜ = max(v̄ₜ₋₁, v̂ₜ)  ·  Δθ = −ηm̂ₜ/(√v̄ₜ + ε)', defaults:{lr:0.055} },
  { id:'nadam', name:'NAdam', family:'Adam 계열', year:2016, color:'#0f766e', description:'Adam의 모멘텀에 Nesterov 방식의 보정을 결합합니다(고정 β 계수 변형).', formula:'m̄ₜ = β₁m̂ₜ + (1−β₁)gₜ/(1−β₁ᵗ)', defaults:{lr:0.055} },
  { id:'adamax', name:'Adamax', family:'Adam 계열', year:2014, color:'#8b5cf6', description:'2차 모멘트 대신 지수 가중 최대 절댓값으로 정규화합니다.', formula:'uₜ = max(β₂uₜ₋₁, |gₜ|)  ·  Δθ = −ηm̂ₜ/(uₜ+ε)', defaults:{lr:0.08} },
  { id:'lion', name:'Lion', family:'부호 기반', year:2023, color:'#dc2626', description:'모멘텀 조합의 부호로만 방향을 결정하고 분리된 가중치 감쇠를 사용합니다.', formula:'cₜ = β₁mₜ₋₁ + (1−β₁)gₜ  ·  θₜ = (1−ηλ)θₜ₋₁ − ηsign(cₜ)', defaults:{lr:0.018} }
];
OPTIMIZERS.push(...EXTRA_OPTIMIZERS,...SECOND_ORDER_OPTIMIZERS);
export const LANDSCAPES = [
  {id:'wavy',name:'물결 계곡',subtitle:'울퉁불퉁한 다중 계곡',range:3.2,start:{x:-2.25,y:1.8},lr:0.045,fn:(x,y)=>0.18*(x*x+y*y)+0.50*Math.sin(2.6*x)*Math.cos(2.3*y)+0.26*Math.sin(3.1*x+1.3*y)+1.0},
  ...COMPLEX_LANDSCAPES,
  ...NEW_LANDSCAPES
];
export const getOptimizer = id => OPTIMIZERS.find(o=>o.id===id)||OPTIMIZERS[6];
export const getLandscape = id => LANDSCAPES.find(l=>l.id===id)||LANDSCAPES[0];
export function gradient(fn,x,y){
  const hx=1e-4*(1+Math.abs(x)),hy=1e-4*(1+Math.abs(y));
  return [(fn(x+hx,y)-fn(x-hx,y))/(2*hx),(fn(x,y+hy)-fn(x,y-hy))/(2*hy)];
}
export function simulate(algorithm,landscape,start,options={}){
  const id=typeof algorithm==='string'?algorithm:algorithm.id;
  const field=typeof landscape==='string'?getLandscape(landscape):landscape;
  const f=field.fn, lr=Number(options.lr??getOptimizer(id).defaults.lr),mu=Number(options.momentum??0.9),b1=Number(options.beta1??0.9),b2=Number(options.beta2??0.999),wd=Number(options.weightDecay??0.01),eps=1e-8,steps=Math.min(500,Math.max(1,Math.round(options.steps??180))),rho=Number(options.rho??0.95);
  const p=[Number(start.x),Number(start.y)],m=[0,0],v=[0,0],u=[0,0],vmax=[0,0],deltaV=[0,0];
  const history=[{x:p[0],y:p[1],loss:f(...p),norm:Math.hypot(...gradient(f,...p)),step:0,dx:0,dy:0}];
  const stopAtMapEdge=options.bounds==='stop',mapRange=field.range;
  let status='complete';
  const isAdvanced=EXTRA_OPTIMIZERS.some(item=>item.id===id),isSecondOrder=SECOND_ORDER_OPTIMIZERS.some(item=>item.id===id),advancedState={};
  for(let t=1;t<=steps;t++){
    const g=gradient(f,...p),before=[...p],norm=Math.hypot(...g);
    if(isAdvanced)stepExtra(id,p,g,t,{lr,mu,b1,b2,wd,eps},advancedState);
    else if(isSecondOrder)stepSecondOrder(id,p,g,t,{fn:f,lr},advancedState);
    else for(let i=0;i<2;i++){
      const gi=g[i];
      if(id==='sgd'){p[i]-=lr*gi;}
      else if(id==='momentum'){m[i]=mu*m[i]+gi;p[i]-=lr*m[i];}
      else if(id==='nesterov'){m[i]=mu*m[i]+gi;p[i]-=lr*(gi+mu*m[i]);}
      else if(id==='adagrad'){v[i]+=gi*gi;p[i]-=lr*gi/(Math.sqrt(v[i])+eps);}
      else if(id==='rmsprop'){v[i]=b2*v[i]+(1-b2)*gi*gi;p[i]-=lr*gi/(Math.sqrt(v[i])+eps);}
      else if(id==='adadelta'){v[i]=rho*v[i]+(1-rho)*gi*gi;const update=-Math.sqrt(deltaV[i]+eps)/Math.sqrt(v[i]+eps)*gi;deltaV[i]=rho*deltaV[i]+(1-rho)*update*update;p[i]+=lr*update;}
      else if(id==='lion'){const direction=b1*m[i]+(1-b1)*gi;p[i]=(1-lr*wd)*p[i]-lr*Math.sign(direction);m[i]=b2*m[i]+(1-b2)*gi;}
      else {
        m[i]=b1*m[i]+(1-b1)*gi;
        if(id==='adamax'){u[i]=Math.max(b2*u[i],Math.abs(gi));const mhat=m[i]/(1-b1**t);p[i]-=lr*mhat/(u[i]+eps);}
        else {
          v[i]=b2*v[i]+(1-b2)*gi*gi;
          const mhat=m[i]/(1-b1**t),vhat=v[i]/(1-b2**t);
          let denom=vhat;
          if(id==='amsgrad'){vmax[i]=Math.max(vmax[i],vhat);denom=vmax[i];}
          const usedM=id==='nadam'?b1*mhat+(1-b1)*gi/(1-b1**t):mhat;
          const upd=lr*usedM/(Math.sqrt(denom)+eps);
          p[i]=id==='adamw'?(1-lr*wd)*p[i]-upd:p[i]-upd;
        }
      }
    }
    if(!p.every(Number.isFinite)||Math.max(Math.abs(p[0]),Math.abs(p[1]))>1e4){status='diverged';break;}
    if(stopAtMapEdge&&(Math.abs(p[0])>mapRange||Math.abs(p[1])>mapRange)){
      let fraction=1;
      for(let i=0;i<2;i++){
        if(p[i]>mapRange)fraction=Math.min(fraction,(mapRange-before[i])/(p[i]-before[i]));
        if(p[i]<-mapRange)fraction=Math.min(fraction,(-mapRange-before[i])/(p[i]-before[i]));
      }
      fraction=Math.max(0,Math.min(1,fraction));
      p[0]=Math.max(-mapRange,Math.min(mapRange,before[0]+fraction*(p[0]-before[0])));
      p[1]=Math.max(-mapRange,Math.min(mapRange,before[1]+fraction*(p[1]-before[1])));
      const loss=f(...p);
      history.push({x:p[0],y:p[1],loss,norm,step:t,dx:p[0]-before[0],dy:p[1]-before[1],atBoundary:true});
      status='out_of_bounds';break;
    }
    const loss=f(...p);
    if(!Number.isFinite(loss)){status='diverged';break;}
    history.push({x:p[0],y:p[1],loss,norm,step:t,dx:p[0]-before[0],dy:p[1]-before[1]});
    if(norm<1e-7&&t>10){status='converged';break;}
  }
  return {id,landscape:field.id,history,status,options:{lr,mu,b1,b2,wd,steps}};
}
export function sampleRange(field,n=40){
  const r=field.range;let min=Infinity,max=-Infinity;
  for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const v=field.fn(-r+2*r*i/n,-r+2*r*j/n);min=Math.min(min,v);max=Math.max(max,v);}
  return {min,max};
}
