import test from 'node:test';
import assert from 'node:assert/strict';
import {activePreviewEnd,previewFrame,previewCamera} from '../src/preview.js';
test('catalog preview finishes movement quickly and loops after a short pause',()=>{assert.equal(previewFrame(0,60),0);assert.ok(Math.abs(previewFrame(1.4,60)-30)<1e-9);assert.equal(previewFrame(2.9,60),60);assert.ok(previewFrame(3.25,60)<5);});
test('catalog preview excludes a long stationary tail',()=>{const history=[{x:0,y:0},{x:0.6,y:0},{x:1.5,y:1},...Array.from({length:110},()=>({x:1.5,y:1}))];const end=activePreviewEnd(history);assert.ok(end>=2&&end<=8,'trimmed to useful movement');});
test('catalog framing keeps the whole trajectory visible while filling the card',()=>{const path=[{x:-2.4,y:1.9},{x:-1.9,y:1.5},{x:-1.2,y:.9}];const w=250,h=172,c=previewCamera(path,w,h);assert.ok(Number.isFinite(c.scale)&&c.scale>1);for(const p of path){const x=w/2+(p.x-c.x)*c.scale,y=h/2-(p.y-c.y)*c.scale;assert.ok(x>0&&x<w,'x inside preview');assert.ok(y>0&&y<h,'y inside preview');}});
test('static paths still render with finite framing',()=>{const p=previewCamera([{x:0,y:0}],80,136);assert.ok(p.scale>0&&Number.isFinite(p.scale));assert.equal(activePreviewEnd([{x:0,y:0}]),0);});
