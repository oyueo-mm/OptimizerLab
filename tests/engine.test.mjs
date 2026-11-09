import test from 'node:test';
import assert from 'node:assert/strict';
import {OPTIMIZERS,LANDSCAPES,getLandscape,gradient,simulate,sampleRange} from '../src/engine.js';
const almost=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} differs from ${b}`);
const bowl=getLandscape('bowl'),start={x:1,y:-1};
test('all registered optimizers and surfaces are finite at their starting points',()=>{
  assert.equal(OPTIMIZERS.length,12);assert.equal(LANDSCAPES.length,9);
  for(const field of LANDSCAPES){const sample=sampleRange(field);assert.ok(Number.isFinite(sample.min)&&Number.isFinite(sample.max));assert.ok(sample.max>sample.min);}
  for(const opt of OPTIMIZERS){const sim=simulate(opt,bowl,start,{lr:opt.defaults.lr,steps:20});assert.equal(sim.history.length,21,opt.id);assert.ok(sim.history.every(p=>Number.isFinite(p.loss)&&Number.isFinite(p.x)&&Number.isFinite(p.y)),opt.id);}
});
test('gradient matches the analytic bowl derivative',()=>{
  const g=gradient(bowl.fn,1,-1);almost(g[0],0.68,1e-7);almost(g[1],-1.64,1e-7);
});
test('SGD first update is negative learning rate times gradient',()=>{
  const p=simulate('sgd',bowl,start,{lr:0.1,steps:1}).history[1];almost(p.x,0.932);almost(p.y,-0.836);
});
test('Momentum and Nesterov reduce to SGD when momentum is zero',()=>{
  const options={lr:0.06,momentum:0,steps:9},sgd=simulate('sgd',bowl,start,options).history;
  for(const id of ['momentum','nesterov']){const path=simulate(id,bowl,start,options).history;path.forEach((p,i)=>{almost(p.x,sgd[i].x);almost(p.y,sgd[i].y);});}
});
test('AdaGrad first step normalizes each gradient component',()=>{
  const p=simulate('adagrad',bowl,start,{lr:0.2,steps:1}).history[1];almost(p.x,0.8);almost(p.y,-0.8);
});
test('Adam/AMSGrad/Adamax first steps match bias corrected normalized gradient',()=>{
  for(const id of ['adam','amsgrad','adamax']){const p=simulate(id,bowl,start,{lr:0.1,steps:1}).history[1];almost(p.x,0.9);almost(p.y,-0.9);}
});
test('AdamW weight decay is decoupled from Adam first step',()=>{
  const a=simulate('adam',bowl,start,{lr:0.1,steps:1,weightDecay:0.2}).history[1];
  const w=simulate('adamw',bowl,start,{lr:0.1,steps:1,weightDecay:0.2}).history[1];
  almost(w.x-a.x,-0.02);almost(w.y-a.y,0.02);
});
test('Lion uses sign of momentum blend and decoupled decay',()=>{
  const p=simulate('lion',bowl,start,{lr:0.1,weightDecay:0.2,steps:1}).history[1];almost(p.x,0.88);almost(p.y,-0.88);
});
test('NAdam first update uses lookahead-corrected momentum',()=>{
  const a=simulate('adam',bowl,start,{lr:0.1,steps:1}).history[1];
  const n=simulate('nadam',bowl,start,{lr:0.1,steps:1}).history[1];
  assert.ok(n.x<a.x);assert.ok(n.y>a.y);
});
test('stochastic-free optimization is deterministic',()=>{
  const options={lr:0.035,steps:30,weightDecay:0.01};
  for(const id of OPTIMIZERS.map(a=>a.id)){
    const a=simulate(id,bowl,start,options),b=simulate(id,bowl,start,options);
    assert.deepEqual(a.history,b.history,id);
  }
});
