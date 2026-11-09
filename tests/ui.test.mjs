import test from 'node:test';
import assert from 'node:assert/strict';
test('the application boots into the four-card home without a browser dependency',async()=>{
  const root={innerHTML:''};
  globalThis.window={matchMedia:()=>({matches:true})};
  globalThis.document={title:'',querySelector:s=>s==='#app'?root:null,querySelectorAll:()=>[],addEventListener:()=>{}};
  globalThis.requestAnimationFrame=()=>0;
  await import('../src/app.js');
  assert.match(root.innerHTML,/OptimizerLab/);
  assert.match(root.innerHTML,/data-preview="sgd"/);
  assert.match(root.innerHTML,/data-preview="momentum"/);
  assert.match(root.innerHTML,/data-preview="adamw"/);
  assert.match(root.innerHTML,/data-preview="adam"/);
  assert.match(root.innerHTML,/data-nav="experiment"/);
  assert.match(root.innerHTML,/data-nav="compare"/);
});
