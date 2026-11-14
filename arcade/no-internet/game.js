(() => {
  'use strict';
  const game = document.getElementById('game');
  const offline = document.getElementById('offline');
  const hint = document.getElementById('hint');
  const chapter = document.getElementById('chapter');
  const mute = document.getElementById('mute');
  const bank = document.getElementById('bank');
  const health = document.getElementById('health');
  const hearts = health.querySelector('.hearts');
  const healthCue = health.querySelector('.health-cue');
  const bestKey = 'a1NoInternetBest';
  const debugMode = new URLSearchParams(location.search).has('debug');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEP = 1 / 120, BEAT = 60 / 136, MAX_HEALTH = 3, RECOVERY = .8;
  const PHRASES = {
    track:{target:4,deadline:14,minimum:10,interval:2.45,next:'corkscrew'},
    corkscrew:{target:4,deadline:11,minimum:9.5,interval:2.05,next:'dream'},
    dream:{target:4,deadline:12,minimum:11,interval:2.6,next:'desktop'},
    desktop:{target:4,deadline:11,minimum:9.5,interval:2.0,next:'crash'}
  };
  const clamp = (n,a=0,b=1) => Math.max(a,Math.min(b,n));
  const smooth = n => (n=clamp(n),n*n*(3-2*n));
  const stored = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const store = (key,value) => { try { localStorage.setItem(key,String(value)); } catch { /* Private browsing still plays. */ } };
  let muted = stored('a1NoInternetMuted') === '1';
  const renderer = new DinoRenderer(game);
  const audio = new DinoAudio(muted);
  let s, accumulator=0, last=performance.now(), paused=document.hidden, runSerial=0;
  let frameCount=0, frameSum=0, slowFrames=0, renderSum=0;

  function dismissCard() {
    // The shared close control removes BOTH its node and its private document key listener.
    document.querySelector('.arc-scorecard__close')?.click();
  }
  function reset(startNow=false) {
    dismissCard(); audio.pause();
    s = {
      mode:startNow?'running':'idle', scene:'offline', previousScene:'offline', sceneTime:0, simTime:0, beat:0,
      speed:8, distance:0, score:0, combo:0, multiplier:1, success:0, target:3,
      health:MAX_HEALTH, maxHealth:MAX_HEALTH, recovery:0,
      lap:1, variant:0, lapEarned:0, lapScore:0, banked:false, effects:[], impact:0, burst:0, waveTime:-100,
      earned:0, fallback:0, transitions:[], projectionBlend:0, extrusion:0,
      obstacles:[], monuments:[], windows:[], city:[], pending:0, nextSpawn:2.7, serial:0,
      sceneDistance:0, worldRoll:0, rollFrom:0, rollTarget:0, rollTime:1,
      morph:0, morphTarget:0, lastJumpTime:-100, finalInput:false, finalJumpTime:0, finalJumpSerial:null,
      dropAt:0, cascadeCount:0,
      player:{height:0,velocity:0,grounded:true,buffer:0,stumble:0,jumps:0},
      echoes:1, completion:null, reported:false, debugAssisted:false, reducedMotion,
      run:++runSerial, previousBest:Number(stored(bestKey))||0
    };
    accumulator=0; last=performance.now();bankState();healthState();
    hint.hidden=startNow; offline.style.opacity='1';
    chapter.textContent=''; document.documentElement.dataset.spatial='false';document.documentElement.dataset.scene='offline';
    if(startNow) {
      if(typeof Arcade!=='undefined') Arcade.onGameStart('no-internet');
      audio.unlock();
    }
  }
  function bankState() {
    // Explicit banking is also available while paused; it never resumes audio.
    bank.disabled=s.mode!=='running' || s.score<=0 || s.banked || s.debugAssisted;
  }
  function healthState() {
    const cue=s.completion==='death'?'RUN ENDED':s.recovery>0?'RECOVERING':'';
    const label=`${s.health} of ${s.maxHealth} hearts${cue?', '+cue.toLowerCase():''}`;
    if(health.getAttribute('aria-label')===label)return;
    health.setAttribute('aria-label',label);
    health.dataset.recovering=String(s.recovery>0);
    hearts.textContent='♥'.repeat(s.health)+'♡'.repeat(s.maxHealth-s.health);
    healthCue.textContent=cue;
  }
  function nextLap() {
    if(s.mode!=='running' || s.health<=0 || s.scene!=='breath' || !s.finalInput) return;
    s.health=Math.min(s.maxHealth,s.health+1);
    // Session identity, time, score, earned totals and captured best survive the breath.
    s.lap++;s.variant=(s.lap-1)%3;
    Object.assign(s,{success:0,target:2,lapEarned:0,lapScore:0,nextSpawn:.65,
      pending:0,combo:0,multiplier:1,echoes:1,morph:0,morphTarget:0,
      finalInput:false,finalJumpTime:0,finalJumpSerial:null,dropAt:0,cascadeCount:0,
      worldRoll:0,rollFrom:0,rollTarget:0,rollTime:1,impact:0,burst:0,waveTime:-100,lastJumpTime:-100});
    s.obstacles.length=0;s.monuments.length=0;s.windows.length=0;s.city.length=0;s.effects.length=0;
    Object.assign(s.player,{height:0,velocity:0,grounded:true,buffer:0,stumble:0});
    enter('offline','lap');
  }
  function action() {
    if(paused || document.hidden || s.mode==='complete') return;
    if(s.mode==='idle') reset(true);
    // The same buffered jump in every view. No alternate airborne action.
    if(audio.context?.state!=='running') audio.unlock();
    s.player.buffer=.16;
    jumpIfReady();
  }
  function jumpIfReady() {
    const p=s.player;
    if(p.buffer<=0 || !p.grounded) return;
    p.buffer=0; p.grounded=false; p.velocity=7.7; p.jumps++;
    s.lastJumpTime=s.simTime;
    if(s.scene==='finale' && !s.finalInput) {
      s.finalInput=true;s.finalJumpTime=s.sceneTime;s.finalJumpSerial=p.jumps;
    }
    if(!['finale','coalesce','crash','collapse','breath'].includes(s.scene)) audio.jump(s.scene==='offline');
  }
  function enter(scene, reason) {
    if(reason) {
      s.transitions.push({from:s.scene,to:scene,reason,success:s.success,time:s.simTime,lap:s.lap});
      if(s.transitions.length>48)s.transitions.shift();
      if(reason==='deadline') s.fallback++;
    }
    s.previousScene=s.scene;s.scene=scene;s.sceneTime=0;s.sceneDistance=0;
    s.obstacles.length=0;s.pending=0;s.effects.length=0;s.impact=0;s.burst=0;
    if(scene==='rupture') {
      s.dropAt=Math.ceil((s.simTime+1.2)/BEAT)*BEAT;
      audio.stopVoices();
    } else if(scene==='extrusion') {
      s.monuments=[{z:28,side:-1,scale:7,age:0},{z:43,side:1,scale:9,age:0}];
    } else if(PHRASES[scene]) {
      s.success=0;s.target=PHRASES[scene].target;s.nextSpawn=scene==='track'?2.5:.15;
      s.morphTarget=0;
      if(scene==='dream') turnWorld(Math.round(s.worldRoll/(Math.PI*2))*Math.PI*2);
      if(scene==='desktop') {s.windows=[];s.morph=0;}
    } else if(scene==='crash') {
      s.target=0;audio.stopVoices();
    } else if(scene==='stampede') {
      s.success=0;s.target=5;s.nextSpawn=.15;s.echoes=1;
      s.city=Array.from({length:24},(_,i)=>({id:i,z:18+i*9,brokenAt:null,height:5+(i%4)*2}));
    } else if(scene==='coalesce') {
      s.target=0;s.success=0;audio.stopVoices();
    } else if(scene==='finale') {
      s.finalInput=false;s.finalJumpTime=0;s.finalJumpSerial=null;s.target=1;s.success=0;s.player.buffer=0;audio.stopVoices();
    } else if(scene==='collapse') {
      s.success=1;s.target=1;s.player.buffer=0;
      audio.payoff();
    } else if(scene==='breath') {
      s.extrusion=0;s.projectionBlend=0;s.worldRoll=0;s.rollFrom=0;s.rollTarget=0;s.rollTime=1;audio.stopVoices();
    }
    const names={extrusion:'01 / THE OTHER SIDE',track:'01 / THE OTHER SIDE',corkscrew:'02 / INSIDE OUT',dream:'03 / SOMETHING REMEMBERS',desktop:'04 / DINOSAUR OS',crash:'',stampede:'05 / EVERY ONE OF US',coalesce:'',finale:'',collapse:'',breath:''};
    chapter.textContent=names[scene]||'';
    document.documentElement.dataset.spatial=String(!['offline','rupture','breath'].includes(scene));
    document.documentElement.dataset.scene=scene;
  }
  function turnWorld(target) {
    const tau=Math.PI*2, offset=Math.round(s.worldRoll/tau)*tau;
    s.worldRoll-=offset;s.rollFrom=s.worldRoll;s.rollTarget=target-offset;s.rollTime=0;
  }
  function successfulTransformation() {
    if(s.scene==='track') growMonument();
    else if(s.scene==='corkscrew') turnWorld(s.rollTarget+(s.variant===1?-1:1)*Math.PI/2);
    else if(s.scene==='dream') s.morphTarget=s.success;
    else if(s.scene==='desktop') {
      s.morphTarget=s.success;
      for(let i=0;i<5;i++) s.windows.push({x:(i%2?-1:1)*(3.7+i*.6),y:i*.55,z:8+i*2.4,age:-i*.09,seed:s.success*5+i});
      if(s.windows.length>24)s.windows.splice(0,s.windows.length-24);
    } else if(s.scene==='stampede') {
      s.echoes=Math.min(s.variant?40:32,2**s.success);s.waveTime=s.simTime;
      const targets=s.city.filter(t=>t.z>0 && t.brokenAt===null).slice(0,3);
      targets.forEach((t,i)=>{t.brokenAt=s.simTime+i*(s.echoes===32?.95:.22);});
      s.cascadeCount+=targets.length;
    }
  }
  function growMonument() {
    const side=s.success%2?-1:1;
    // A finite pool. Each earned landing makes a new piece of the world.
    if(s.monuments.length>=8) s.monuments.shift();
    s.monuments.push({z:17+s.success*1.5,side,scale:6+Math.min(s.success,4)*1.5,age:0});
  }
  function landed() {
    if(s.mode!=='running') return;
    if(s.scene==='finale' && s.finalInput && s.player.jumps===s.finalJumpSerial) {enter('collapse','input-landing');return;}
    if(!s.pending) return;
    const count=s.pending;s.pending=0;
    for(let i=0;i<count;i++) {
      s.success++;s.earned++;s.lapEarned++;s.combo++;
      s.multiplier=Math.min(3,1+Math.floor(s.combo/3));
      const points=(30+Math.min(s.combo,4)*5)*s.multiplier;
      s.score+=points;s.lapScore+=points;
      s.impact=.32;
      const big=s.combo%3===0 && s.scene!=='offline';
      if(big)s.burst=1.5;
      s.effects.push({age:0,z:0,big,scene:s.scene});
      if(s.effects.length>8)s.effects.shift();
      audio.clear(s.scene==='offline',s.scene,big,s.variant);
      successfulTransformation();
    }
    if(s.scene==='offline' && s.success>=s.target) enter('rupture','earned');
  }
  function obstacles(dt,allowSpawn=true) {
    if(allowSpawn)s.nextSpawn-=dt;
    if(allowSpawn && s.nextSpawn<=0 && s.obstacles.length<5) {
      // Spawn with a fixed TTC, regardless of viewport or camera.
      s.obstacles.push({id:++s.serial,z:s.speed*2.4,resolved:false,clear:false,hit:false});
      s.nextSpawn=PHRASES[s.scene]?.interval || 2.45;
    }
    for(const o of s.obstacles) {
      o.z-=s.speed*dt;
      if(!o.resolved && !o.hit && Math.abs(o.z)<.40 && s.player.height<.58) {
        // Even protected contacts are misses, never a later clear from this hazard.
        o.hit=true;
        if(s.recovery<=0) {
          s.health=Math.max(0,s.health-1);s.recovery=RECOVERY;s.player.stumble=.42;
          if(s.health===0) {finishRun('death');return;}
        }
      }
      if(!o.resolved && o.z<-.42) {
        o.resolved=true;
        o.clear=!o.hit && !s.player.grounded && s.player.jumps>0;
        if(o.clear) s.pending++;
        else {s.combo=0;s.multiplier=1;s.player.stumble=.42;}
      }
    }
    s.obstacles=s.obstacles.filter(o=>o.z>-8);
  }
  function update(dt) {
    if(s.mode!=='running') return;
    // Anticipation is finite, but the ordinary final input is never fabricated by a clock.
    const waiting=s.scene==='finale' && !s.finalInput && s.player.grounded;
    if(!waiting) {s.simTime+=dt;s.sceneTime+=dt;}
    s.beat=s.simTime/BEAT;
    s.recovery=Math.max(0,s.recovery-dt);
    s.impact=Math.max(0,s.impact-dt);s.burst=Math.max(0,s.burst-dt);
    for(const effect of s.effects) {effect.age+=dt;effect.z-=s.speed*dt*.35;}
    s.effects=s.effects.filter(effect=>effect.age<1.5);
    const p=s.player;
    let justLanded=false;
    p.buffer=Math.max(0,p.buffer-dt);p.stumble=Math.max(0,p.stumble-dt);
    jumpIfReady();
    if(!p.grounded) {
      p.velocity-=18*dt;p.height+=p.velocity*dt;
      if(p.height<=0) {p.height=0;p.velocity=0;p.grounded=true;justLanded=true;landed();jumpIfReady();}
    }
    // The suspense arrests forward travel, not the meaning of a jump input.
    if(!['rupture','coalesce','finale','collapse','breath','crash'].includes(s.scene)) {
      s.distance+=s.speed*dt;s.sceneDistance+=s.speed*dt;
    }
    // Do the spectacular turn after landing, then settle before the next contact.
    const near=s.obstacles.some(o=>!o.resolved && o.z/s.speed<.9 && o.z>-.42);
    s.rollTime=Math.min(1,s.rollTime+dt/(reducedMotion?1.2:near?1.8:.70));
    s.worldRoll=s.rollFrom+(s.rollTarget-s.rollFrom)*smooth(s.rollTime);
    s.morph+=(s.morphTarget-s.morph)*Math.min(1,dt*3.8);
    for(const w of s.windows) {w.age+=dt;if(s.scene==='desktop')w.z-=s.speed*dt*.48;}
    s.windows=s.windows.filter(w=>w.z>-12);
    if(s.scene==='stampede')for(const tower of s.city)tower.z-=s.speed*dt;
    for(const m of s.monuments) {m.age+=dt;if(s.scene==='track')m.z-=s.speed*dt*.44;}
    s.monuments=s.monuments.filter(m=>m.z>-14);
    if(s.scene==='offline') {
      obstacles(dt);
      if(s.mode!=='running') return;
      if(s.sceneTime>=(s.lap===1?12.5:8) && (p.grounded || justLanded)) enter('rupture','deadline');
    } else if(s.scene==='rupture') {
      if(s.simTime>=s.dropAt) enter('extrusion');
    } else if(s.scene==='extrusion') {
      s.extrusion=smooth(s.sceneTime/2.9);
      // Reduced motion keeps the dimensional reveal, with a longer, gentler orbit.
      s.projectionBlend=smooth(s.sceneTime/(reducedMotion?5.1:4.2));
      if(s.sceneTime>=(reducedMotion?5.3:4.4)) {
        s.extrusion=1;s.projectionBlend=1;enter('track');
      }
    } else if(PHRASES[s.scene]) {
      const phrase=PHRASES[s.scene];
      obstacles(dt);
      if(s.mode!=='running') return;
      const earned=s.success>=phrase.target && s.sceneTime>=phrase.minimum;
      if((earned || s.sceneTime>=phrase.deadline) && (p.grounded || justLanded)) enter(phrase.next,earned?'earned':'deadline');
    } else if(s.scene==='crash') {
      if(s.sceneTime>=2.2) enter('stampede');
    } else if(s.scene==='stampede') {
      // A fixed musical build, never lengthened by misses.
      // Close the spawner, not collision resolution: the last presented cactus is earned too.
      obstacles(dt,s.sceneTime<13.5);
      if(s.mode!=='running') return;
      if(s.sceneTime>=16 && (p.grounded || justLanded)) enter('coalesce',s.success>=5?'earned':'deadline');
    } else if(s.scene==='coalesce') {
      if(s.sceneTime>=2.2) enter('finale');
    } else if(s.scene==='collapse') {
      const fold=smooth(s.sceneTime/2.25);
      s.projectionBlend=1-fold;s.extrusion=1-fold;
      if(s.sceneTime>=2.4) enter('breath');
    } else if(s.scene==='breath') {
      if(s.sceneTime>=1.15 && s.finalInput) nextLap();
    }
  }
  function finishRun(reason) {
    if(s.mode!=='running' || s.reported) return;
    if(reason==='banked' && (s.score<=0 || s.debugAssisted)) return;
    // Latch the terminal state before any shared callbacks, including zero-score deaths.
    s.banked=reason==='banked';s.completion=reason;s.mode='complete';
    s.player.buffer=0;s.player.velocity=0;s.pending=0;s.recovery=0;
    if(reason==='death') {s.combo=0;s.multiplier=1;}
    audio.pause();bankState();healthState();
    if(s.debugAssisted) return;
    s.reported=true;
    const score=s.score, previousBest=s.previousBest;
    if(typeof Arcade!=='undefined') {
      Arcade.onGameOver('no-internet',score);
      const card=Arcade.createScoreCard('no-internet',score,previousBest);
      if(card) document.body.appendChild(card);
    }
    // Arcade must read the old stored best when computing its rewards.
    store(bestKey,Math.max(previousBest,score));
  }
  function frame(now) {
    const elapsed=Math.max(0,(now-last)/1000);last=now;
    if(!paused && !document.hidden) {
      accumulator+=Math.min(elapsed,.075);
      let steps=0;
      while(accumulator>=STEP && steps++<9) {update(STEP);accumulator-=STEP;}
      if(steps>9)accumulator=0;
      audio.sync(s);
    }
    if(!document.hidden) {
      renderer.draw(s);bankState();healthState();
      offline.style.opacity=['offline','breath'].includes(s.scene)?'1':s.scene==='rupture'?String(1-smooth(s.sceneTime/1.1)):s.scene==='collapse'?String(smooth((s.sceneTime-1.8)/.6)):'0';
      frameCount++;frameSum+=Math.min(elapsed,1)*1000;renderSum+=renderer.stats.renderMs;
      if(elapsed>.025)slowFrames++;
    }
    requestAnimationFrame(frame);
  }
  function setPause(value) {
    paused=value;accumulator=0;last=performance.now();s.player.buffer=0;
    if(value)audio.pause();else if(s.mode==='running')audio.unlock();
  }
  function restart() {reset(true);document.activeElement?.blur();}
  addEventListener('keydown',e=>{
    // Shared card handles document keys first; never turn its restart key into a jump.
    if(e.defaultPrevented || e.repeat || e.target.closest?.('button,a,input,textarea,select,[contenteditable]')) return;
    if(e.code==='Space' || e.code==='ArrowUp') {e.preventDefault();action();}
  });
  game.addEventListener('pointerdown',e=>{
    if(!e.isPrimary || (e.pointerType==='mouse' && e.button!==0))return;
    e.preventDefault();action();
  });
  game.addEventListener('pointercancel',()=>{s.player.buffer=0;});
  addEventListener('blur',()=>setPause(true));
  addEventListener('focus',()=>setPause(document.hidden));
  document.addEventListener('visibilitychange',()=>setPause(document.hidden));
  addEventListener('resize',()=>renderer.resize());
  bank.addEventListener('click',()=>finishRun('banked'));
  document.getElementById('again').addEventListener('click',restart);
  document.addEventListener('arcade-restart',restart);
  function muteLabel() {
    mute.classList.toggle('off',muted);mute.setAttribute('aria-label',muted?'Enable sound':'Mute sound');
    mute.setAttribute('aria-pressed',String(muted));
  }
  mute.addEventListener('click',()=>{muted=!muted;store('a1NoInternetMuted',muted?'1':'0');audio.setMuted(muted);muteLabel();});
  const freeze = value => {
    if(value && typeof value==='object') {Object.values(value).forEach(freeze);Object.freeze(value);}return value;
  };
  function snapshot() {
    const next=s.obstacles.find(o=>!o.resolved);
    return freeze({
      version:3,health:s.health,maxHealth:s.maxHealth,recovery:s.recovery,lap:s.lap,variant:s.variant,multiplier:s.multiplier,lapEarned:s.lapEarned,sessionEarned:s.earned,lapScore:s.lapScore,banked:s.banked,impact:s.impact,burst:s.burst,
      effectCounts:{impacts:s.effects.length,bursts:s.effects.filter(e=>e.big).length,transitions:s.transitions.length},mode:s.mode,scene:s.scene,sceneTime:s.sceneTime,success:s.success,target:s.target,
      earned:s.earned,fallback:s.fallback,transitions:s.transitions.map(t=>({...t})),
      simTime:s.simTime,beat:s.beat,playerHeight:s.player.height,player:{...s.player},
      nextTTC:next?next.z/s.speed:null,spawnIn:s.nextSpawn,score:s.score,combo:s.combo,echoes:s.echoes,
      projectionBlend:s.projectionBlend,extrusion:s.extrusion,worldRoll:s.worldRoll,morph:s.morph,finalInput:s.finalInput,finalJumpTime:s.finalJumpTime,finalJumpSerial:s.finalJumpSerial,waitingForFinalInput:s.scene==='finale'&&!s.finalInput,cascadeCount:s.cascadeCount,
      entityCounts:{obstacles:s.obstacles.length,monuments:s.monuments.length,windows:s.windows.length,towers:s.city.length,echoes:s.echoes,effects:s.effects.length,transitions:s.transitions.length,polygons:renderer.stats.polygons},
      obstacles:s.obstacles.map(o=>({...o})),completion:s.completion,reported:s.reported,
      debugAssisted:s.debugAssisted,reducedMotion,paused,run:s.run,previousBest:s.previousBest,
      audio:audio.snapshot,
      art:{style:renderer.stats.style,assets:{...renderer.stats.assets},images:renderer.stats.images,
        transition:{...renderer.stats.transition},
        worldResolution:renderer.stats.worldResolution?renderer.stats.worldResolution.slice():[],budgets:{...renderer.stats.budgets}},
      timing:{frames:frameCount,meanFrameMs:frameCount?frameSum/frameCount:0,meanRenderMs:frameCount?renderSum/frameCount:0,slowFrames,maxPolygons:renderer.stats.maxPolygons}
    });
  }
  const debug={get state(){return snapshot();}};
  if(debugMode) {
    // Accelerated inspection only; no scoring shortcuts, no fabricated clear/landing.
    debug.advance=seconds=>{
      s.debugAssisted=true;bankState();
      for(let i=0;i<Math.min(30,Math.max(0,Number(seconds)||0))/STEP;i++)update(STEP);
      renderer.draw(s);bankState();healthState();return snapshot();
    };
  }
  Object.defineProperty(window,'DINO_DEBUG',{value:Object.freeze(debug),writable:false,configurable:false});
  reset();muteLabel();requestAnimationFrame(frame);
})();
