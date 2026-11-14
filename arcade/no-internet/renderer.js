/* World-space renderer: shared projection, depth queue and bounded art-medium passes. */
(() => {
  'use strict';
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = n => (n = clamp(n), n * n * (3 - 2 * n));
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const dot = (a, b) => a.reduce((n, v, i) => n + v * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const d = Math.hypot(...a) || 1; return a.map(v => v / d); };
  const CUBE = [[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];
  const FACES = [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]];
  const SHADE = [.60,.86,.75,.94,1.12,.45];
  const GRAY = [83,83,83], CHROME = [174,218,233], GREEN = [193,255,105];

  class DinoRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.faces = [];this.cost=0;this.sceneryLimit=2000;
      this.art=new DinoArt();this.medium='pixel-8';
      this.pixelCanvas=document.createElement('canvas');this.pixelContext=this.pixelCanvas.getContext('2d',{alpha:false});
      this.patterns={};
      // One reusable outgoing world target, plus the small shared pixel raster.
      this.blendCanvas=document.createElement('canvas');
      this.blendContext=this.blendCanvas.getContext('2d',{alpha:false});
      this.lastScenery={};this.handoff=null;this.lastRun=null;
      this.visual={bend:0,lift:0};
      this.stats = { polygons: 0, renderMs: 0, maxPolygons: 0 };
      this.resize();
    }
    resize() {
      this.w = innerWidth; this.h = innerHeight;
      this.dpr = Math.min(devicePixelRatio || 1, 1.6, Math.sqrt(4000000 / (this.w * this.h)));
      this.canvas.width = Math.max(1,Math.floor(this.w * this.dpr));
      this.canvas.height = Math.max(1,Math.floor(this.h * this.dpr));
      this.ctx.setTransform(this.canvas.width/this.w, 0, 0, this.canvas.height/this.h, 0, 0);
      // Exactly one full world buffer (<=4M pixels), shared small raster (<=~231K).
      // Matching backing dimensions avoids reallocating the pixel raster between passes.
      this.blendCanvas.width=this.canvas.width;this.blendCanvas.height=this.canvas.height;
      this.blendContext.setTransform(this.blendCanvas.width/this.w,0,0,this.blendCanvas.height/this.h,0,0);
    }
    pose(scene) {
      const base=[-.36,this.w<600?15:13,5.2,.9,6,.43];
      return ({corkscrew:[-.08,18,2.8,0,7,.46],dream:[-.42,21,18,0,7,.45],
        desktop:[-.12,18,8,.4,8,.46],crash:[-.12,18,8,.4,8,.46],
        stampede:[-.14,24,10,1,11,.47],coalesce:[-.12,24,8,3,14,.47],
        finale:[-.30,15,5.5,1,6,.45]})[scene]||base;
    }
    camera(s) {
      this.s=s;this.hero=false;
      const b=s.projectionBlend, blend=smooth(s.sceneTime/1.2);
      const from=this.pose(s.previousScene), to=this.pose(s.scene);
      const pose=to.map((v,i)=>mix(from[i],v,blend));
      if(s.scene==='collapse')pose.splice(0,6,...this.pose('finale'));
      if(s.reducedMotion) {
        const stable=this.pose('track');
        for(let i=0;i<pose.length;i++)pose[i]=mix(stable[i],pose[i],.4);
      }
      const angle=mix(-Math.PI/2,pose[0],b), distance=mix(24,pose[1],b);
      const target=[0,mix(0,pose[3],b),mix(0,pose[4],b)];
      const eye=[Math.sin(angle)*distance,mix(0,pose[2],b),target[2]-Math.cos(angle)*distance];
      const forward=norm(sub(target,eye)),right=norm(cross(forward,[0,1,0])),up=cross(right,forward);
      const scale=mix(this.w<600?23:28,Math.min(this.w*1.2,this.h*.94)/24,b);
      this.cam={eye,forward,right,up,b,focal:scale*24,
        cx:mix(this.w*(this.w<600?.19:.22),this.w*.5,b),cy:mix(this.h*.70,this.h*pose[5],b)};
    }
    transform(p) {
      const s=this.s;let [x,y,z]=p;
      x+=Math.sin(z*.085)*this.visual.bend*smooth(Math.max(0,z)/12);
      y+=this.visual.lift;
      if(s.scene==='crash') {y-=s.sceneTime*s.sceneTime*7;x+=Math.sin(z)*s.sceneTime;}
      if(s.scene==='collapse' && !this.gameplay) {
        const f=smooth(s.sceneTime/2.0), k=1-f;
        const angle=s.reducedMotion?0:f*2.1;
        const xx=x*Math.cos(angle)-y*Math.sin(angle);
        y=(x*Math.sin(angle)+y*Math.cos(angle))*k;x=xx*k;z*=k;
      }
      const roll=s.reducedMotion?Math.sin(s.worldRoll)*.18:s.worldRoll;
      const co=Math.cos(roll),si=Math.sin(roll);
      return [x*co-y*si,x*si+y*co,z];
    }
    view(p) {
      const d=sub(this.transform(p),this.cam.eye);
      return [dot(d,this.cam.right),dot(d,this.cam.up),dot(d,this.cam.forward)];
    }
    project(p) {
      const c = this.cam, k = c.focal / mix(24, Math.max(.35, p[2]), c.b);
      return [c.cx + p[0] * k, c.cy - p[1] * k];
    }
    polygon(vertices, color, shade = 1, edge = null, viewed = false) {
      // Leave 600 of the 2600 commands for the hero, nearest hazards, shadow and marker.
      if (this.cost >= (this.gameplay?2600:this.sceneryLimit)) return;
      let v = viewed ? vertices : vertices.map(p => this.view(p));
      // Clip in camera space before division; geometry can safely pass behind the viewer.
      const clipped = [];
      for (let i = 0; i < v.length; i++) {
        const a = v[i], b = v[(i + 1) % v.length], ai = a[2] >= .35, bi = b[2] >= .35;
        if (ai) clipped.push(a);
        if (ai !== bi) {
          const t = (.35 - a[2]) / (b[2] - a[2]);
          clipped.push(a.map((n, j) => mix(n, b[j], t)));
        }
      }
      v = clipped;
      if (v.length < 3) return;
      const points = v.map(p => this.project(p));
      if (points.every(p => p[0] < -2) || points.every(p => p[0] > this.w + 2) || points.every(p => p[1] < -2) || points.every(p => p[1] > this.h + 2)) return;
      const depth = v.reduce((n, p) => n + p[2], 0) / v.length;
      const fog = this.cam.b * clamp((depth - 28) / 100) * .6;
      if(this.medium==='ink-comic') {color=shade<.7?[33,28,33]:color[0]>color[1]*1.18?[214,54,52]:[248,231,196];shade=1;}
      else if(this.medium==='cel-cartoon')shade=shade<.8?.8:1.05;
      else if(this.medium==='pixel-16')shade=Math.round(shade*4)/4;
      const rgb = color.map((n, i) => Math.round(mix(clamp(n * shade, 0, 255), this.background[i], fog)));
      this.cost++;
      this.faces.push({ points, depth, layer: this.layer, color: `rgb(${rgb.join(',')})`, edge, opacity:this.opacity??1, material:color.join(','), order: this.faces.length });
    }
    box(x, y, z, sx, sy, sz, color, angle = 0) {
      if(this.cost>=(this.gameplay?2600:this.sceneryLimit))return;
      const co = Math.cos(angle), si = Math.sin(angle);
      const verts = CUBE.map(p => this.view([x + p[0] * sx * co - p[1] * sy * si, y + p[0] * sx * si + p[1] * sy * co, z + p[2] * sz]));
      for (let f = 0; f < 6; f++) {
        const indices = FACES[f];
        const a = verts[indices[0]], b = verts[indices[1]], c = verts[indices[2]];
        // Positive-forward view coordinates reverse handedness.
        if (dot(cross(sub(b,a), sub(c,a)), a) <= 0) continue;
        this.polygon(indices.map(i => verts[i]), color, SHADE[f],null,true);
      }
    }
    imageQuad(image,rect,vertices,anchor=null,billboard=false) {
      if(this.cost>=(this.gameplay?2600:this.sceneryLimit))return;
      const v=vertices.map(p=>this.view(p));
      if(v.some(p=>p[2]<.35))return;
      const points=v.map(p=>this.project(p));
      if(points.every(p=>p[0]<-2)||points.every(p=>p[0]>this.w+2)||points.every(p=>p[1]<-2)||points.every(p=>p[1]>this.h+2))return;
      const error=Math.hypot(points[0][0]+points[2][0]-points[1][0]-points[3][0],points[0][1]+points[2][1]-points[1][1]-points[3][1]);
      const affine=error<(billboard?.75:.05) || (billboard && error<Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1])*.035);
      const units=affine?1:2;
      if(this.cost+units>(this.gameplay?2600:this.sceneryLimit))return;
      this.cost+=units;
      this.faces.push({image,rect,points,billboard,affine,units,opacity:this.opacity??1,depth:anchor?this.view(anchor)[2]:v.reduce((sum,p)=>sum+p[2],0)/4,layer:this.layer,order:this.faces.length});
    }
    sprite(frame,x,y,z,width,height) {
      if(!frame)return;
      const a=frame.anchor||[.5,1],r=norm([this.cam.right[0],0,this.cam.right[2]]);
      // Painted assets already contain an elevated perspective. Camera-facing up
      // avoids projecting that elevation twice; corners still traverse view/transform.
      const up=frame.billboard?this.cam.up:[0,1,0];
      const p=(u,v)=>[x+r[0]*(u-a[0])*width+up[0]*(a[1]-v)*height,y+up[1]*(a[1]-v)*height,z+r[2]*(u-a[0])*width+up[2]*(a[1]-v)*height];
      this.imageQuad(frame.image,frame.rect,[p(0,0),p(1,0),p(1,1),p(0,1)],[x,y,z],true);
    }
    pixelSprite(name,x,y,z,width,height) {
      const image=this.art.pixel[name];
      this.sprite({image,rect:[0,0,image.width,image.height]},x,y,z,width,height);
    }
    texture(c,f) {
      const [x,y,w,h]=f.rect,p=f.points,uv=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
      // A camera-facing sprite is one affine image, not two antialiased transparent halves.
      if(f.affine) {
        c.save();c.transform((p[1][0]-p[0][0])/w,(p[1][1]-p[0][1])/w,(p[3][0]-p[0][0])/h,(p[3][1]-p[0][1])/h,p[0][0],p[0][1]);
        c.drawImage(f.image,x,y,w,h,0,0,w,h);c.restore();return;
      }
      for(const tri of [[0,1,2],[0,2,3]]) {
        const [a,b,d]=tri.map(i=>p[i]),[u,v,t]=tri.map(i=>uv[i]);
        const det=(v[0]-u[0])*(t[1]-u[1])-(t[0]-u[0])*(v[1]-u[1]);
        const aa=((b[0]-a[0])*(t[1]-u[1])-(d[0]-a[0])*(v[1]-u[1]))/det;
        const bb=((b[1]-a[1])*(t[1]-u[1])-(d[1]-a[1])*(v[1]-u[1]))/det;
        const cc=((d[0]-a[0])*(v[0]-u[0])-(b[0]-a[0])*(t[0]-u[0]))/det;
        const dd=((d[1]-a[1])*(v[0]-u[0])-(b[1]-a[1])*(t[0]-u[0]))/det;
        c.save();c.beginPath();
        // Offset triangle EDGES, not radii: long thin ground strips still get half a pixel of coverage.
        const triangle=[a,b,d],sign=Math.sign((b[0]-a[0])*(d[1]-a[1])-(b[1]-a[1])*(d[0]-a[0]))||1;
        const cover=(q,i)=>{
          if(f.billboard)return q;
          const before=triangle[(i+2)%3],after=triangle[(i+1)%3];
          const normal=(from,to)=>{const dx=to[0]-from[0],dy=to[1]-from[1],len=Math.hypot(dx,dy)||1;return [dy/len*sign,-dx/len*sign];};
          const u=normal(before,q),v=normal(q,after),k=Math.min(3,.6/Math.max(.05,1+u[0]*v[0]+u[1]*v[1]));
          return [q[0]+(u[0]+v[0])*k,q[1]+(u[1]+v[1])*k];
        };
        c.moveTo(...cover(a,0));c.lineTo(...cover(b,1));c.lineTo(...cover(d,2));c.closePath();c.clip();
        c.transform(aa,bb,cc,dd,a[0]-aa*u[0]-cc*u[1],a[1]-bb*u[0]-dd*u[1]);
        const pad=f.billboard?0:1;
        c.drawImage(f.image,x-pad,y-pad,w+pad*2,h+pad*2,x-pad,y-pad,w+pad*2,h+pad*2);c.restore();
      }
    }
    // Rounded, genuinely world-space solids. One depth command retains each solid's
    // silhouette; its visible facets are shaded inside, not outlined like a wireframe.
    organic(x,y,z,sx,sy,sz,color,lod=false,outline=true) {
      if(this.cost+4>(this.gameplay?2600:this.sceneryLimit))return;
      const ink=this.medium==='ink-comic';
      const depth=this.view([x,y,z])[2],size=Math.max(sx,sy,sz)*this.cam.focal/mix(24,Math.max(.35,depth),this.cam.b);
      // Three projected-size tiers. Big heads get a round contour, distant pack members stay cheap.
      const n=size>100?12:lod?(size>20?6:4):size<18?6:8,rows=size>100?6:lod||size<18?3:4;
      const rings=[];
      for(let j=0;j<=rows;j++) {
        const a=Math.PI*j/rows;
        rings.push(Array.from({length:n},(_,i)=>{
          const b=i*Math.PI*2/n;
          return this.view([x+Math.sin(a)*Math.cos(b)*sx*.5,y+Math.cos(a)*sy*.5,z+Math.sin(a)*Math.sin(b)*sz*.5]);
        }));
      }
      if(rings.some(r=>r.some(p=>p[2]<.35)))return;
      const facets=[],all=[],centerDepth=this.view([x,y,z])[2];
      for(let j=0;j<rows;j++)for(let i=0;i<n;i++) {
        const v=[rings[j][i],rings[j][(i+1)%n],rings[j+1][(i+1)%n],rings[j+1][i]];
        const points=v.map(p=>this.project(p));all.push(...points);
        const depth=v.reduce((sum,p)=>sum+p[2],0)/4;
        if(depth>centerDepth+.015)continue;
        const shade=ink?(i%3===0?.82:1):j===0?1.13:i<n/2?.83:1;
        facets.push({points,depth,color:'rgb('+color.map(v=>Math.round(clamp(v*shade,0,255))).join(',')+')'});
      }
      const points=all.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
      const turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      const half=arr=>{const hull=[];for(const p of arr){while(hull.length>1&&turn(hull[hull.length-2],hull[hull.length-1],p)<=0)hull.pop();hull.push(p);}hull.pop();return hull;};
      const hull=half(points).concat(half(points.slice().reverse()));
      if(hull.length<3||hull.every(p=>p[0]<0)||hull.every(p=>p[0]>this.w)||hull.every(p=>p[1]<0)||hull.every(p=>p[1]>this.h))return;
      if(this.cost+facets.length+1>(this.gameplay?2600:this.sceneryLimit))return;
      this.cost+=facets.length+1;
      this.faces.push({points:hull,facets:facets.sort((a,b)=>b.depth-a.depth),color:facets[0].color,depth:this.view([x,y,z])[2],layer:this.layer,order:this.faces.length,organic:true,outline,opacity:this.opacity??1,material:color.join(',')});
    }
    drawnDino(s,o={}) {
      if(this.cost>=(this.gameplay?2600:this.sceneryLimit))return;
      const ink=this.medium==='ink-comic',k=o.scale||1,x=o.x||0,z=o.z||0,y=o.y??s.player.height;
      const squash=o.lod?1:1-Math.sin(clamp(s.impact/.32)*Math.PI)*.18;
      const color=this.hero&&s.recovery>0?[231,144,69]:(o.color||(ink?[245,231,200]:[65,200,142]));
      const accent=ink?[210,57,55]:[255,149,61],dark=ink?[28,25,31]:[29,47,72];
      const run=s.player.grounded?Math.sin(s.distance*3.8)*.16:.14;
      let part=0;
      const ball=(px,py,pz,sx,sy,sz,c=color)=>this.organic(x+px*k,y+py*k*squash,z+pz*k,sx*k/squash,sy*k*squash,sz*k,c,!!o.lod,![3,5].includes(part++));
      if(o.lod) {
        // Near pack members retain the hero's neck and articulated feet. At distance,
        // merge hidden joints, not head/body proportions, leaving room for the city.
        const near=z<8;
        ball(0,.95,0,.95,1.2,1.18);
        if(near)ball(0,1.55,.38,.68,.83,.64);
        ball(0,1.9,ink?.67:.45,ink?.98:1.25,.85,ink?1.22:1.05);
        ball(0,.78,-.95,.58,.53,1.55);
        for(const side of [-1,1]) {
          if(near)ball(side*.32,.3,side*run,.44,.6,.69,accent);
          else this.polygon([[x+(side*.32-.22)*k,y+.05*k,z+side*run*k],[x+(side*.32+.22)*k,y+.05*k,z+side*run*k],[x+(side*.32+.17)*k,y+.58*k,z-.12*k],[x+(side*.32-.17)*k,y+.58*k,z-.12*k]],accent);
        }
        this.polygon([[x-.12*k,y+1.48*k,z-.27*k],[x,y+1.88*k,z-.39*k],[x+.12*k,y+1.48*k,z-.57*k]],accent,1,dark);
        return;
      }
      ball(0,.95,0,.95,1.2,1.18);ball(0,.73,-.73,.58,.53,1.1);ball(0,.95,-1.25,.27,.28,.7);
      ball(0,1.55,.38,.68,.83,.64);ball(0,1.9,ink?.67:.45,ink?.98:1.25,.85,ink?1.22:1.05);
      // The cel hero glances back at the player; its cheek and oversized eyes read from this camera.
      ball(0,1.62,ink?.91:.04,ink?.87:1.05,.30,.64,ink?accent:[255,223,142]);
      for(const side of [-1,1]) {
        ball(side*.32,.35,-.13+side*run,.4,.63,.48);ball(side*.32,.12,.04+side*run,.44,.24,.69,accent);
        if(!o.lod || k>1.5) {
          ball(side*.46,1.13,.52,.24,.22,.56);
          ball(side*(ink?.5:.34),2.06,ink?.77:.06,ink?.14:.38,.38,.23,[255,250,222]);
          ball(side*(ink?.57:.34),2.07,ink?.85:-.07,ink?.07:.17,.21,.09,dark);
          this.box(x+side*(ink?.55:.34)*k,y+2.28*k,z+(ink?.77:.04)*k,(ink?.16:.42)*k,.07*k,.20*k,dark);
        }
      }
      for(let i=0;i<(o.lod?2:3);i++) {
        const zz=-.27-i*.36;
        this.polygon([[x-.12*k,y+(1.48-i*.14)*k,z+zz*k],[x,y+(1.88-i*.16)*k,z+(zz-.12)*k],[x+.12*k,y+(1.48-i*.14)*k,z+(zz-.3)*k]],accent,1,dark);
      }
    }
    drawnCactus(z,scale=1,x=0,base=0) {
      const ink=this.medium==='ink-comic',color=ink?[220,59,54]:[120,85,209];
      const ball=(px,py,sx,sy)=>this.organic(x+px*scale,base+py*scale,z,sx*scale,sy*scale,.4*scale,color);
      ball(0,.68,.56,1.48);ball(-.35,.57,.65,.26);ball(-.58,.88,.31,.82);ball(.35,.43,.6,.26);ball(.58,.7,.32,.72);
      for(const side of [-1,1])this.box(x+side*.11*scale,base+.72*scale,z-.22*scale,.035*scale,.72*scale,.035,ink?[250,232,201]:[227,194,255]);
    }
    paintedWorld(s) {
      this.layer=0;
      const image=this.art.images.valley,rect=this.art.groundSample;
      // Sampled real brushwork travels along the same bent world-space path.
      for(let i=-5;i<27;i++) {
        const z=i*3-s.distance%3;
        // A continuous 48-unit brushwork sample, mirrored at its ends: no repeated strip seams.
        const worldIndex=i+Math.floor(s.distance/3);
        const phase=((worldIndex%16)+16)%16,row=phase<8?phase:15-phase;
        for(const side of [-1,0,1]) {
          const x=side*7,cut=[rect[0]+(side+1)*rect[2]/3,rect[1]+row*rect[3]/8,rect[2]/3,rect[3]/8];
          const front=z-1.51,back=z+1.51;
          const a=phase<8?front:back,b=phase<8?back:front;
          const pieces=z<24?2:1;
          for(let j=0;j<pieces;j++) {
            const za=mix(a,b,j/pieces),zb=mix(a,b,(j+1)/pieces);
            this.imageQuad(image,[cut[0],cut[1]+cut[3]*j/pieces,cut[2],cut[3]/pieces],[[x-3.5,-.08,za],[x+3.5,-.08,za],[x+3.5,-.08,zb],[x-3.5,-.08,zb]]);
          }
        }
      }
      this.layer=2;
      for(let i=0;i<10;i++)for(const side of [-1,1]) {
        const worldIndex=i+Math.floor(s.sceneDistance/8);
        const z=5+i*8-s.sceneDistance%8,x=side*(7.2+(worldIndex%3)*2.1),size=(3.3+(worldIndex%4)*.8)*smooth((z-1)/8);
        const names=['mushroom','cactus','boulder','arch'];
        this.sprite(this.art.frames[names[(worldIndex+s.variant+(side>0?1:0))%4]],x,0,z,size,size);
        if(worldIndex%4===0)this.sprite(this.art.frames.mushroom,side*(15+worldIndex%9),0,z+9,size*2.2,size*2.2);
      }
    }
    dino(s, options={}) {
      if(this.medium==='pixel-8') {this.pixelSprite(Math.floor(s.distance*2)%2?'runA':'runB',options.x||0,options.y??s.player.height,options.z||0,1.9*(options.scale||1),2.2*(options.scale||1));return;}
      if(this.medium==='ai-gouache') {
        const frame=!s.player.grounded?'jump':s.mode==='idle'?'idle':Math.floor(s.distance*2)%2?'runA':'runB';
        this.sprite(this.art.frames[frame],options.x||0,options.y??s.player.height,options.z||0,2.6*(options.scale||1),3.1*(options.scale||1));return;
      }
      if(['ink-comic','cel-cartoon','gouache-fallback'].includes(this.medium)){this.drawnDino(s,options);return;}
      const ext = mix(.035, 1, smooth(s.extrusion));
      const color = options.color || (this.hero && s.recovery>0 ? [202,116,65] : null) || GRAY.map((n, i) => mix(n, s.scene==='dream'?[64,78,133][i]:CHROME[i], s.extrusion));
      const y = options.y ?? s.player.height, run = s.player.grounded ? Math.sin(s.distance * 3.8) * .17 : .10;
      const lean = s.player.stumble > 0 ? -.12 : 0;
      const scale=options.scale || (s.scene==='dream'?1+s.morph*.10:1);
      const squash=options.lod?1:1-Math.sin(clamp(s.impact/.32)*Math.PI)*.15;
      let index=0;
      const part = (x,py,z,sx,sy,sz,c=color) => {
        const split=options.fragment||0, n=index++;
        this.box((options.x||0)+x*ext*scale+Math.sin(n*2.4)*split,y+py*scale*squash+Math.cos(n*1.2)*split,
          (options.z||0)+(z+lean*py)*scale+Math.sin(n*1.8)*split,sx*ext*scale/squash,sy*scale*squash,sz*scale,c,split*.12);
      };
      if(options.lod) {
        part(0,.9,0,.65,.85,.85);part(0,1.6,.45,.7,.9,.75);
        part(0,.83,-.75,.35,.28,.85);
        part(-.23,.28,-.1+run,.22,.56,.35);part(.23,.28,-.1-run,.22,.56,.35);
        part(0,1.35,-.3,.18,.15,.3,GREEN);return;
      }
      part(0,.96,-.04,.68,.86,.96); // body
      part(0,1.40,.31,.53,.65,.48); // upright neck
      part(0,1.85,.66,.79,.65,.96); // oversized square head
      part(0,1.56,.80,.70,.16,.73); // jaw, with a real mouth gap
      part(0,.88,-.77,.46,.35,.75); part(0,1.03,-1.23,.27,.23,.42); // stepped tail
      part(-.39,1.10,.52,.13,.15,.40); part(.39,1.10,.52,.13,.15,.40); // little arms
      part(-.23,.36,-.18+run,.23,.65,.27); part(.23,.36,-.18-run,.23,.65,.27);
      part(-.23,.09,run,.27,.18,.48); part(.23,.09,-run,.27,.18,.48);
      const eye = s.extrusion > .4 ? [13,25,37] : [247,247,247];
      part(-.403,1.99,.76,.018,.14,.14, eye); part(.403,1.99,.76,.018,.14,.14, eye);
      if (s.extrusion > .4) {
        part(-.416,2.01,.78,.015,.05,.05,[203,255,130]);
        part(.416,2.01,.78,.015,.05,.05,[203,255,130]);
        // A bright dorsal ridge maintains the dinosaur silhouette from the rear.
        for (let i = 0; i < 4; i++) part(0,1.40-i*.12,-.26-i*.23,.18,.15,.14,GREEN);
      }
    }
    cactus(z, extrusion, scale = 1, x = 0, base = 0, color = null, tilt = 0) {
      if(this.medium==='pixel-8'){this.pixelSprite('cactus',x,base,z,1.1*scale,1.4*scale);return;}
      if(this.medium==='ai-gouache'){this.sprite(this.art.frames.cactus,x,base,z,1.6*scale,1.65*scale);return;}
      if(['ink-comic','cel-cartoon','gouache-fallback'].includes(this.medium)){this.drawnCactus(z,scale,x,base);return;}
      const ext = mix(.035, .64, smooth(extrusion));
      const c = color || GRAY.map((n, i) => mix(n, GREEN[i], extrusion));
      const spread = smooth(extrusion);
      const box = (px,py,pz,sx,sy,sz) => {
        const xx=px*scale, yy=py*scale;
        this.box(x+xx*Math.cos(tilt)-yy*Math.sin(tilt),base+xx*Math.sin(tilt)+yy*Math.cos(tilt),z+pz*scale,sx*scale,sy*scale,sz*scale,c,tilt);
      };
      // The flat branches grow lateral volume as well as depth: still readable from behind.
      box(0,.65,0,ext*.62,1.3,.25);
      box(-.30*spread,.62,-.30,ext,.20,.57);
      box(-.57*spread,.89,-.51,ext*.38,.65,.20);
      box(.30*spread,.46,.32,ext,.19,.60);
      box(.57*spread,.68,.56,ext*.38,.52,.19);
    }
    world(s) {
      if(!['offline','rupture','extrusion','track','breath'].includes(s.scene)) {this.showWorld(s);return;}
      const e = smooth(s.extrusion), b = s.projectionBlend;
      this.layer=0;
      const width = mix(.035,5.8,e);
      const travel = s.distance % 3;
      for (let i = -5; i < 29; i++) {
        const z = i * 3 - travel;
        const ripple = s.scene === 'rupture' ? Math.sin(z * .9 - s.sceneTime * 6) * Math.exp(-Math.abs(z) / 14) * Math.sin(clamp(s.sceneTime / 1.35) * Math.PI) * (s.reducedMotion ? .35 : .85) : 0;
        const color = [247,247,247].map((n,j) => mix(n,(i%2 ? [34,38,65] : [40,44,72])[j],e));
        this.box(0,ripple-.10,z,width,.20,3.015,color);
        if (e > .02) {
          for (const side of [-1,1]) this.box(side*width*.5,ripple+.015,z,.045,.035,3.02,[103,224,233]);
          // One sparse centre dash, not a wallpaper grid.
          if (i%2 === 0) this.box(0,ripple+.018,z,.06,.025,.75,[116,123,153]);
        }
      }
      if (e < .01 && s.scene !== 'rupture') {
        this.box(0,-.10,28,.06,.035,100,GRAY);
      }
      this.layer=2;
      const tear = s.scene==='rupture' ? smooth(s.sceneTime/1.35) : s.scene==='extrusion' ? 1-smooth(s.sceneTime/1.4) : 0;
      if(tear>0) {
        const edge=[];
        for(let i=-10;i<=22;i++) {
          const z=i*3;
          edge.push([-.08,-.24-Math.abs(Math.sin(i*2.9))*.28*tear,z]);
        }
        for(let i=22;i>=-10;i--) {
          const z=i*3;
          edge.push([-.08,-.24-tear*(1.6+Math.abs(Math.sin(i*1.7))*1.3)*Math.exp(-Math.abs(z)/52),z]);
        }
        this.polygon(edge,[24,20,43]);
      }
      if (e > .01) {
        // The original page physically folds into two wings off the unfolding ribbon.
        const fold = smooth(s.extrusion), wing = mix(0,1.45,fold);
        this.layer=-1;
        if (fold < .995) for (const side of [-1,1]) {
          const x = side * width / 2;
          this.polygon([[x,-.15,-10],[x,-.15,60],[x+side*26*Math.cos(wing),-26*Math.sin(wing),60],[x+side*26*Math.cos(wing),-26*Math.sin(wing),-10]],[237,239,247]);
        }
        this.layer=2;
        // Suspended, faceted sun: a solid object with a rotating equatorial ring.
        const z = 67, y = 14, radius = 12 * e;
        const top = [0,y+radius,z], bottom = [0,y-radius,z];
        const ring = Array.from({length:8},(_,i) => { const a = i*Math.PI/4 + (s.reducedMotion ? .2 : s.simTime*.035); return [Math.cos(a)*radius,y, z+Math.sin(a)*radius]; });
        for (let i=0;i<8;i++) {
          this.polygon([top,ring[i],ring[(i+1)%8]],[244,108,175],.55+i*.055);
          this.polygon([bottom,ring[(i+1)%8],ring[i]],[117,76,199],.6+i*.04);
        }
        // Broad folded fins open with the first drop, leaving the central corridor clear.
        for (let i=0;i<7;i++) for (const side of [-1,1]) {
          const zf = 8+i*8 - (s.distance*.35)%8, x = side*(7+i*.35);
          const h = (5+(i%3)*4)*e;
          this.polygon([[x,0,zf-3],[x+side*7,h,zf+2],[x+side*3,0,zf+5]],[66,51,116],.8+i*.05);
          this.polygon([[x,0,zf-3],[x+side*7,h,zf+2],[x+side*9,0,zf-1]],[37,33,77]);
        }
        for (const m of s.monuments) {
          // Monumental scenery recedes before it can engulf the near camera/corridor.
          const grow = smooth(m.age / 1.0)*smooth((m.z-2)/10), h = m.scale * grow;
          if(h<.05)continue;
          const x = m.side*(5.5+h*.4);
          this.cactus(m.z,1,h,x,-.1,m.side < 0 ? [145,105,225] : [72,169,186],m.side*.12*grow);
          // Later laps unfold paired arches, with the same clear central corridor.
          const unfold=s.variant?smooth(m.age/1.4):0;
          this.box(x*.5,h*.95,m.z,Math.abs(x),.16,.45,[174,233,241],m.side*unfold*.25);
          if(s.variant) {
            this.cactus(m.z+2,1,h*.72,-x,-.1,[94,189,183],-m.side*.25*unfold);
            this.box(0,h*1.15,m.z,Math.abs(x)*1.6,.32,.65,[212,191,244],Math.sin(unfold*Math.PI)*.15);
          }
          this.layer=-1;
          this.box(x,-1.1,m.z,h*1.3,1.8,h*1.1,[38,44,70]);
          this.layer=2;
        }
      }
      if(this.medium==='pixel-8') {
        this.layer=2;
        for(let i=0;i<5;i++)this.pixelSprite('cloud',0,3.6+(i%2)*1.3,8+i*12-(s.distance*.12)%12,3,1);
        this.layer=0;
        for(let i=-8;i<42;i++){const z=i*2.2-s.distance%2.2;this.box(0,-.24-(i%3)*.08,z,.035,.035,.18+(i%4)*.07,GRAY);}
      }
      this.rewards(s);
    }
    palette(scene) {
      return ({corkscrew:[245,231,203],dream:[250,208,167],desktop:[77,102,162],crash:[35,64,162],stampede:[105,205,237],coalesce:[105,205,237],finale:[105,205,237],breath:[247,247,247]})[scene] || [9,11,29];
    }
    runway(s,style) {
      const colors={corkscrew:[[245,223,164],[231,206,144],[37,44,64]],dream:[[210,192,231],[226,211,240],[115,88,157]],
        desktop:[[127,148,190],[113,132,175],[241,219,150]],stampede:[[255,148,83],[255,171,93],[255,246,206]],
        ending:[[255,148,83],[255,171,93],[255,246,206]]};
      const c=(colors[style]||colors.ending).map(v=>v.slice());
      const pulse=Math.exp(-(s.beat%1)*6);
      c[2]=c[2].map(n=>Math.min(255,n+pulse*20));
      const wide=['stampede','ending'].includes(style)?5.8+7.5*smooth((s.echoes-1)/16):5.8;
      this.layer=0;
      for(let i=-5;i<26;i++) {
        const z=i*3-s.distance%3;
        this.polygon([[-wide/2,0,z-1.51],[wide/2,0,z-1.51],[wide/2,0,z+1.51],[-wide/2,0,z+1.51]],c[Math.abs(i)%2]);
        for(const side of [-1,1])this.box(side*wide*.5,.016,z,.055,.035,3.01,c[2]);
        if(style==='desktop') {
          this.box(0,.025,z+1.12,wide-.15,.03,.35,[58,88,151]);
          this.box(-1.5,.028,z-.15,1.8,.03,.11,[154,168,187]);
          this.box(-1.5,.028,z-.48,1.8,.03,.11,[154,168,187]);
          this.box(1.7,.028,z-.25,.65,.03,.55,[187,200,216]);
        } else if(i%2===0) this.box(0,.025,z,.06,.03,.7,c[2]);
      }
    }
    windowBox(x,y,z,w,h,seed=0,player=false) {
      if(this.medium==='pixel-16') {
        this.pixelSprite(player?(Math.floor(this.s.distance*2)%2?'windowA':'windowB'):'hazard',x,y,z,w,h);
        return;
      }
      this.box(x,y+h*.5,z,w,h,.20,[229,235,241]);
      this.box(x,y+h*.86,z-.115,w*.96,h*.20,.035,player?(this.s.recovery>0?[157,83,42]:[41,94,108]):[57,83,155]);
      this.box(x+w*.39,y+h*.86,z-.145,w*.085,h*.10,.03,[248,206,167]);
      if(player) {
        // The player itself is a dimensional window, with a tiny voxel dinosaur inside.
        const ink=[46,77,91];
        this.box(x-.05,y+h*.42,z-.14,w*.29,h*.30,.05,ink);
        this.box(x+w*.12,y+h*.61,z-.14,w*.33,h*.19,.05,ink);
        this.box(x-w*.25,y+h*.39,z-.14,w*.28,h*.08,.05,ink);
        for(const side of [-1,1])this.box(x+side*w*.09,y+h*.19,z-.14,w*.07,h*.19,.05,ink);
        this.box(x+w*.19,y+h*.65,z-.18,w*.03,h*.03,.04,[240,251,233]);
      } else {
        this.box(x-w*.28,y+h*.47,z-.14,w*.11,h*.23,.04,[221,109,91]);
        this.box(x+w*.09,y+h*.52,z-.14,w*.43,h*.05,.04,[137,151,171]);
        this.box(x+w*.03,y+h*.39,z-.14,w*.30,h*.05,.04,[137,151,171]);
        this.box(x+w*.21,y+h*.17,z-.14,w*.29,h*.14,.04,seed%2?[171,193,211]:[196,202,219]);
      }
    }
    corkscrew(s) {
      // Actual ribs and jaws surround the ribbon; the whole vertex space quarter-turns.
      for(let i=0;i<8;i++) {
        const z=6+i*8-s.sceneDistance%8;
        for(let j=0;j<8;j++) {
          const a=j*Math.PI/4+i*(s.variant===1?-.32:s.variant===2?.25:.065),r=4.8+Math.sin(clamp(s.burst/1.5)*Math.PI)*1.8;
          this.layer=Math.sin(a)<-.1?-1:2;
          this.box(Math.cos(a)*r,Math.sin(a)*r,z,3.25,.28,.50,[40,44,62],a+Math.PI/2);
          if(j%2===0 && i<4) {
            const t=a+.12;
            this.polygon([[Math.cos(a-.12)*r,Math.sin(a-.12)*r,z-.25],[Math.cos(a+.12)*r,Math.sin(a+.12)*r,z-.25],[Math.cos(t)*3.65,Math.sin(t)*3.65,z+.4]],[255,239,193]);
          }
        }
      }
      if(s.variant)for(let strand=0;strand<2;strand++)for(let i=0;i<12;i++) {
        const a=i*.72*(s.variant===1?-1:1)+strand*Math.PI;
        this.layer=Math.sin(a)<-.1?-1:2;
        this.box(Math.cos(a)*6.2,Math.sin(a)*6.2,7+i*5.4-s.sceneDistance%5.4,1.4,.65,2.4,strand?[255,238,173]:[68,164,171],a);
      }
      this.layer=2;
    }
    dream(s) {
      if(this.medium==='ai-gouache'){this.paintedWorld(s);return;}
      // Explicit procedural fallback, never reported as generated art.
      this.layer=2;
      for(let i=0;i<10;i++)for(const side of [-1,1])this.drawnCactus(8+i*7-s.sceneDistance%7,2+i%3,side*(6+i%3*2));
    }
    desktop(s) {
      for(let i=0;i<4;i++) {
        this.windowBox(-7-i*.65,.2+i*.45,18+i*5,4.4,3.1,i);
        this.windowBox(8+i*.55,.3+i*.9,28+i*4,4.4,3.1,i+1);
      }
      for(const w of s.windows) {
        if(w.age<0)continue;
        const pop=smooth(w.age/.35);
        const fan=s.variant?Math.sin(w.seed*.65)*3:0;
        this.windowBox(w.x+fan,w.y+(1-pop)*2+(s.variant?(w.seed%3)*1.3:0),w.z,3.3*pop,2.5*pop,w.seed);
        if(s.variant===2 && w.seed%3===0)this.windowBox(w.x+fan,w.y+3,w.z+1,2.1*pop,1.6*pop,w.seed+1);
        this.layer=-1;
        this.box(w.x,-.8+w.y*.3,w.z,3.5,1.5,2.2,[116,145,159]);
        this.layer=2;
      }
    }
    stampede(s,gather=0) {
      const k=1-gather;if(k<.02)return;
      const box=(x,y,z,sx,sy,sz,color,angle=0)=>this.box(x*k,y*k,mix(z,27,gather),sx*k,sy*k,sz*k,color,angle);
      for(const tower of s.city) {
        if(tower.z<-13)continue;
        const age=tower.brokenAt===null?-1:s.simTime-tower.brokenAt;

        for(const side of [-1,1]) {
          const x=side*(8+(tower.id%3)*1.5), z=tower.z;
          if(age>2.2) {
            box(x,.22,z,3.8,.44,4.4,[123,81,196]);
            box(x+side*.6,.9,z+.5,2.3,1.6,2.4,[255,208,88],side*.8);
          } else if(age<0) {
            box(x,tower.height*.5,z,2.3,tower.height,2.7,[255,205,79]);
            box(x,tower.height+.25,z,3,.5,3.3,[229,72,126]);
            // Oversized candy roof and face-like windows make this a squashable cartoon city.
            this.polygon([[x*k-1.5*k,tower.height*k,z*k+27*gather],[x*k,(tower.height+1.8)*k,z*k+27*gather],[x*k+1.5*k,tower.height*k,z*k+27*gather]],[229,72,126]);
            for(const eye of [-1,1])box(x+eye*.5,tower.height*.7,z-1.4,.35,.65,.06,[255,250,227]);
            for(let n=1;n<4;n++)box(x-.02,tower.height*n/4,z-1.37,1.4,.18,.05,[92,76,180]);
          } else {
            for(let n=0;n<3;n++) {
              const flight=Math.max(0,Math.sin(clamp(age/1.7)*Math.PI));
              box(x+side*age*(2+n),Math.max(-2,tower.height*(n+.5)/3*(1-age*.7))+flight*2,z+Math.sin(n*2)*age*3,
                2.3,tower.height/3,2.7,n===2?[229,72,126]:[255,205,79],side*age*(.7+n*.3));
            }
          }
        }
      }
    }
    pack(s,gather=0) {
      const positions=[-.95,.95,-2.4,2.4,-3.85,3.85];
      for(let i=1;i<Math.min(40,s.echoes);i++) {
        const row=Math.floor((i-1)/6),col=(i-1)%6;
        const delay=(row+1)*.06, jumpAge=s.simTime-s.lastJumpTime-delay;
        const waveAge=s.simTime-s.waveTime-(row+1)*.12;
        const wave=waveAge>=0?Math.max(0,5.8*waveAge-7*waveAge*waveAge):0;
        const jump=Math.max(wave,jumpAge>=0?Math.max(0,7.7*jumpAge-9*jumpAge*jumpAge):0);
        const scale=(.88+(i%3)*.045)*(1-gather*.94);
        const fan=s.variant===1?1+row*.22:1;
        const spiral=s.variant===2?Math.sin(i*.8)*1.1:0;
        this.dino(s,{x:(positions[col]*fan+spiral)*(1-gather),y:jump*(1-gather)+gather*(i%6)*2.5,
          z:mix(3+row*2.5+(s.variant?Math.abs(positions[col])*.7:0),24,gather),scale,lod:true,color:i%3?[61,115,133]:[235,242,210]});
      }
    }
    ending(s) {
      const gather=s.scene==='coalesce'?smooth(s.sceneTime/2.2):1;
      if(s.scene==='coalesce') {this.stampede(s,gather);this.pack(s,gather);}
      const scale=12*gather;
      this.opacity=s.scene==='collapse'?1-smooth(s.sceneTime/.85):1;
      if(scale>.05 && this.opacity>.001 && this.medium!=='pixel-8') {
        const fragment=s.scene==='collapse'?Math.sin(clamp(s.sceneTime/.85)*Math.PI)*4:0;
        this.dino(s,{x:0,y:0,z:27,scale,color:[224,240,198],fragment});
        // Monumental broken ribs of the whole journey converge behind the giant.
        for(let i=0;i<9;i++) {
          const a=i*Math.PI/8;
          const x=Math.cos(a)*20,y=Math.sin(a)*23;
          this.box(x,y,39,4,.6,1.2,i%2?[102,174,167]:[233,143,136],a+Math.PI/2);
        }
      }
      this.opacity=1;
    }

    showWorld(s) {
      const style=['coalesce','finale','collapse'].includes(s.scene)?'ending':s.scene==='crash'?'desktop':s.scene;
      if(this.medium!=='ai-gouache')this.runway(s,style);this.layer=2;
      if(s.scene==='corkscrew')this.corkscrew(s);
      else if(s.scene==='dream')this.dream(s);
      else if(s.scene==='desktop'||s.scene==='crash')this.desktop(s);
      else if(s.scene==='stampede') {this.pack(s);this.stampede(s);}
      else if(this.medium!=='pixel-8')this.ending(s);
      this.rewards(s);
    }
    gameplayWorld(s) {
      this.gameplay=true;this.layer=3;
      if(s.scene==='finale') {
        const fly=s.finalInput?clamp((s.sceneTime-s.finalJumpTime)/.84):0;
        this.layer=4;this.cactus(mix(3.6,-2.7,fly),1,.75,0,0,[225,233,212]);
        this.layer=3;this.box(0,.03,.25,2.5,.03,.14,[220,244,194]);
      }
      const next=s.obstacles.find(o=>!o.resolved && o.z>-.3);
      if(next && s.projectionBlend>.1) {
        const z=next.z-s.speed*.42,c=next.z/s.speed<.60?[252,237,112]:s.scene==='dream'?[124,85,138]:[47,87,99];
        this.box(0,.035,z,2.9,.035,.14,c);
        for(const side of [-1,1])this.box(side*1.45,.035,z+.36,.09,.035,.72,c);
      }
      if(this.medium==='ai-gouache') {
        for(const radius of [1,.77])this.polygon(Array.from({length:20},(_,i)=>{const a=i*Math.PI/10;return [Math.cos(a)*(.7+s.player.height*.08)*radius,.025,Math.sin(a)*.9*radius-.1];}),radius===1?[211,161,126]:[183,142,119]);
      } else if(s.extrusion>.05)this.box(0,.025,-.1,.95+s.player.height*.16,.025,1.6+s.player.height*.12,[42,48,69]);
      this.layer=4;
      this.hero=true;
      if(this.medium==='pixel-16')this.windowBox(0,s.player.height,0,1.6,2.05,0,true);
      else this.dino(s);
      if(s.recovery>0&&this.medium==='ai-gouache') {
        this.layer=3;
        // A steady amber ground halo keeps the real painted character unobscured.
        for(let i=0;i<12;i++) {
          const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
          this.polygon([[Math.cos(a)*.85,.05,Math.sin(a)*.85],[Math.cos(b)*.85,.05,Math.sin(b)*.85],[Math.cos(b)*1,.05,Math.sin(b)],[Math.cos(a),.05,Math.sin(a)]],[223,145,56]);
        }
      }
      this.hero=false;this.layer=4;
      for(const o of s.obstacles) {
        if(o.resolved && o.clear)continue;
        if(this.medium==='pixel-16')this.windowBox(0,o.resolved?-.5:0,o.z,1.8,1.25,o.id);
        else this.cactus(o.z,1,1,0,o.resolved?-.5:0,s.scene==='dream'?[227,115,122]:s.scene==='stampede'?[44,99,112]:[89,223,213]);
      }
    }
    rewards(s) {
      // Brief, bounded world-space rings; no screen-space flashes or particle pool.
      this.layer=1;
      for(const effect of s.effects) {
        const t=effect.age/1.5, radius=.6+t*(effect.big?12:3.5);
        const color=s.scene==='offline'?[135,145,148]:s.scene==='dream'?[151,98,174]:[109,210,196];
        if(t<.75)for(let i=0;i<16;i++) {
          const a=i*Math.PI/8,b=(i+1)*Math.PI/8;
          const p=(angle,r)=>[Math.cos(angle)*r,.055,effect.z+Math.sin(angle)*r];
          this.polygon([p(a,radius),p(b,radius),p(b,radius+.12*(1-t)),p(a,radius+.12*(1-t))],color);
        }
        if(!effect.big)continue;
        this.layer=2;
        const lift=Math.sin(t*Math.PI)*(s.reducedMotion?2:4);
        if(s.scene==='desktop') {
          for(let side of [-1,1])for(let i=0;i<2;i++)
            this.windowBox(side*(5+i*1.8),2+i*.9+lift,9+i*3,3.8,2.8,i);
        } else if(s.scene==='dream') {
          for(let i=0;i<4;i++) {
            const a=i*Math.PI/2;
            this.dino(s,{x:Math.cos(a)*(11+t*4),y:5+Math.sin(a)*4+lift,z:22+Math.sin(a)*8,scale:1.8,lod:true,color:[181,123,167]});
          }
        } else if(s.scene==='track') {
          for(const side of [-1,1])for(let i=0;i<3;i++)
            this.cactus(14+i*8,1,2.8+lift*.5,side*(5.8+i*2),0,[137,211,184],side*(s.reducedMotion?.12:t*.5));
        } else if(s.scene==='corkscrew') {
          for(let i=0;i<12;i++) {
            const a=i*Math.PI/6,r=6+t*7;
            this.box(Math.cos(a)*r,Math.sin(a)*r,15,2,.7,2,[246,232,159],a);
          }
        } else if(s.scene==='stampede') {
          for(const side of [-1,1])for(let i=0;i<8;i++)
            this.box(side*(5+i*.3),.1+Math.sin(clamp(t*2-i*.09)*Math.PI)*2,4+i*4,1,.4,2,[246,239,196]);
        }
        this.layer=1;
      }
    }
    remember(s) {
      // Two bounded scenery records, never old gameplay or a frozen screenshot.
      const out=this.lastScenery;
      for(const key of Object.keys(s))if(!Array.isArray(s[key]) && key!=='player')out[key]=s[key];
      for(const key of ['monuments','windows','city','effects']) {
        const items=out[key]||(out[key]=[]),source=s[key];
        for(let i=0;i<source.length;i++)Object.assign(items[i]||(items[i]={}),source[i]);
        items.length=source.length;
      }
      out.player=s.player;out.obstacles=[];
    }
    renderWorld(s,live,medium,target) {
      this.medium=medium;this.opacity=1;
      const w=this.w,h=this.h,pixel=medium==='pixel-8'||medium==='pixel-16';
      // Integer nearest-neighbour expansion happens in BACKING pixels, not CSS pixels.
      const step=Math.max(2,Math.ceil(Math.max(target.canvas.width,target.canvas.height)/480));
      let c=target;
      if(pixel) {
        const pw=Math.ceil(target.canvas.width/step),ph=Math.ceil(target.canvas.height/step);
        if(this.pixelCanvas.width!==pw||this.pixelCanvas.height!==ph){this.pixelCanvas.width=pw;this.pixelCanvas.height=ph;}
        c=this.pixelContext;c.setTransform(target.canvas.width/step/w,0,0,target.canvas.height/step/h,0,0);
      }
      c.imageSmoothingEnabled=!pixel;c.imageSmoothingQuality=medium==='ai-gouache'?'high':'low';
      const e = smooth(s.extrusion);
      const palette=this.palette(s.scene), prev=this.palette(s.previousScene);
      const tone=palette.map((n,i)=>mix(prev[i],n,smooth(s.sceneTime/1.1)));
      const bg = [247,247,247].map((n,i)=>Math.round(mix(n,tone[i],e)));
      this.background=bg;
      c.fillStyle = `rgb(${bg})`; c.fillRect(0,0,w,h);
      if (e > .01 && ['extrusion','track'].includes(s.scene)) {
        const gradient = c.createRadialGradient(w*.53,h*.38,0,w*.53,h*.38,w*.7);
        gradient.addColorStop(0,`rgba(104,49,121,${e*.5})`); gradient.addColorStop(1,'rgba(9,11,29,0)');
        c.fillStyle=gradient; c.fillRect(0,0,w,h);
      }
      if(this.medium==='ai-gouache') {
        const image=this.art.images.valley,k=Math.max(w/image.width,h/image.height);
        c.drawImage(image,(w-image.width*k)/2,(h-image.height*k)/2,image.width*k,image.height*k);
      }
      this.faces.length = 0;this.cost=0;this.gameplay=false;
      this.world(s); this.gameplayWorld(live);
      // Ground/decal passes avoid average-depth floor polygons cutting through feet.
      // Above-ground meshes retain stable camera-space painter ordering.
      this.faces.sort((a,b)=>a.layer-b.layer || b.depth-a.depth || a.order-b.order);
      c.lineJoin='round';
      const path=points=>{c.beginPath();c.moveTo(...points[0]);for(let i=1;i<points.length;i++)c.lineTo(...points[i]);c.closePath();};
      const ink=this.medium==='ink-comic',cel=this.medium==='cel-cartoon';
      let images=this.medium==='ai-gouache'?1:0;
      for (const f of this.faces) {
        c.globalAlpha=f.opacity??1;
        if(f.image){this.texture(c,f);images+=f.units;continue;}
        const fading=(f.opacity??1)<.999;
        // During the giant's exit, translucent facets must not be painted over an
        // equally translucent hull or edge strokes (which compound the alpha).
        if(!f.facets || !fading){path(f.points);c.fillStyle=f.color;c.fill();}
        if(f.facets)for(const part of f.facets){path(part.points);c.fillStyle=part.color;c.fill();if(!fading){c.strokeStyle=part.color;c.lineWidth=.65;c.stroke();}}
        path(f.points);
        c.strokeStyle=f.edge?(Array.isArray(f.edge)?'rgb('+f.edge.join(',')+')':f.edge):ink?'#211c24':cel?'#23324b':f.color;
        // Ground is a continuous material, never a wireframe. Internal joints are quiet.
        const span=Math.max(...f.points.map(p=>p[0]))-Math.min(...f.points.map(p=>p[0]));
        c.lineWidth=f.organic?clamp(span*.018,.45,1.25):ink?1.1:cel?.8:.65;
        if(f.layer===0 || (f.organic&&!f.outline) || span<6)c.strokeStyle=f.color;
        if(!fading)c.stroke();
        if(ink&&f.layer>0&&!f.organic&&f.material==='248,231,196') {
          const key='hatch';
          if(!this.patterns[key])this.patterns[key]=c.createPattern(this.art[key],'repeat');
          c.fillStyle=this.patterns[key];c.fill();
        } else if(this.medium==='pixel-16'&&f.layer===0&&f.material==='127,148,190') {
          if(!this.patterns.dither)this.patterns.dither=c.createPattern(this.art.dither,'repeat');
          c.fillStyle=this.patterns.dither;c.fill();
        }
      }
      c.globalAlpha=1;
      if(pixel){
        c=target;c.save();c.setTransform(1,0,0,1,0,0);c.imageSmoothingEnabled=false;
        c.drawImage(this.pixelCanvas,0,0,this.pixelCanvas.width*step,this.pixelCanvas.height*step);c.restore();images++;
      }
      return {commands:this.cost,images,resolution:pixel?[this.pixelCanvas.width,this.pixelCanvas.height]:[target.canvas.width,target.canvas.height]};
    }
    draw(s) {
      const start=performance.now(),w=this.w,h=this.h,c=this.ctx;
      let desired=this.art.medium(s);
      // Readiness is reported immediately; an airborne fallback hero is not replaced mid-jump.
      if(desired==='ai-gouache' && this.currentMedium==='gouache-fallback' && !s.player.grounded)desired=this.currentMedium;
      const reset=this.lastRun!==s.run || s.simTime<(this.lastTime??0);
      if(reset){this.hudDesktop=0;this.handoff=null;this.lastScenery={};this.currentMedium=desired;this.lastScene=s.scene;this.visual={bend:s.scene==='dream'?1.6+s.morph*.8:0,lift:s.scene==='desktop'?s.morph*.24:0};}
      // The cel gather/finale/collapse already animate natively; do not double-render
      // a whole pack merely because its scene name changed within the same medium.
      if(!reset && (desired!==this.currentMedium || (this.handoff && s.scene!==this.lastScene))) {
        // Rapid changes replace, rather than chain, the outgoing style.
        this.handoff={medium:this.currentMedium,scenery:this.lastScenery,start:s.simTime,duration:s.reducedMotion?.24:.65};
        this.lastScenery={};
      }
      this.currentMedium=desired;this.lastScene=s.scene;this.lastRun=s.run;
      const dt=clamp(s.simTime-(this.lastTime??s.simTime),0,.1);this.lastTime=s.simTime;
      const ease=1-Math.exp(-dt/ .18);
      this.visual.bend=mix(this.visual.bend,s.scene==='dream'?1.6+s.morph*.8:0,ease);
      this.visual.lift=mix(this.visual.lift,s.scene==='desktop'?s.morph*.24:0,ease);
      if(s.mode!=='running')this.handoff=null;
      let blend=this.handoff?smooth((s.simTime-this.handoff.start)/this.handoff.duration):1;
      if(this.handoff?.medium==='pixel-8'&&desired==='vector-3d'&&s.scene==='extrusion')blend=smooth((s.extrusion-.025)/.22);
      if(blend>=1)this.handoff=null;
      // Both visible gameplay passes use this single current camera and transform.
      this.camera(s);
      const incoming=this.renderWorld(s,s,desired,c);
      let commands=incoming.commands,images=incoming.images,passes=1,outgoingCommands=0;
      if(this.handoff) {
        const old=this.handoff.scenery;
        const advance=dt*s.speed;
        old.sceneTime+=dt;old.simTime=s.simTime;old.distance+=advance;old.sceneDistance+=advance;old.player=s.player;
        for(const m of old.monuments||[]){m.age+=dt;m.z-=advance*.44;}
        for(const win of old.windows||[]){win.age+=dt;win.z-=advance*.48;}
        for(const tower of old.city||[])tower.z-=advance;
        for(const effect of old.effects||[])effect.age+=dt;
        const outgoing=this.renderWorld(old,s,this.handoff.medium,this.blendContext);
        c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1-blend;
        c.imageSmoothingEnabled=false;c.drawImage(this.blendCanvas,0,0);c.restore();
        outgoingCommands=outgoing.commands;commands+=outgoingCommands;images+=outgoing.images+1;passes=2;
      }
      this.medium=desired;document.documentElement.dataset.medium=desired;
      this.remember(s);
      const bufferPixels=this.blendCanvas.width*this.blendCanvas.height+this.pixelCanvas.width*this.pixelCanvas.height;
      this.stats.style=desired;this.stats.assets=this.art.snapshot();this.stats.images=images;
      this.stats.worldResolution=incoming.resolution;
      this.stats.budgets={scenery:2000,gameplay:2600,used:incoming.commands,reservedGameplay:600,packCap:40};
      this.stats.transition={active:!!this.handoff,blend,passes,commands,incomingCommands:incoming.commands,outgoingCommands,images,bufferPixels,bufferBytes:bufferPixels*4};
      this.stats.peakImages=Math.max(this.stats.peakImages||0,images);
      this.stats.maxCombinedCommands=Math.max(this.stats.maxCombinedCommands||0,commands);
      const e=smooth(s.extrusion);
      this.hudDesktop=mix(this.hudDesktop||0,s.scene==='desktop'?1:0,ease);
      c.imageSmoothingEnabled=true;
      c.fillStyle='rgba(255,248,232,.55)';c.beginPath();
      c.roundRect(w-158,18,142,s.mode==='idle'?24:66+36*this.hudDesktop,7);c.fill();
      c.textAlign='right'; c.font='11px ui-monospace, monospace';
      const hudInk='#302b3a';
      c.fillStyle=hudInk;
      c.fillText(String(s.score).padStart(4,'0'),w-22,34);
      if (s.scene === 'offline' && s.mode !== 'idle') {
        for(let i=0;i<s.target;i++) { c.fillStyle=i<s.success?'#535353':'#d4d4d4'; c.fillRect(w-61+i*14,47,7,3); }
      }
      if(s.mode!=='idle') {
        c.fillStyle=hudInk;c.font='10px ui-monospace, monospace';
        c.fillText('LAP '+s.lap,w-22,64+36*this.hudDesktop);
        if(s.combo>1)c.fillText(s.combo+' clears · ×'+s.multiplier,w-22,80+36*this.hudDesktop);
      }
      if(this.hudDesktop>.001) {
        c.save();c.globalAlpha=this.hudDesktop;
        c.fillStyle='#253d72';c.fillRect(0,58,w,27);
        c.fillStyle='#fff';c.textAlign='left';c.font='11px ui-monospace, monospace';
        c.fillText('dinosaurOS  /  workspace '+String(s.success+1).padStart(2,'0'),18,76);
        c.fillStyle='#fff3d0';c.fillText('windows: '+(s.windows.length+1)+'    memory: unreasonably full',18,h-48);c.restore();
      }
      if(s.scene==='crash' && s.sceneTime>.7) {
        c.save();c.globalAlpha=smooth((s.sceneTime-.7)/.3)*(1-smooth((s.sceneTime-1.85)/.35));
        c.fillStyle='#2340a2';c.fillRect(0,0,w,h);
        c.textAlign='left';c.fillStyle='#edf4ff';c.font='bold 18px ui-monospace, monospace';
        c.fillText('WINDOW LIMIT EXCEEDED',w*.09,h*.36);
        c.font='12px ui-monospace, monospace';c.fillText('The desktop could not contain it.',w*.09,h*.36+38);
        c.fillText('Restoring the dinosaur…',w*.09,h*.36+63);c.restore();
      }
      if(s.scene==='finale' && !s.finalInput) {
        // A quiet visual callback, not a new control instruction.
        c.fillStyle='#23324b';c.textAlign='center';c.font='12px ui-monospace, monospace';
        c.fillText('One more.',w*.5,h*.22);
      }
      this.stats.polygons=commands;
      this.stats.maxPolygons=Math.max(this.stats.maxPolygons,commands);
      this.stats.renderMs=performance.now()-start;
      this.stats.transition.renderMs=this.stats.renderMs;
      this.stats.transition.peakCommands=this.stats.maxCombinedCommands;
      this.stats.transition.peakImages=this.stats.peakImages;
      this.stats.peakRenderMs=Math.max(this.stats.peakRenderMs||0,this.stats.renderMs);
      this.stats.transition.peakRenderMs=this.stats.peakRenderMs;
    }
  }
  window.DinoRenderer = DinoRenderer;
})();
