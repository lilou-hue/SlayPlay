/* Original world-space mesh renderer. No external assets or rendering dependencies. */
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
      this.faces = [];
      this.stats = { polygons: 0, renderMs: 0, maxPolygons: 0 };
      this.resize();
    }
    resize() {
      this.w = innerWidth; this.h = innerHeight;
      this.dpr = Math.min(devicePixelRatio || 1, 1.6);
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
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
      if(s.scene==='dream')x+=Math.sin(z*.085)*(1.6+s.morph*.8)*smooth(Math.max(0,z)/12);
      if(s.scene==='desktop')y+=s.morph*.24;
      if(s.scene==='crash') {y-=s.sceneTime*s.sceneTime*7;x+=Math.sin(z)*s.sceneTime;}
      if(s.scene==='collapse' && !this.hero) {
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
      // Reserve 400 faces for the player, active hazards and timing marker.
      if (this.faces.length >= (this.gameplay?2600:2200)) return;
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
      const rgb = color.map((n, i) => Math.round(mix(clamp(n * shade, 0, 255), this.background[i], fog)));
      this.faces.push({ points, depth, layer: this.layer, color: `rgb(${rgb.join(',')})`, edge, order: this.faces.length });
    }
    box(x, y, z, sx, sy, sz, color, angle = 0) {
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
    dino(s, options={}) {
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
      this.rewards(s);this.gameplay=true;this.layer=3;
      // Ground-space landing/takeoff marker. Its spacing is exactly speed * jump lead time.
      const next = s.obstacles.find(o => !o.resolved && o.z > -.3);
      if (next && b > .1) {
        const z = next.z - s.speed * .42;
        const c = next.z / s.speed < .60 ? [225,255,168] : [84,134,150];
        this.box(0,.028,z,2.9,.028,.12,c);
        for (const side of [-1,1]) this.box(side*1.45,.028,z+.36,.08,.028,.72,c);
      }
      // Player shadow uses the same camera and world ground as everything else.
      if (e > .05) this.box(0,.022,-.1,.85+s.player.height*.16,.02,1.6+s.player.height*.12,[14,20,35]);
      this.layer=4;
      for (const o of s.obstacles) {
        if (o.resolved && o.clear) continue;
        this.cactus(o.z,e,1,0,o.resolved ? -.5 : 0,o.resolved ? [88,86,105] : null);
      }
      this.hero=true;this.dino(s);this.hero=false;
    }
    palette(scene) {
      return ({corkscrew:[239,108,78],dream:[250,240,224],desktop:[176,217,207],crash:[35,64,162],stampede:[255,225,161],breath:[247,247,247]})[scene] || [9,11,29];
    }
    runway(s,style) {
      const colors={corkscrew:[[245,223,164],[231,206,144],[37,44,64]],dream:[[210,192,231],[226,211,240],[115,88,157]],
        desktop:[[224,231,237],[206,217,228],[51,77,126]],stampede:[[225,99,77],[238,119,89],[255,246,206]],
        ending:[[32,42,60],[38,49,68],[184,223,208]]};
      const c=(colors[style]||colors.ending).map(v=>v.slice());
      const pulse=Math.exp(-(s.beat%1)*6);
      c[2]=c[2].map(n=>Math.min(255,n+pulse*20));
      const wide=['stampede','ending'].includes(style)?5.8+7.5*smooth((s.echoes-1)/16):5.8;
      this.layer=0;
      for(let i=-5;i<26;i++) {
        const z=i*3-s.distance%3;
        this.box(0,-.12,z,wide,.24,2.98,c[Math.abs(i)%2]);
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
      for(let i=0;i<11;i++) {
        const z=4+i*6-s.sceneDistance%6;
        for(let j=0;j<8;j++) {
          const a=j*Math.PI/4+i*(s.variant===1?-.32:s.variant===2?.25:.065),r=4.8+Math.sin(clamp(s.burst/1.5)*Math.PI)*1.8;
          this.layer=Math.sin(a)<-.1?-1:2;
          this.box(Math.cos(a)*r,Math.sin(a)*r,z,3.25,.28,.50,[40,44,62],a+Math.PI/2);
          if(j%2===0) {
            const t=a+.12;
            this.polygon([[Math.cos(a-.12)*r,Math.sin(a-.12)*r,z-.25],[Math.cos(a+.12)*r,Math.sin(a+.12)*r,z-.25],[Math.cos(t)*3.65,Math.sin(t)*3.65,z+.4]],[255,239,193]);
          }
        }
      }
      if(s.variant)for(let strand=0;strand<2;strand++)for(let i=0;i<24;i++) {
        const a=i*.36*(s.variant===1?-1:1)+strand*Math.PI;
        this.layer=Math.sin(a)<-.1?-1:2;
        this.box(Math.cos(a)*6.2,Math.sin(a)*6.2,5+i*2.7-s.sceneDistance%2.7,1.4,.65,2.4,strand?[255,238,173]:[68,164,171],a);
      }
      this.layer=2;
    }
    dream(s) {
      const m=s.morph;
      // Nested eyes are actual folded polygons; each landing changes aperture, form and scale.
      this.layer=-1;
      for(let layer=7;layer>=0;layer--) {
        const radius=3+layer*1.8, z=10, y=-2-layer*.035;
        const sides=s.variant===1?3:s.variant===2?5:8, verts=[];
        for(let j=0;j<sides;j++) {
          const a=j*Math.PI*2/sides+m*(s.reducedMotion?.08:.35);
          const r=radius*(j%2?1:.78+.15*Math.sin(m));
          verts.push([Math.cos(a)*r*1.4,y+Math.sin(a*2)*m*.1,z+Math.sin(a)*r*(.9+.24*Math.cos(m*.9))]);
        }
        this.polygon(verts,layer%2?[232,116+layer*5,132]:[255,250,226]);
      }
      this.box(Math.sin(m)*1.6,-1.6,10,2.3,.4,4.6,[54,78,121],m*.1);
      this.layer=2;
      for(let i=0;i<3;i++)for(const side of [-1,1]) {
        const scale=2.6+i*1.5+Math.sin(m+i)*.6;
        this.dino(s,{x:side*(9+i*7),y:0,z:14+i*10,scale,lod:true,color:i%2?[151,124,185]:[228,139,151]});
      }
      // Recursive eye-gates occupy the playable space, not just a distant backdrop.
      // Their opening stays wider and taller than the stable near collision corridor.
      for(let gate=0;gate<4;gate++) {
        const z=7+gate*12-(s.sceneDistance*.3)%12;
        const sides=s.variant===1?3:s.variant===2?5:12;
        for(let ring=0;ring<3;ring++)for(let j=0;j<sides;j++) {
          const a=j*Math.PI*2/sides,b=(j+1)*Math.PI*2/sides;
          const r=7+ring*.85, aperture=1+Math.sin(m*.8+ring)*.12;
          const point=(angle,radius,depth)=>[Math.cos(angle)*radius,4+Math.sin(angle)*radius*.72*aperture,z+depth+Math.sin(angle*3+m)*.45];
          this.layer=Math.sin(a)<-.8?-1:2;
          this.polygon([point(a,r,ring*.7),point(b,r,ring*.7),point(b,r-.32,ring*.7),point(a,r-.32,ring*.7)],ring%2?[144,100,172]:[221,116,139]);
        }
      }
      this.layer=2;
      // An orbiting family of smaller solids makes the attractor's changed geometry legible.
      for(let i=0;i<12;i++) {
        const a=i*Math.PI/6+m*(s.reducedMotion?.12:.5);
        this.box(Math.cos(a)*(9+m),9+Math.sin(a)*7,32+Math.sin(a)*6,1.3,1.3,1.3,[102,151,168],a+m);
      }
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
        if(s.variant===2)this.windowBox(w.x+fan,w.y+3,w.z+1,2.1*pop,1.6*pop,w.seed+1);
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
            box(x,.22,z,3.8,.44,4.4,[74,132,131]);
            box(x+side*.6,.9,z+.5,2.3,1.6,2.4,[239,233,201],side*.8);
          } else if(age<0) {
            box(x,tower.height*.5,z,2.3,tower.height,2.7,[246,241,212]);
            box(x,tower.height+.25,z,3,.5,3.3,[66,126,129]);
            for(let n=1;n<4;n++)box(x-.02,tower.height*n/4,z-1.37,1.4,.18,.05,[70,115,128]);
          } else {
            for(let n=0;n<3;n++) {
              const flight=Math.max(0,Math.sin(clamp(age/1.7)*Math.PI));
              box(x+side*age*(2+n),Math.max(-2,tower.height*(n+.5)/3*(1-age*.7))+flight*2,z+Math.sin(n*2)*age*3,
                2.3,tower.height/3,2.7,n===2?[66,126,129]:[246,241,212],side*age*(.7+n*.3));
            }
          }
        }
      }
    }
    pack(s,gather=0) {
      const positions=[-.95,.95,-2.4,2.4,-3.85,3.85];
      for(let i=1;i<s.echoes;i++) {
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
      if(scale>.05) {
        const fragment=s.scene==='collapse'?Math.sin(clamp(s.sceneTime/.85)*Math.PI)*4:0;
        this.dino(s,{x:0,y:0,z:27,scale,color:[224,240,198],fragment});
        // Monumental broken ribs of the whole journey converge behind the giant.
        for(let i=0;i<9;i++) {
          const a=i*Math.PI/8;
          const x=Math.cos(a)*20,y=Math.sin(a)*23;
          this.box(x,y,39,4,.6,1.2,i%2?[102,174,167]:[233,143,136],a+Math.PI/2);
        }
      }
      if(s.scene==='finale') {
        this.gameplay=true;this.layer=4;
        const fly=s.finalInput?clamp((s.sceneTime-s.finalJumpTime)/.84):0;
        this.cactus(mix(3.6,-2.7,fly),1,.75,0,0,[225,233,212]);
        this.layer=3;this.box(0,.03,.25,2.5,.03,.14,[220,244,194]);this.gameplay=false;this.layer=2;
      }
    }
    showWorld(s) {
      const style=['coalesce','finale','collapse'].includes(s.scene)?'ending':s.scene==='crash'?'desktop':s.scene;
      this.runway(s,style);this.layer=2;
      if(s.scene==='corkscrew')this.corkscrew(s);
      else if(s.scene==='dream')this.dream(s);
      else if(s.scene==='desktop'||s.scene==='crash')this.desktop(s);
      else if(s.scene==='stampede') {this.stampede(s);this.pack(s);}
      else this.ending(s);
      this.rewards(s);this.gameplay=true;this.layer=3;
      const next=s.obstacles.find(o=>!o.resolved && o.z>-.3);
      if(next) {
        const z=next.z-s.speed*.42,c=next.z/s.speed<.60?[252,237,112]:s.scene==='dream'?[124,85,138]:[47,87,99];
        this.box(0,.035,z,2.9,.035,.14,c);
        for(const side of [-1,1])this.box(side*1.45,.035,z+.36,.09,.035,.72,c);
      }
      this.box(0,.025,-.1,.95+s.player.height*.16,.025,1.6+s.player.height*.12,[42,48,69]);
      this.layer=4;
      for(const o of s.obstacles) {
        if(o.resolved && o.clear)continue;
        if(s.scene==='desktop')this.windowBox(0,o.resolved?-.5:0,o.z,1.8,1.25,o.id);
        else this.cactus(o.z,1,1,0,o.resolved?-.5:0,s.scene==='dream'?[227,115,122]:s.scene==='stampede'?[44,99,112]:[89,223,213]);
      }
      this.hero=true;
      if(s.scene==='desktop'||s.scene==='crash')this.windowBox(0,s.player.height,0,1.6,2.05,0,true);
      else this.dino(s);
      this.hero=false;
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
          for(let side of [-1,1])for(let i=0;i<4;i++)
            this.windowBox(side*(5+i*1.8),2+i*.9+lift,9+i*3,3.8,2.8,i);
        } else if(s.scene==='dream') {
          for(let i=0;i<8;i++) {
            const a=i*Math.PI/4;
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
    draw(s) {
      const start = performance.now();
      const c = this.ctx, w = this.w, h = this.h;
      const e = smooth(s.extrusion);
      const palette=this.palette(s.scene), prev=this.palette(s.previousScene);
      const tone=palette.map((n,i)=>mix(prev[i],n,smooth(s.sceneTime/1.1)));
      const bg = [247,247,247].map((n,i)=>Math.round(mix(n,tone[i],e)));
      this.background=bg;
      c.fillStyle = `rgb(${bg})`; c.fillRect(0,0,w,h);
      if (e > .01 && ['extrusion','track','coalesce','finale','collapse'].includes(s.scene)) {
        const gradient = c.createRadialGradient(w*.53,h*.38,0,w*.53,h*.38,w*.7);
        gradient.addColorStop(0,`rgba(104,49,121,${e*.5})`); gradient.addColorStop(1,'rgba(9,11,29,0)');
        c.fillStyle=gradient; c.fillRect(0,0,w,h);
      }
      this.faces.length = 0;this.gameplay=false;
      this.camera(s); this.world(s);
      // Ground/decal passes avoid average-depth floor polygons cutting through feet.
      // Above-ground meshes retain stable camera-space painter ordering.
      this.faces.sort((a,b)=>a.layer-b.layer || b.depth-a.depth || a.order-b.order);
      c.lineJoin='round';
      for (const f of this.faces) {
        c.beginPath(); c.moveTo(...f.points[0]);
        for (let i=1;i<f.points.length;i++) c.lineTo(...f.points[i]);
        c.closePath(); c.fillStyle=f.color; c.fill();
        // Hairline in face colour closes antialias cracks, with no expensive shadows.
        c.strokeStyle=f.edge || f.color; c.lineWidth=.65; c.stroke();
      }
      c.textAlign='right'; c.font='11px ui-monospace, monospace';
      c.fillStyle=['dream','desktop','stampede'].includes(s.scene)?'#34465c':e>.5?'#c6d1e3':'#777';
      c.fillText(String(s.score).padStart(4,'0'),w-22,34);
      if (s.scene === 'offline' && s.mode !== 'idle') {
        for(let i=0;i<s.target;i++) { c.fillStyle=i<s.success?'#535353':'#d4d4d4'; c.fillRect(w-61+i*14,47,7,3); }
      }
      if(s.mode!=='idle') {
        c.font='10px ui-monospace, monospace';
        c.fillText('LAP '+s.lap,w-22,s.scene==='desktop'?100:64);
        if(s.combo>1)c.fillText(s.combo+' clears · ×'+s.multiplier,w-22,s.scene==='desktop'?116:80);
      }
      if(s.scene==='desktop') {
        c.fillStyle='#253d72';c.fillRect(0,58,w,27);
        c.fillStyle='#fff';c.textAlign='left';c.font='11px ui-monospace, monospace';
        c.fillText('dinosaurOS  /  workspace '+String(s.success+1).padStart(2,'0'),18,76);
        c.fillStyle='#253d72';c.fillText('windows: '+(s.windows.length+1)+'    memory: unreasonably full',18,h-48);
      }
      if(s.scene==='crash' && s.sceneTime>.7) {
        c.fillStyle='#2340a2';c.fillRect(0,0,w,h);
        c.textAlign='left';c.fillStyle='#edf4ff';c.font='bold 18px ui-monospace, monospace';
        c.fillText('WINDOW LIMIT EXCEEDED',w*.09,h*.36);
        c.font='12px ui-monospace, monospace';c.fillText('The desktop could not contain it.',w*.09,h*.36+38);
        c.fillText('Restoring the dinosaur…',w*.09,h*.36+63);
      }
      if(s.scene==='finale' && !s.finalInput) {
        // A quiet visual callback, not a new control instruction.
        c.fillStyle='#ecf5ed';c.textAlign='center';c.font='12px ui-monospace, monospace';
        c.fillText('One more.',w*.5,h*.22);
      }
      this.stats.polygons=this.faces.length;
      this.stats.maxPolygons=Math.max(this.stats.maxPolygons,this.faces.length);
      this.stats.renderMs=performance.now()-start;
    }
  }
  window.DinoRenderer = DinoRenderer;
})();
