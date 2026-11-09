import test from 'node:test';
import assert from 'node:assert/strict';
test('the application boots into the four-card home without a browser dependency',async()=>{
  const root={innerHTML:''};
  globalThis.window={matchMedia:()=>({matches:true}),addEventListener:()=>{}};
  globalThis.document={title:'',querySelector:s=>s==='#app'?root:null,querySelectorAll:()=>[],addEventListener:()=>{}};
  globalThis.requestAnimationFrame=()=>0;
  await import('../src/app.js');
  assert.match(root.innerHTML,/OptimizerLab/);
  assert.doesNotMatch(root.innerHTML,/EXPLORE|12 optimizers|Optimization, visualized|공을 놓고, 움직임을 관찰하세요/);
  assert.match(root.innerHTML,/data-preview="sgd"/);
  assert.match(root.innerHTML,/data-preview="momentum"/);
  assert.match(root.innerHTML,/data-preview="adamw"/);
  assert.match(root.innerHTML,/data-preview="adam"/);
  assert.match(root.innerHTML,/data-nav="experiment"/);
  assert.match(root.innerHTML,/data-nav="compare"/);
});
