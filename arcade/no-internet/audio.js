/* Original 136 BPM score. The simulation's visual beat never depends on AudioContext. */
(() => {
  'use strict';
  const BPM = 136, BEAT = 60 / BPM;
  class DinoAudio {
    constructor(muted) {
      this.muted = muted; this.context = null; this.voices = new Set();
      this.scene = ''; this.step = 0; this.origin = 0; this.failed = false;
    }
    async unlock() {
      if (this.muted || this.failed) return;
      try {
        if (!this.context) {
          const Context = window.AudioContext || window.webkitAudioContext;
          if (!Context) { this.failed = true; return; }
          const a = this.context = new Context();
          this.master = a.createGain(); this.master.gain.value = .42;
          const compressor = a.createDynamicsCompressor();
          compressor.threshold.value = -20; compressor.knee.value = 20; compressor.ratio.value = 5;
          this.master.connect(compressor); compressor.connect(a.destination);
          this.noise = a.createBuffer(1,a.sampleRate*.3,a.sampleRate);
          const data = this.noise.getChannelData(0); let seed = 127;
          for(let i=0;i<data.length;i++) { seed = (Math.imul(seed,1664525)+1013904223)>>>0; data[i]=(seed/4294967296)*2-1; }
        }
        if (this.context.state === 'suspended') await this.context.resume();
        this.scene = '';
      } catch { this.failed = true; }
    }
    stopVoices() {
      for(const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
      this.voices.clear();
    }
    pause() {
      this.stopVoices(); this.scene = '';
      if (this.context && this.context.state === 'running') this.context.suspend().catch(()=>{});
    }
    setMuted(value) { this.muted=value; if(value) this.pause(); else this.unlock(); }
    tone(time,frequency,duration,volume,type='triangle',end=null) {
      const a=this.context;
      if (!a || this.muted || a.state!=='running' || this.voices.size>=40) return;
      const o=a.createOscillator(), g=a.createGain();
      o.type=type; o.frequency.setValueAtTime(frequency,time);
      if(end) o.frequency.exponentialRampToValueAtTime(end,time+duration);
      g.gain.setValueAtTime(.0001,time); g.gain.exponentialRampToValueAtTime(volume,time+.006);
      g.gain.exponentialRampToValueAtTime(.0001,time+duration);
      o.connect(g); g.connect(this.master); this.voices.add(o);
      o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};
      o.start(time);o.stop(time+duration+.015);
    }
    hiss(time,duration,volume,frequency) {
      const a=this.context;
      if(!a || this.muted || a.state!=='running' || this.voices.size>=40) return;
      const o=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();
      o.buffer=this.noise; f.type='highpass'; f.frequency.value=frequency;
      g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.0001,time+duration);
      o.connect(f);f.connect(g);g.connect(this.master);this.voices.add(o);
      o.onended=()=>{this.voices.delete(o);o.disconnect();f.disconnect();g.disconnect();};
      o.start(time);o.stop(time+duration);
    }
    jump(plain) {
      if (!this.context) return;
      this.tone(this.context.currentTime+.008,plain?290:392,.065,plain?.045:.025,plain?'square':'triangle',plain?390:520);
    }
    clear(plain,scene,big=false,variant=0) {
      if(!this.context) return;
      const t=this.context.currentTime+.008;
      const note=({track:587,corkscrew:740,dream:659,desktop:880,stampede:440})[scene]||587;
      this.tone(t,plain?520:note,.10,.04,'triangle');
      if(!plain) this.tone(t+.09,note*1.5,.22,.035,scene==='desktop'?'triangle':'sine');
      if(big)for(const [i,ratio] of [1,1.25,1.5,2].entries())
        this.tone(t+i*.045,note*ratio*(variant===2?.5:1),.32,.035,'sine');
    }
    payoff() {
      const a=this.context;if(!a || this.muted)return;
      this.stopVoices();const t=a.currentTime+.008;
      this.tone(t,145,.48,.27,'sine',36);
      this.hiss(t,.25,.06,900);
      for(const f of [146.83,220,293.66,369.99])this.tone(t,f,1.1,.055,'triangle');
    }
    sync(s) {
      const a=this.context;
      if(!a || this.muted || a.state!=='running')return;
      if(s.scene==='collapse') {this.scene=s.scene;return;}
      if(s.mode!=='running' || ['rupture','offline','crash','coalesce','finale','breath'].includes(s.scene)) {
        if(this.scene!==s.scene)this.stopVoices();this.scene=s.scene;return;
      }
      // One transport: both geometry pulses and scheduled notes use simTime / BEAT.
      // Scene changes replace instruments, never secretly reset the musical phase.
      const changed=this.scene!==s.scene;
      if(changed || Math.abs((a.currentTime-this.origin)-s.simTime)>.18) {
        if(changed)this.stopVoices();this.scene=s.scene;
        this.origin=a.currentTime-s.simTime;this.step=Math.ceil(s.simTime/(BEAT/2));
        if(changed && ['extrusion','stampede'].includes(s.scene)) {
          const downbeat=this.origin+Math.ceil(s.simTime/BEAT)*BEAT;
          this.tone(Math.max(a.currentTime+.005,downbeat),155,.48,.28,'sine',38);
        }
      }
      let scheduled=0;
      while(this.origin+this.step*BEAT/2<a.currentTime+.12 && scheduled++<4) {
        const n=this.step++,t=Math.max(a.currentTime+.005,this.origin+n*BEAT/2);
        const dream=s.scene==='dream',desk=s.scene==='desktop',pack=s.scene==='stampede';
        const variation=s.variant||0;
        const bass=[73.42,73.42,87.31,65.41][(Math.floor(n/8)+variation)%4];
        if(variation && n%4===variation)this.tone(t,bass*(variation===1?8:6),BEAT*.6,.022,'sine');
        if(n%(dream?8:2)===0)this.tone(t,132,.18,dream?.15:.27,'sine',43);
        if(n%(dream?16:8)===(dream?8:4)) {
          this.hiss(t,dream?.18:.13,dream?.035:.09,1300);this.tone(t,175,.08,.045,'triangle');
        }
        if(!dream || n%4===2)this.hiss(t,.025,n%2?.025:.018,6500);
        if(n%(dream?4:2)===0)this.tone(t,bass*(n%8===6?2:1),desk?.10:BEAT*(dream?1.5:.7),.085,'triangle');
        if(n%8===0)for(const ratio of [2,2.4,3])this.tone(t,bass*ratio,BEAT*(dream?6:3.1),dream?.038:.025,'sine');
        if(dream && n%4===0)this.tone(t,bass*[4,6,4.8,3][Math.floor(n/4)%4],.7,.038,'sine');
        else if(n%4===3 || (s.scene==='corkscrew' && n%2===1))this.tone(t,bass*[4,6,4.8,3][Math.floor(n/4)%4],desk?.065:.16,.025,'triangle');
        if(pack) {
          const build=Math.min(1,s.sceneTime/16);
          this.tone(t,bass*[4,4.8,6,8][n%4],.13,.018+build*.028,'triangle');
          if(n%8===0)for(const ratio of [4,4.8,6])this.tone(t,bass*ratio,BEAT*3,.018+build*.01,'triangle');
          if(s.sceneTime>12 && n%2)this.hiss(t,.07,.025,2500);
        }
      }
    }
    get snapshot() { return { available:!!this.context, state:this.context?.state||'uncreated', muted:this.muted, voices:this.voices.size, failed:this.failed, transportBeat:this.context?(this.context.currentTime-this.origin)/BEAT:0 }; }
  }
  window.DinoAudio=DinoAudio;
})();
