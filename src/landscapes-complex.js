// Four non-periodic landscapes from the approved complexity-3 preview.
// Keep the same mathematical functions; render height normalization is handled separately.
const gaussian=(x,y,cx,cy,sx,sy,rot=0)=>{const co=Math.cos(rot),si=Math.sin(rot),u=(x-cx)*co+(y-cy)*si,v=-(x-cx)*si+(y-cy)*co;return Math.exp(-.5*((u/sx)**2+(v/sy)**2));};
const S=(x,k=1)=>1/(1+Math.exp(-k*x));
const P=(x,y,features)=>features.reduce((v,t)=>v+t[0]*gaussian(x,y,t[1],t[2],t[3],t[4],t[5]||0),0);
const detailFactor=()=>1; // Preview's maximum complexity level (3/3), fixed: no new slider.
const functions={
canyon:(x,y)=>{
  const bend=.52*Math.tanh(.93*x+.18)+.37*Math.sin(1.15*x-.15)+.10*x;
  const main=y-bend, fork=y-(bend-.92*S(x+.35,2.9)+.18*Math.tanh(1.4*x+1.2));
  const mainWidth=.22+.045*gaussian(x,0,-.35,0,1.1,10);
  const channel=-2.55*Math.exp(-.5*(main/mainWidth)**2)-1.15*S(x+.65,2.6)*Math.exp(-.5*(fork/.24)**2);
  const base=.15*(x*x+y*y)+.12*x-.08*y+channel;
  const ridges=P(x,y,[[1.3,-1.65,.85,.40,1.1,-.55],[1.05,1.32,-.9,.45,.95,.58],[.86,-.15,.48,.35,.81,-.53],[.92,2.05,1.65,.44,.59,.74],[.55,-2.35,-1.24,.47,.64,.20]]);
  const pockets=P(x,y,[[-1.25,-1.48,-.76,.34,.32,.2],[-.96,-.24,-1.24,.38,.24,.85],[-1.24,1.48,1.5,.27,.44,.46],[-.75,2.25,-.56,.31,.33,0],[.58,-.8,1.6,.24,.61,-.7],[.61,.95,.45,.22,.4,.9],[-.72,-1.9,1.82,.31,.36,.2]]);
  const fine=P(x,y,[[-.60,-.95,.55,.15,.27,-.4],[.48,-.5,-.35,.20,.31,.4],[-.58,.45,-.22,.17,.29,-.7],[.53,1.65,-1.46,.17,.23,.6],[-.43,1.76,.42,.18,.28,-.5],[.38,-1.37,-1.78,.18,.22,0],[-.45,2.39,.96,.17,.24,.2],[.29,.25,1.55,.16,.25,-.7]]);
  return base+ridges+.9*pockets+detailFactor()*.8*fine;
},
caldera:(x,y)=>{
  const dx=x-.22,dy=y+.14,a=Math.atan2(dy,dx),rho=Math.hypot(dx,dy);
  const boundary=1.3+.20*Math.sin(3*a+.5)+.11*Math.sin(5*a-.9)+.13*Math.sin(2*a+1.8);
  const width=.19+.035*(1+Math.sin(a*3+.4));
  const gate=1-.86*gaussian(Math.cos(a),Math.sin(a),Math.cos(.92),Math.sin(.92),.28,.25);
  const rim=2.5*gate*Math.exp(-.5*((rho-boundary)/width)**2);
  const central=-2.35*gaussian(x,y,-.04,.11,.65,.6,-.4)+.72*gaussian(x,y,.18,-.05,.22,.33,.8);
  const flank=.15*(x*x+y*y)+.11*x-.06*y;
  const craters=P(x,y,[[-1.48,-1.85,1.65,.41,.43,-.4],[-1.36,1.95,-1.5,.38,.5,.55],[-1.08,-1.62,-1.32,.36,.28,.35],[-1.3,1.58,1.68,.3,.46,-.5],[1.05,-2.1,-.4,.41,.73,.76],[.85,.66,2.05,.56,.32,-.4],[1.22,1.74,.74,.29,.61,1.0],[.84,-.95,-2.1,.35,.42,.3]]);
  const scars=P(x,y,[[-.66,-.7,.86,.18,.38,-.8],[.60,1.03,-.42,.16,.42,.2],[-.7,1.45,-.35,.21,.25,1.0],[.55,-1.15,.42,.23,.28,.4],[-.55,-2.37,.65,.19,.36,.6],[.43,.72,-1.91,.2,.37,-.5],[-.42,-1.68,2.2,.21,.3,-.5],[.40,2.15,1.62,.16,.25,.3]]);
  return flank+rim+central+craters+detailFactor()*scars;
},
fault:(x,y)=>{
  const a=y-.57*x-.38*Math.tanh(1.4*x+.2)-.12*Math.sin(2*x-.6);
  const b=y+.76*x+.36*Math.tanh(1.3*x-.5)+.18*Math.sin(1.2*x+.3);
  const c=x+.4*y-.7+.18*Math.sin(1.7*y);
  const envelope=Math.exp(-.035*(x*x+y*y));
  const blocks=(1.28*Math.tanh(5.5*a)-1.08*Math.tanh(5.3*b)+.67*Math.tanh(5.4*c))*envelope;
  const trough=-.78*Math.exp(-.5*(a/.19)**2)*(1-.55*gaussian(x,y,.1,0,.35,.45))-.64*Math.exp(-.5*(b/.23)**2)*S(.8-x,1.5);
  const base=.13*(x*x+y*y)+.06*x-.13*y+blocks+trough;
  const ridges=P(x,y,[[1.30,-1.7,-1.28,.38,1.15,.53],[.96,1.15,1.18,.34,1.13,-.60],[1.02,.17,-1.75,.28,.77,.36],[.74,-2.2,.8,.3,.64,-.2]]);
  const holes=P(x,y,[[-1.12,-1.62,.02,.29,.42,-.2],[-1.42,.90,-.88,.26,.34,.5],[-1.18,1.94,1.26,.28,.3,.8],[-.87,-.22,1.34,.27,.41,-.3],[-.96,2.23,-.45,.25,.28,.3],[-.88,-2.13,-1.95,.30,.31,0]]);
  const debris=P(x,y,[[.53,-.95,-.56,.16,.38,.8],[-.64,.40,-1.65,.16,.28,-.5],[.60,1.55,-1.79,.18,.31,.2],[-.60,-1.13,1.89,.2,.22,.9],[.47,2.3,.55,.14,.36,-.2],[-.55,.44,.58,.22,.26,0],[.42,-2.35,.08,.23,.23,.5],[-.44,1.22,2.18,.21,.20,-.4]]);
  return base+ridges+holes+detailFactor()*debris;
},
wells:(x,y)=>{
  const base=.17*(x*x+y*y)+.23*x-.08*y+.17*x*y;
  const basins=P(x,y,[[-3.55,-1.7,1.1,.39,.59,.45],[-2.85,.45,-1.55,.45,.36,-.6],[-3.85,1.66,1.25,.24,.41,.8],[-1.65,-.2,.32,.3,.68,-.8],[-1.25,-1.66,-1.8,.36,.30,.2],[-1.8,2.09,-.46,.35,.29,-.5],[-1.45,.78,1.98,.33,.4,.3],[-1.2,-2.35,.16,.21,.3,-.4],[-1.42,1.73,-2.05,.34,.27,.2]]);
  const barriers=P(x,y,[[1.68,-.85,-.5,.38,.92,.32],[1.81,1.03,.27,.34,.91,-.6],[1.35,-.6,1.76,.65,.24,.3],[1.03,1.95,-1.65,.48,.43,1.1],[.89,-1.97,-.94,.46,.30,-.6]]);
  const hidden=P(x,y,[[-.94,-.98,.8,.17,.2,.5],[-1.05,.15,-.45,.17,.26,-.2],[.78,.25,1.02,.20,.36,-.4],[-.83,2.39,.49,.16,.22,.6],[-.74,-2.35,1.99,.25,.27,.2],[.6,-1.42,-2.25,.20,.26,-.4],[-.65,1.15,-.93,.18,.27,.2],[.68,2.44,2.2,.27,.21,.7],[-.74,-.15,-2.3,.26,.25,.5],[.54,-2.4,-1.62,.2,.32,.3]]);
  return base+basins+barriers+detailFactor()*hidden;
}
};
export const COMPLEX_LANDSCAPES = [
  {id:'twistedCanyon',name:'비틀린 협곡',subtitle:'삼중 분기와 막다른 골짜기',range:2.8,start:{x:-2.2,y:1.8},lr:0.028,fn:functions.canyon},
  {id:'brokenCaldera',name:'부서진 분화구',subtitle:'끊어진 외곽 능선과 이중 분지',range:2.8,start:{x:2,y:1.6},lr:0.028,fn:functions.caldera},
  {id:'faultMaze',name:'단층 미로',subtitle:'서로 교차하는 단층과 숨은 함정',range:2.8,start:{x:-2.3,y:-1.7},lr:0.020,fn:functions.fault},
  {id:'isolatedWells',name:'고립된 함정',subtitle:'서로 다른 깊이의 우물과 장벽',range:2.8,start:{x:2.3,y:2},lr:0.028,fn:functions.wells}
];
