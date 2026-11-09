// Full-batch, two-parameter optimizers using line search and curvature.
const entry=(id,name,year,color,description,formula,lr)=>({id,name,family:'2차 최적화',year,color,description,formula,defaults:{lr}});
export const SECOND_ORDER_OPTIMIZERS=[
  entry('newton','Newton',1669,'#1d4ed8','손실 함수의 2×2 헤시안과 기울기로 뉴턴 방향을 계산하고 역행렬을 안정화합니다.','d = −(H+λI)⁻¹g,  Armijo 선 탐색',1),
  entry('bfgs','BFGS',1970,'#7c3aed','직전 파라미터 변화와 기울기 차이로 역헤시안 근사를 갱신합니다.','H⁻¹ₜ₊₁ = BFGS(H⁻¹ₜ,sₜ,yₜ)',1),
  entry('lbfgs','L-BFGS',1989,'#059669','최근 5개의 변화쌍을 사용해 방향을 계산하는 저메모리 준뉴턴 방법입니다.','d = −TwoLoop(g,{sᵢ,yᵢ})',1),
  entry('nonlinear-cg','Nonlinear CG','1964','#ca8a04','이전 탐색 방향을 Polak–Ribière+ 계수로 결합합니다.','dₜ = −gₜ + max(0,βPR)dₜ₋₁',1)
];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const add=(a,b,s=1)=>[a[0]+s*b[0],a[1]+s*b[1]];
const scale=(a,s)=>[a[0]*s,a[1]*s];
const matvec=(h,x)=>[h[0]*x[0]+h[1]*x[1],h[2]*x[0]+h[3]*x[1]];
const norm=x=>Math.hypot(x[0],x[1]);
function grad(fn,p){const x=p[0],y=p[1],h1=1e-4*(1+Math.abs(x)),h2=1e-4*(1+Math.abs(y));return [(fn(x+h1,y)-fn(x-h1,y))/(2*h1),(fn(x,y+h2)-fn(x,y-h2))/(2*h2)];}
function lineSearch(p,d,g,fn,lr){
  if(dot(g,d)>=-1e-12)d=scale(g,-1);
  const length=norm(d);if(length>5)d=scale(d,5/length);
  const slope=dot(g,d);
  let a=Math.min(1,Math.max(1e-5,lr)),base=fn(p[0],p[1]),next;
  for(let k=0;k<28;k++){next=add(p,d,a);const f=fn(next[0],next[1]);if(Number.isFinite(f)&&f<=base+1e-4*a*slope)return next;a*=.5;}
  return [p[0],p[1]];
}
function newtonDirection(p,g,fn){
  const hx=1e-3*(1+Math.abs(p[0])),hy=1e-3*(1+Math.abs(p[1]));
  const gxP=grad(fn,[p[0]+hx,p[1]]),gxM=grad(fn,[p[0]-hx,p[1]]),gyP=grad(fn,[p[0],p[1]+hy]),gyM=grad(fn,[p[0],p[1]-hy]);
  const xx=(gxP[0]-gxM[0])/(2*hx),xy=.5*((gxP[1]-gxM[1])/(2*hx)+(gyP[0]-gyM[0])/(2*hy)),yy=(gyP[1]-gyM[1])/(2*hy);
  let lam=0;
  for(let k=0;k<12;k++){const a=xx+lam,c=yy+lam,det=a*c-xy*xy;if(a>1e-5&&c>1e-5&&det>1e-9)return [-(c*g[0]-xy*g[1])/det,-(-xy*g[0]+a*g[1])/det];lam=lam===0?.01:lam*3;}
  return scale(g,-1);
}
function bfgsUpdate(h,s,y){
  const ys=dot(y,s);if(ys<=1e-10)return [1,0,0,1];
  const hy=matvec(h,y),yhy=dot(y,hy),c=(1+yhy/ys)/ys,nh=[];
  for(let i=0;i<2;i++)for(let j=0;j<2;j++)nh.push(h[i*2+j]+c*s[i]*s[j]-(hy[i]*s[j]+s[i]*hy[j])/ys);
  return nh;
}
function lbfgsDirection(g,pairs){
  if(!pairs.length)return scale(g,-1);
  let q=[...g],alpha=[];
  for(let i=pairs.length-1;i>=0;i--){const p=pairs[i],a=p.rho*dot(p.s,q);alpha[i]=a;q=add(q,p.y,-a);}
  const last=pairs.at(-1),gamma=dot(last.s,last.y)/dot(last.y,last.y);let r=scale(q,gamma);
  for(let i=0;i<pairs.length;i++){const p=pairs[i],beta=p.rho*dot(p.y,r);r=add(r,p.s,alpha[i]-beta);}
  return scale(r,-1);
}
export function stepSecondOrder(id,p,g,t,options,st){
  const {fn,lr}=options,before=[...p];let direction;
  if(id==='newton'){direction=newtonDirection(p,g,fn);}
  else if(id==='bfgs'){st.h??=[1,0,0,1];direction=scale(matvec(st.h,g),-1);}
  else if(id==='lbfgs'){st.pairs??=[];direction=lbfgsDirection(g,st.pairs);}
  else if(id==='nonlinear-cg'){const prev=st.prevGrad,beta=prev?Math.max(0,dot(g,add(g,prev,-1))/Math.max(1e-12,dot(prev,prev))):0;direction=add(scale(g,-1),st.prevDir||[0,0],beta);if(dot(direction,g)>=0)direction=scale(g,-1);st.prevDir=[...direction];st.prevGrad=[...g];}
  else throw new Error('등록되지 않은 2차 옵티마이저: '+id);
  const next=lineSearch(before,direction,g,fn,lr);p[0]=next[0];p[1]=next[1];
  if(id==='bfgs'||id==='lbfgs'){
    const s=add(p,before,-1),y=add(grad(fn,p),g,-1),ys=dot(y,s);
    if(id==='bfgs')st.h=bfgsUpdate(st.h,s,y);
    else if(ys>1e-10){st.pairs.push({s,y,rho:1/ys});if(st.pairs.length>5)st.pairs.shift();}
  }
}
