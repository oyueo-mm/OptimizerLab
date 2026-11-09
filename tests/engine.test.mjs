import test from 'node:test';
import assert from 'node:assert/strict';
import {OPTIMIZERS,LANDSCAPES,getLandscape,gradient,simulate,sampleRange} from '../src/engine.js';
const almost=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} differs from ${b}`);
const bowl=getLandscape('bowl'),start={x:1,y:-1};
test('all registered optimizers and surfaces are finite at their starting points',()=>{
  assert.equal(OPTIMIZERS.length,41);assert.equal(LANDSCAPES.length,9);
  for(const field of LANDSCAPES){const sample=sampleRange(field);assert.ok(Number.isFinite(sample.min)&&Number.isFinite(sample.max));assert.ok(sample.max>sample.min);}
  for(const opt of OPTIMIZERS){const sim=simulate(opt,bowl,start,{lr:opt.defaults.lr,steps:20});assert.ok(sim.history.length>=2&&sim.history.length<=21,opt.id);assert.ok(sim.status==='complete'||sim.status==='converged',opt.id);assert.ok(sim.history.every(p=>Number.isFinite(p.loss)&&Number.isFinite(p.x)&&Number.isFinite(p.y)),opt.id);}
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

test('registered optimizer ids and descriptions are unique',()=>{assert.equal(new Set(OPTIMIZERS.map(x=>x.id)).size,OPTIMIZERS.length);assert.ok(OPTIMIZERS.every(x=>x.formula&&x.description&&x.defaults.lr>0));});
test('newton converges on the quadratic bowl',()=>{const r=simulate('newton',bowl,start,{lr:1,steps:3});assert.ok(r.history[1].loss<1e-7,'Newton first update should solve a quadratic');});
test('quasi-Newton and nonlinear CG reduce a convex quadratic with backtracking',()=>{for(const id of ['bfgs','lbfgs','nonlinear-cg']){const path=simulate(id,bowl,start,{lr:1,steps:20}).history;for(let i=1;i<path.length;i++)assert.ok(path[i].loss<=path[i-1].loss+1e-10,id+' should not raise loss in line-search mode');assert.ok(path.at(-1).loss<path[0].loss,id);}});
test('RProp flips its update direction with gradient sign',()=>{const p=simulate('rprop',bowl,start,{lr:0.1,steps:1}).history[1];almost(p.x,0.9);almost(p.y,-0.9);});
test('SGDW decays weights separately from momentum update',()=>{const sgdw=simulate('sgdw',bowl,start,{lr:0.1,steps:1,weightDecay:0.2,momentum:0}).history[1];const sgd=simulate('sgd',bowl,start,{lr:0.1,steps:1}).history[1];almost(sgdw.x-sgd.x,-0.02);almost(sgdw.y-sgd.y,0.02);});
test('optimistic gradient descent doubles initial step when no previous gradient exists',()=>{const opt=simulate('optimistic',bowl,start,{lr:0.1,steps:1}).history[1];almost(opt.x,0.864);almost(opt.y,-0.672);});

test('Korean names are shown for all objective functions',()=>{assert.ok(LANDSCAPES.every(l=>/[가-힣]/.test(l.name)));});
test('new Adam-family implementations preserve expected bias correction on step one',()=>{const options={lr:0.1,steps:1,weightDecay:0};const adam=simulate('adam',bowl,start,options).history[1];for(const id of ['yogi','qhadam']){const value=simulate(id,bowl,start,options).history[1];almost(value.x,adam.x,1e-4);almost(value.y,adam.y,1e-4);}const belief=simulate('adabelief',bowl,start,options).history[1];assert.ok(belief.x<adam.x,'AdaBelief squares gradient residuals rather than raw gradients');});
test('RAdam and Ranger use unrectified first step before variance estimates stabilize',()=>{for(const id of ['radam','radamw','ranger']){const p=simulate(id,bowl,start,{lr:0.1,steps:1,weightDecay:0}).history[1];almost(p.x,0.932);almost(p.y,-0.836);}});
test('LARS and LAMB respond to layer trust ratio without division by zero',()=>{for(const id of ['lars','lamb']){const r=simulate(id,bowl,{x:0,y:0},{lr:0.1,steps:10});assert.ok(r.history.every(p=>Number.isFinite(p.loss)),id);}});
