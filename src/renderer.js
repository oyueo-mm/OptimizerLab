import {sampleRange,gradient} from './engine.js';
import {previewCamera} from './preview.js';
const COLOR_STOPS=[[18,43,140],[16,104,202],[17,183,203],[26,189,119],[143,213,58],[246,213,56],[246,132,42],[210,38,60]];
function paletteRgb(t,brightness=1){const f=Math.max(0,Math.min(.999999,t))*(COLOR_STOPS.length-1),i=Math.floor(f),w=f-i;return COLOR_STOPS[i].map((v,k)=>Math.round(Math.max(0,Math.min(255,(v*(1-w)+COLOR_STOPS[i+1][k]*w)*brightness))));}
function palette(t,brightness=1){return 'rgb('+paletteRgb(t,brightness).join(',')+')';}
const interpolate=(a,b,t)=>a+(b-a)*t;
export class SurfaceRenderer{
  constructor(canvas,opts={}){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    this.mode=opts.mode||'2d';this.field=opts.field;this.preview=!!opts.preview;this.showVectors=false;this.catalogPreview=opts.previewKind==='catalog';this.previewFocus=null;this.previewPath=null;
    this.yaw=0.68;this.pitch=0.73;this.zoom=1;
    this.onPlace=opts.onPlace;this.dragging=false;this.dragMoved=false;this.drawData=[];this.current=0;
    this.range=sampleRange(this.field,this.preview?32:64);this.cache=null;this.meshSamples=null;this.triangles=[];this.visible=true;this.pendingDraw=0;
    this.handleDown=e=>this.pointerDown(e);this.handleMove=e=>this.pointerMove(e);this.handleUp=e=>this.pointerUp(e);
    this.handleWheel=e=>{if(!this.preview){e.preventDefault();this.zoom=Math.max(0.6,Math.min(2.3,this.zoom*(e.deltaY>0?0.91:1.09)));this.invalidate();this.draw();}};
    this.canvas.addEventListener('pointerdown',this.handleDown);this.canvas.addEventListener('pointermove',this.handleMove);this.canvas.addEventListener('pointerup',this.handleUp);this.canvas.addEventListener('pointercancel',this.handleUp);this.canvas.addEventListener('wheel',this.handleWheel,{passive:false});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);this.resize();
  }
  destroy(){if(this.pendingDraw)cancelAnimationFrame(this.pendingDraw);this.resizeObserver.disconnect();this.canvas.removeEventListener('pointerdown',this.handleDown);this.canvas.removeEventListener('pointermove',this.handleMove);this.canvas.removeEventListener('pointerup',this.handleUp);this.canvas.removeEventListener('pointercancel',this.handleUp);this.canvas.removeEventListener('wheel',this.handleWheel);}
  resize(){
    const b=this.canvas.getBoundingClientRect();this.w=Math.max(80,b.width||360);this.h=Math.max(70,b.height||230);
    const dpr=Math.min(window.devicePixelRatio||1,this.preview?1.25:1.8);
    const pw=Math.round(this.w*dpr),ph=Math.round(this.h*dpr);
    if(this.canvas.width!==pw||this.canvas.height!==ph){this.canvas.width=pw;this.canvas.height=ph;}
    this.dpr=dpr;if(this.catalogPreview&&this.previewPath)this.previewFocus=previewCamera(this.previewPath,this.w,this.h);this.invalidate();this.draw();
  }
  setField(field){this.field=field;this.range=sampleRange(field,this.preview?32:64);this.meshSamples=null;this.invalidate();this.draw();}
  setScene(field,series,step=0){this.field=field;this.range=sampleRange(field,this.preview?32:64);this.meshSamples=null;this.drawData=series||[];this.current=step;this.invalidate();this.draw();}
  setMode(mode){if(this.mode!==mode){this.mode=mode;this.invalidate();this.draw();}}
  setVectors(visible){this.showVectors=!!visible;this.draw();}
  setFrame(series,step){this.drawData=series||[];this.current=step||0;this.draw();}
  invalidate(){this.cache=null;}
  setPreviewPath(history){if(!this.catalogPreview)return;this.previewPath=history;this.previewFocus=previewCamera(history,this.w,this.h);this.invalidate();this.draw();}
  heightAt(x,y){const t=(this.field.fn(x,y)-this.range.min)/(this.range.max-this.range.min||1);return Math.max(-0.4,Math.min(1.6,t));}
  map2D(x,y){if(this.catalogPreview&&this.previewFocus){const c=this.previewFocus;return {x:this.w/2+(x-c.x)*c.scale,y:this.h/2-(y-c.y)*c.scale};}const r=this.field.range;const pad=this.preview?6:30;const s=Math.min((this.w-2*pad)/(2*r),(this.h-2*pad)/(2*r))*this.zoom;return {x:this.w/2+x*s,y:this.h/2-y*s};}
  project(x,y,z=this.heightAt(x,y)){
    const r=this.field.range,a=x/r,b=y/r;
    const ca=Math.cos(this.yaw),sa=Math.sin(this.yaw),c=a*ca-b*sa,d=a*sa+b*ca;
    const scale=Math.min(this.w*(this.preview?.31:.31),this.h*(this.preview?.52:.48))*this.zoom;
    return {x:this.w/2+c*scale,y:this.h*0.52+(d*Math.sin(this.pitch)-(z-0.45)*0.95*Math.cos(this.pitch))*scale,depth:d*Math.cos(this.pitch)+(z-0.45)*0.95*Math.sin(this.pitch)};
  }
  buildCache(){
    const c=document.createElement('canvas');c.width=this.canvas.width;c.height=this.canvas.height;
    const g=c.getContext('2d');g.setTransform(this.dpr,0,0,this.dpr,0,0);
    g.fillStyle='#f6f9fc';g.fillRect(0,0,this.w,this.h);
    if(this.mode==='2d')this.draw2D(g);else this.draw3D(g);
    this.cache=c;
  }
  drawCatalog2D(g){
    const nx=Math.max(40,Math.round(this.w/4)),ny=Math.max(30,Math.round(this.h/4)),focus=this.previewFocus||{x:0,y:0,scale:Math.max(1,this.h/(2*this.field.range))};
    const vals=[],w=this.w,h=this.h;let min=Infinity,max=-Infinity;
    for(let j=0;j<=ny;j++){const row=[];for(let i=0;i<=nx;i++){const x=focus.x+(i*w/nx-w/2)/focus.scale,y=focus.y+(h/2-j*h/ny)/focus.scale,z=this.field.fn(x,y);row.push(z);min=Math.min(min,z);max=Math.max(max,z);}vals.push(row);}
    const raster=document.createElement('canvas');raster.width=nx+1;raster.height=ny+1;const ctx=raster.getContext('2d'),img=ctx.createImageData(nx+1,ny+1),span=Math.max(1e-8,max-min);
    for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){const t=Math.pow(Math.max(0,Math.min(1,(vals[j][i]-min)/span)),0.7),k=(j*(nx+1)+i)*4;img.data[k]=Math.round(238-112*t);img.data[k+1]=Math.round(245-76*t);img.data[k+2]=Math.round(252-43*t);img.data[k+3]=255;}
    ctx.putImageData(img,0,0);g.imageSmoothingEnabled=true;g.drawImage(raster,0,0,w,h);
    g.strokeStyle='rgba(255,255,255,.8)';g.lineWidth=1.15;
    for(let levelIndex=1;levelIndex<10;levelIndex++){const level=min+span*levelIndex/10;g.beginPath();
      for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
        const v=[vals[j][i],vals[j][i+1],vals[j+1][i+1],vals[j+1][i]],x=i*w/nx,y=j*h/ny,dx=w/nx,dy=h/ny,vertices=[[x,y],[x+dx,y],[x+dx,y+dy],[x,y+dy]],cuts=[];
        for(let edge=0;edge<4;edge++){const next=(edge+1)%4;if((v[edge]<level)!==(v[next]<level)){const ratio=(level-v[edge])/(v[next]-v[edge]);cuts.push([interpolate(vertices[edge][0],vertices[next][0],ratio),interpolate(vertices[edge][1],vertices[next][1],ratio)]);}}
        if(cuts.length>=2){g.moveTo(...cuts[0]);g.lineTo(...cuts[1]);if(cuts.length===4){g.moveTo(...cuts[2]);g.lineTo(...cuts[3]);}}
      }g.stroke();
    }
  }
  draw2D(g){
    if(this.catalogPreview){this.drawCatalog2D(g);return;}
    const r=this.field.range,pad=this.preview?5:30,scale=Math.min((this.w-2*pad)/(2*r),(this.h-2*pad)/(2*r))*this.zoom;
    const left=this.w/2-r*scale,top=this.h/2-r*scale,size=2*r*scale;
    const n=this.preview?48:128,b=this.range;
    const small=document.createElement('canvas');small.width=n;small.height=n;
    const data=small.getContext('2d').createImageData(n,n);
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const x=(i/(n-1)*2-1)*r,y=(1-j/(n-1)*2)*r;
      const t=(this.field.fn(x,y)-b.min)/(b.max-b.min||1);
      const color=paletteRgb(Math.pow(Math.max(0,Math.min(1,t)),.8));const k=(j*n+i)*4;
      for(let z=0;z<3;z++)data.data[k+z]=color[z];data.data[k+3]=255;
    }
    small.getContext('2d').putImageData(data,0,0);g.save();g.beginPath();g.rect(0,0,this.w,this.h);g.clip();g.imageSmoothingEnabled=true;g.drawImage(small,left,top,size,size);
    const N=this.preview?28:58;const heights=[];
    for(let j=0;j<=N;j++){const row=[];for(let i=0;i<=N;i++)row.push(this.field.fn(-r+2*r*i/N,r-2*r*j/N));heights.push(row);}
    g.strokeStyle='rgba(255,255,255,.73)';g.lineWidth=this.preview?0.75:1.1;
    const edge=(a,b,va,vb,level)=>{const t=(level-va)/(vb-va||1e-12);return [interpolate(a[0],b[0],t),interpolate(a[1],b[1],t)];};
    for(let k=1;k<=9;k++){
      const level=b.min+(b.max-b.min)*k/10;g.beginPath();
      for(let j=0;j<N;j++)for(let i=0;i<N;i++){
        const v=[heights[j][i],heights[j][i+1],heights[j+1][i+1],heights[j+1][i]];
        const x=left+i*size/N,y=top+j*size/N,s=size/N;
        const pts=[[x,y],[x+s,y],[x+s,y+s],[x,y+s]];const cuts=[];
        for(let e=0;e<4;e++){const q=(e+1)%4;if((v[e]<level)!==(v[q]<level))cuts.push(edge(pts[e],pts[q],v[e],v[q],level));}
        if(cuts.length>=2){g.moveTo(...cuts[0]);g.lineTo(...cuts[1]);if(cuts.length===4){g.moveTo(...cuts[2]);g.lineTo(...cuts[3]);}}
      }g.stroke();
    }
    if(!this.preview){g.strokeStyle='rgba(26,67,113,.14)';g.lineWidth=1;g.strokeRect(left,top,size,size);}
    g.restore();
  }
  surfaceMesh(N){
    if(this.meshSamples&&this.meshSamples.N===N&&this.meshSamples.field===this.field)return this.meshSamples.rows;
    const r=this.field.range,rows=[];
    for(let j=0;j<=N;j++){const row=[];for(let i=0;i<=N;i++){const x=-r+2*r*i/N,y=-r+2*r*j/N;row.push({x,y,z:this.heightAt(x,y)});}rows.push(row);}
    this.meshSamples={N,field:this.field,rows};return rows;
  }
  requestDraw(){
    if(this.pendingDraw)return;
    this.pendingDraw=requestAnimationFrame(()=>{this.pendingDraw=0;this.draw();});
  }
  draw3D(g){
    const N=this.preview?36:76,r=this.field.range;
    const vertices=this.surfaceMesh(N).map(row=>row.map(p=>({...this.project(p.x,p.y,p.z),wx:p.x,wy:p.y,z:p.z})));
    const cells=[];this.triangles=[];
    const step=2*r/N;
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const a=vertices[j][i],b=vertices[j][i+1],c=vertices[j+1][i+1],d=vertices[j+1][i];
      const depth=(a.depth+b.depth+c.depth+d.depth)/4,z=(a.z+b.z+c.z+d.z)/4;
      const dzdx=((b.z-a.z)+(c.z-d.z))/(2*step),dzdy=((d.z-a.z)+(c.z-b.z))/(2*step);
      const nx=-dzdx*4.0,ny=-dzdy*4.0,nz=1;
      const lambert=(nx*(-.5)+ny*(-.55)+nz*.8)/Math.sqrt((nx*nx+ny*ny+nz*nz)*(.5*.5+.55*.55+.8*.8));
      const brightness=Math.max(.53,Math.min(1.15,.75+.47*lambert));
      cells.push({v:[a,b,c,d],depth,z,brightness});
      this.triangles.push([a,b,c],[a,c,d]);
    }
    cells.sort((a,b)=>a.depth-b.depth);
    g.lineJoin='round';
    for(const cell of cells){
      g.beginPath();g.moveTo(cell.v[0].x,cell.v[0].y);for(let i=1;i<4;i++)g.lineTo(cell.v[i].x,cell.v[i].y);g.closePath();
      g.fillStyle=palette(cell.z,cell.brightness);g.fill();
      if(!this.preview){g.strokeStyle='rgba(255,255,255,.12)';g.lineWidth=.22;g.stroke();}
    }
    if(!this.preview){
      g.save();g.font='11px system-ui';g.fillStyle='rgba(51,78,108,.72)';
      const xp=this.project(r,-r,0),yp=this.project(-r,r,0);g.fillText('θ₁',Math.min(this.w-25,Math.max(8,xp.x)),Math.min(this.h-10,Math.max(12,xp.y)));g.fillText('θ₂',Math.min(this.w-25,Math.max(8,yp.x)),Math.min(this.h-10,Math.max(12,yp.y)));
      g.restore();
    }
  }
  toScreen(point){return this.mode==='2d'?this.map2D(point.x,point.y):this.project(point.x,point.y);}
  draw(series=this.drawData,step=this.current){
    if(!this.ctx)return;if(!this.cache)this.buildCache();
    const g=this.ctx;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,this.canvas.width,this.canvas.height);g.drawImage(this.cache,0,0);
    g.setTransform(this.dpr,0,0,this.dpr,0,0);
    for(let n=0;n<series.length;n++){
      const entry=series[n],points=entry.history||[],col=entry.color||'#ed8731';if(!points.length)continue;
      const t=Math.max(0,Math.min(step,points.length-1)),whole=Math.floor(t),frac=t-whole;
      const now=whole<points.length-1?{x:interpolate(points[whole].x,points[whole+1].x,frac),y:interpolate(points[whole].y,points[whole+1].y,frac)}:points[whole];
      g.save();const lineWidth=this.catalogPreview?3.5:this.preview?2.9:3.5;g.lineJoin='round';g.lineCap='round';g.globalAlpha=1;g.beginPath();
      const trace=(from,to)=>{const distance=Math.hypot(to.x-from.x,to.y-from.y),segments=this.mode==='3d'?Math.min(28,Math.max(1,Math.ceil(distance/(this.field.range*.055)))):1;for(let k=1;k<=segments;k++){const u=k/segments,p=this.toScreen({x:interpolate(from.x,to.x,u),y:interpolate(from.y,to.y,u)});g.lineTo(p.x,p.y);}};
      const start=this.toScreen(points[0]);g.moveTo(start.x,start.y);
      for(let j=1;j<=whole;j++)trace(points[j-1],points[j]);
      if(frac>0)trace(points[whole],now);
      g.strokeStyle='rgba(12,26,42,.82)';g.lineWidth=lineWidth+3.3;g.shadowBlur=0;g.stroke();g.strokeStyle=col;g.lineWidth=lineWidth;g.shadowColor=col;g.shadowBlur=this.preview?1:4;g.stroke();g.shadowBlur=0;
      if(this.showVectors&&!this.preview){
        const gradVec=gradient(this.field.fn,now.x,now.y),mag=Math.hypot(...gradVec);
        const future=points[Math.min(points.length-1,whole+1)],update=[future.x-now.x,future.y-now.y],umag=Math.hypot(...update);
        const origin=this.toScreen(now);
        const arrow=(vec,length,color)=>{
          const n=Math.hypot(...vec);if(n<1e-9)return;
          const r=this.field.range,dest=this.toScreen({x:Math.max(-r,Math.min(r,now.x+vec[0]/n*length)),y:Math.max(-r,Math.min(r,now.y+vec[1]/n*length))});
          const vx=dest.x-origin.x,vy=dest.y-origin.y,d=Math.hypot(vx,vy);if(d<3)return;
          const ux=vx/d,uy=vy/d;
          g.beginPath();g.moveTo(origin.x,origin.y);g.lineTo(dest.x,dest.y);g.moveTo(dest.x,dest.y);g.lineTo(dest.x-9*ux-4*uy,dest.y-9*uy+4*ux);g.moveTo(dest.x,dest.y);g.lineTo(dest.x-9*ux+4*uy,dest.y-9*uy-4*ux);
          g.strokeStyle=color;g.lineWidth=2;g.shadowBlur=0;g.stroke();
        };
        if(mag>1e-9)arrow([-gradVec[0],-gradVec[1]],this.field.range*.23,'#378ada');
        if(umag>1e-9)arrow(update,this.field.range*.23,'#ea9237');
      }
      const p=this.toScreen(now);const radius=this.catalogPreview?7:this.preview?5.6:7.8;
      const grad=g.createRadialGradient(p.x-radius*.32,p.y-radius*.36,0,p.x,p.y,radius*1.22);
      grad.addColorStop(0,'#ffffff');grad.addColorStop(.16,col);grad.addColorStop(1,'#1e293b');
      g.fillStyle=grad;g.beginPath();g.arc(p.x,p.y,radius,0,Math.PI*2);g.fill();
      g.strokeStyle='#162638';g.lineWidth=this.preview?3:4;g.stroke();g.strokeStyle='#fff';g.lineWidth=this.preview?1.5:2;g.stroke();if(this.catalogPreview){const first=this.toScreen(points[0]);g.beginPath();g.arc(first.x,first.y,3,0,Math.PI*2);g.fillStyle='#fff';g.fill();g.lineWidth=1.6;g.strokeStyle=col;g.stroke();}
      g.restore();
    }
  }
  pick(cx,cy){
    if(this.mode==='2d'){
      const r=this.field.range,pad=this.preview?6:30,s=Math.min((this.w-2*pad)/(2*r),(this.h-2*pad)/(2*r))*this.zoom;
      const x=(cx-this.w/2)/s,y=(this.h/2-cy)/s;
      return Math.abs(x)<=r&&Math.abs(y)<=r?{x,y}:null;
    }
    let best=null,bestDepth=-Infinity;
    const bary=(a,b,c,x,y)=>{
      const det=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
      if(Math.abs(det)<1e-7)return null;
      const u=((b.y-c.y)*(x-c.x)+(c.x-b.x)*(y-c.y))/det;
      const v=((c.y-a.y)*(x-c.x)+(a.x-c.x)*(y-c.y))/det;
      const w=1-u-v;return u>=-0.001&&v>=-0.001&&w>=-0.001?[u,v,w]:null;
    };
    for(const tri of this.triangles){
      const k=bary(...tri,cx,cy);if(!k)continue;
      const depth=k[0]*tri[0].depth+k[1]*tri[1].depth+k[2]*tri[2].depth;
      if(depth>bestDepth){bestDepth=depth;best={x:k[0]*tri[0].wx+k[1]*tri[1].wx+k[2]*tri[2].wx,y:k[0]*tri[0].wy+k[1]*tri[1].wy+k[2]*tri[2].wy};}
    }
    return best;
  }
  pointerDown(e){if(this.preview||!this.onPlace)return;this.dragging=true;this.dragMoved=false;this.pointerX=e.clientX;this.pointerY=e.clientY;this.downX=e.clientX;this.downY=e.clientY;this.canvas.setPointerCapture(e.pointerId);}
  pointerMove(e){
    if(!this.dragging)return;const dx=e.clientX-this.pointerX,dy=e.clientY-this.pointerY;
    if(Math.hypot(e.clientX-this.downX,e.clientY-this.downY)>5)this.dragMoved=true;
    if(this.mode==='3d'&&this.dragMoved){this.yaw+=dx*0.008;this.pitch=Math.max(.22,Math.min(1.36,this.pitch+dy*.006));this.invalidate();this.requestDraw();}
    this.pointerX=e.clientX;this.pointerY=e.clientY;
  }
  pointerUp(e){
    if(!this.dragging)return;this.dragging=false;
    if(this.dragMoved&&this.mode==='3d'){if(this.pendingDraw){cancelAnimationFrame(this.pendingDraw);this.pendingDraw=0;}this.invalidate();this.draw();}
    if(!this.dragMoved&&this.onPlace){const r=this.canvas.getBoundingClientRect();const picked=this.pick(e.clientX-r.left,e.clientY-r.top);if(picked)this.onPlace(picked);}
  }
}
