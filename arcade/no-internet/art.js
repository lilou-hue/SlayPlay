/* Original medium-specific drawings and one-time loading of the generated gouache pack. */
(() => {
  'use strict';
  const canvas = (w,h,paint) => {
    const image=document.createElement('canvas');image.width=w;image.height=h;
    paint(image.getContext('2d'));return image;
  };
  class DinoArt {
    constructor() {
      this.status='loading';this.fallbackReason='painted assets loading';this.images={};this.frames={};
      this.loaded=0;this.pixel={};
      const dino=(phase,colour=false)=>canvas(32,32,c=>{
        const ramp=colour?['#263557','#3b866e','#80c889','#e6edb0']:['#535353','#535353','#535353','#f7f7f7'];
        c.fillStyle=ramp[0];
        for(const r of [[17,2,12,2],[15,4,16,11],[13,11,10,10],[8,15,12,10],[4,15,5,7],[2,11,3,8],[10,23,4,6],[19,22,4,6],[22,15,4,2],[25,16,2,4]])c.fillRect(...r);
        c.fillRect(phase?9:11,28,phase?6:5,2);c.fillRect(phase?20:18,27,6,2);
        if(colour){c.fillStyle=ramp[1];c.fillRect(17,4,12,6);c.fillRect(12,16,9,7);c.fillRect(5,17,6,3);c.fillStyle=ramp[2];c.fillRect(17,4,10,2);c.fillRect(14,15,6,7);c.fillRect(12,22,6,2);c.fillRect(12,10,3,3);c.fillRect(8,13,3,3);}
        c.fillStyle=ramp[3];c.fillRect(24,5,2,2);c.fillRect(24,12,7,2);
      });
      this.pixel.runA=dino(false);this.pixel.runB=dino(true);
      this.pixel.cactus=canvas(24,30,c=>{c.fillStyle='#535353';for(const r of [[10,2,5,28],[2,8,4,13],[3,18,9,4],[19,5,4,13],[13,15,8,4]])c.fillRect(...r);});
      this.pixel.cloud=canvas(40,14,c=>{c.fillStyle='#b9b9b9';for(const r of [[1,10,38,1],[6,6,1,4],[7,5,9,1],[15,1,15,1],[14,2,1,4],[30,2,1,5],[31,7,5,1],[36,8,1,3]])c.fillRect(...r);});
      this.pixel.windowA=this.window(dino(false,true));this.pixel.windowB=this.window(dino(true,true));
      this.pixel.hazard=this.window(null);
      this.hatch=canvas(12,12,c=>{c.strokeStyle='#201c2440';c.lineWidth=1;c.beginPath();c.moveTo(-3,12);c.lineTo(12,-3);c.moveTo(3,15);c.lineTo(15,3);c.stroke();});
      this.dots=canvas(8,8,c=>{c.fillStyle='#201c2438';c.fillRect(1,1,2,2);c.fillRect(5,5,2,2);});
      this.dither=canvas(4,4,c=>{c.fillStyle='#17295528';c.fillRect(0,0,1,1);c.fillRect(2,2,1,1);});
      this.load();
    }
    window(dino) {
      return canvas(48,48,c=>{
        c.fillStyle='#1e254b';c.fillRect(1,1,46,46);c.fillStyle='#8195c3';c.fillRect(3,3,42,42);
        c.fillStyle='#f1eacb';c.fillRect(3,3,40,2);c.fillRect(3,3,2,40);
        c.fillStyle='#354f9c';c.fillRect(5,5,38,7);c.fillStyle='#f0ad75';c.fillRect(36,6,6,5);
        c.fillStyle='#f3e8bc';c.fillRect(5,14,38,29);c.fillStyle='#c1d39d';
        for(let y=16;y<43;y+=2)for(let x=6+(y%4);x<43;x+=4)c.fillRect(x,y,1,1);
        if(dino)c.drawImage(dino,9,13);
        else {c.fillStyle='#bf5269';c.fillRect(12,18,5,14);c.fillRect(10,21,9,8);c.fillStyle='#354f9c';c.fillRect(23,19,16,2);c.fillRect(23,24,12,2);c.fillRect(26,33,12,6);c.fillStyle='#f3e8bc';c.fillRect(28,34,8,1);}
      });
    }
    async load() {
      const timeout=setTimeout(()=>{if(this.status==='loading'){this.status='fallback';this.fallbackReason='painted assets delayed';}},10000);
      try {
        const manifestURL=new URL('assets/painted/manifest.json?v=40',location.href);
        const response=await fetch(manifestURL);
        if(!response.ok)throw new Error('manifest HTTP '+response.status);
        const manifest=await response.json();
        // The installed manifest is validated before any atlas frame is used.
        if(!manifest.atlases || !manifest.background || !manifest.images)throw new Error('invalid painted manifest');
        const load=(file)=>new Promise((resolve,reject)=>{
          if(typeof file!=='string'||!/^[-\w.]+\.webp$/.test(file)){reject(new Error('invalid image path'));return;}
          const image=new Image();image.onload=()=>{if(!image.naturalWidth)reject(new Error('empty '+file));else {this.loaded++;resolve(image);}};
          image.onerror=()=>reject(new Error('image unavailable: '+file));
          const imageURL=new URL(file,manifestURL);imageURL.search='?v=40';image.src=imageURL.href;
        });
        const entries=Object.entries(manifest.atlases);
        const loaded=await Promise.all([...entries.map(async([key,atlas])=>{
          const image=await load(manifest.images[key]);const frames={};
          for(const [name,frame] of Object.entries(atlas.frames)) {
            const r=frame.rect,a=frame.anchor;
            if(!Array.isArray(r)||r.length!==4||!r.every(Number.isFinite)||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>image.naturalWidth||r[1]+r[3]>image.naturalHeight||!Array.isArray(a)||a.length!==2||!a.every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw new Error('invalid atlas frame '+name);
            // Extract once; transparent padding isolates atlas neighbours during filtering.
            const isolated=canvas(r[2]+4,r[3]+4,c=>c.drawImage(image,...r,2,2,r[2],r[3]));
            frames[name]={image:isolated,rect:[2,2,r[2],r[3]],anchor:a.slice(),billboard:true};
          }
          return {key,image,frames};
        }),load(manifest.images.valley).then(image=>({key:'valley',image}))]);
        for(const item of loaded){this.images[item.key]=item.image;if(item.frames)Object.assign(this.frames,item.frames);}
        for(const name of ['runA','runB','jump','idle','mushroom','cactus','arch','boulder'])if(!this.frames[name])throw new Error('missing frame '+name);
        const sample=manifest.background.groundSample,valley=this.images.valley;
        if(!Array.isArray(sample)||sample.length!==4||!sample.every(Number.isFinite)||sample[0]<0||sample[1]<0||sample[2]<=0||sample[3]<=0||sample[0]+sample[2]>valley.naturalWidth||sample[1]+sample[3]>valley.naturalHeight)throw new Error('invalid ground sample');
        this.groundSample=sample.slice();
        this.status='ready';this.fallbackReason=null;
      } catch(error) {this.status='fallback';this.fallbackReason=String(error.message||error);}
      finally {clearTimeout(timeout);}
    }
    snapshot(out={}) {out.status=this.status;out.imageCount=this.loaded;out.fallbackReason=this.fallbackReason;return out;}
    medium(s) {
      if(s.scene==='offline'||s.scene==='breath'||s.scene==='rupture'||(s.scene==='extrusion'&&s.extrusion<.025)||(s.scene==='collapse'&&s.projectionBlend<.4))return 'pixel-8';
      if(s.scene==='desktop'||s.scene==='crash')return 'pixel-16';
      if(s.scene==='corkscrew')return 'ink-comic';
      if(s.scene==='dream')return this.status==='ready'?'ai-gouache':'gouache-fallback';
      if(['stampede','coalesce','finale','collapse'].includes(s.scene))return 'cel-cartoon';
      return 'vector-3d';
    }
  }
  window.DinoArt=DinoArt;
})();
