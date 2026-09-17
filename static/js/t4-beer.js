(function(global){
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const capacity = 14432;
  const initialVolume = capacity * .91;
  const ground = 284;
  const rotate = (x, y, angle) => {
    const a = angle * Math.PI / 180;
    return {x:240 + x*Math.cos(a) - y*Math.sin(a), y:264 + x*Math.sin(a) + y*Math.cos(a)};
  };
  const interior = angle => [[-48,-174],[48,-174],[40,-10],[-40,-10]].map(([x,y])=>rotate(x,y,angle));
  // Clip the rotated glass against a horizontal liquid surface; its area is
  // conserved as the glass tilts. Both overflow and drawing use this geometry.
  function areaBelow(points, level){
    const clipped=[];
    points.forEach((p,i)=>{
      const q=points[(i+1)%points.length];
      if(p.y>=level) clipped.push(p);
      if((p.y>=level)!==(q.y>=level)){
        const k=(level-p.y)/(q.y-p.y);
        clipped.push({x:p.x+k*(q.x-p.x),y:level});
      }
    });
    return Math.abs(clipped.reduce((sum,p,i)=>{
      const q=clipped[(i+1)%clipped.length];
      return sum+p.x*q.y-q.x*p.y;
    },0))/2;
  }
  function liquidLevel(points, volume){
    let lo=Math.min(...points.map(p=>p.y)), hi=Math.max(...points.map(p=>p.y));
    for(let i=0;i<20;i++){
      const mid=(lo+hi)/2;
      if(areaBelow(points,mid)>volume) lo=mid; else hi=mid;
    }
    return (lo+hi)/2;
  }
  class Liquid {
    constructor(){this.reset();}
    reset(){
      Object.assign(this,{volume:initialVolume,angle:0,target:0,agitation:0,wave:0,time:0,flow:0,
        pools:[{volume:0,x:160},{volume:0,x:320}],parcels:[]});
    }
    motion(lean, agitation){this.target=clamp(lean,-38,38);this.agitation=clamp(agitation,0,1);}
    step(dt){
      dt=clamp(dt,0,.04);
      this.time+=dt;
      this.angle+=(this.target-this.angle)*(1-Math.exp(-dt*12));
      this.wave+=(this.agitation*18-this.wave)*(1-Math.exp(-dt*6));
      const points=interior(this.angle);
      const side=this.angle<0 ? 0 : 1;
      const rim=points[side];
      const surge=this.wave*(.5+.5*Math.sin(this.time*12));
      const retained=areaBelow(points,rim.y+surge);
      const lost=Math.min(this.volume,Math.max(0,this.volume-retained)*(1-Math.exp(-dt*4.5)));
      this.volume-=lost;
      this.flow=dt ? lost/dt : 0;
      const vx=(side ? 1 : -1)*(26+Math.min(65,this.flow/100));
      const fallTime=(-35+Math.sqrt(35*35+2*620*(ground-rim.y)))/620;
      if(lost>0) this.parcels.push({left:fallTime,volume:lost,side,x:rim.x+vx*fallTime});
      this.parcels=this.parcels.filter(parcel=>{
        parcel.left-=dt;
        if(parcel.left>0) return true;
        const pool=this.pools[parcel.side];
        pool.x=(pool.x*pool.volume+parcel.x*parcel.volume)/(pool.volume+parcel.volume);
        pool.volume+=parcel.volume;
        return false;
      });
      return {points,rim,side,vx,fallTime,level:liquidLevel(points,this.volume)};
    }
  }

  function create(host){
    host.innerHTML=`<svg viewBox="0 0 480 340" aria-hidden="true" class="t4-beer-svg">
      <defs>
        <radialGradient id="t4-light"><stop stop-color="#314f51"/><stop offset="1" stop-color="#11262d"/></radialGradient>
        <linearGradient id="t4-table" x2="0" y2="1"><stop stop-color="#243e40"/><stop offset="1" stop-color="#132c31"/></linearGradient>
        <linearGradient id="t4-amber" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#ffe29a"/><stop offset=".27" stop-color="#fbbb44"/><stop offset=".75" stop-color="#d88617"/><stop offset="1" stop-color="#b65e10"/></linearGradient>
        <linearGradient id="t4-glass"><stop stop-color="#ecfcf9" stop-opacity=".64"/><stop offset=".13" stop-color="#ecfcf9" stop-opacity=".08"/><stop offset=".8" stop-color="#ecfcf9" stop-opacity=".02"/><stop offset="1" stop-color="#ecfcf9" stop-opacity=".38"/></linearGradient>
        <linearGradient id="t4-pool" x2=".2" y2="1"><stop stop-color="#f7cb69" stop-opacity=".9"/><stop offset="1" stop-color="#ab620f" stop-opacity=".72"/></linearGradient>
        <linearGradient id="t4-jet"><stop stop-color="#ffe6a0"/><stop offset=".45" stop-color="#efad35"/><stop offset="1" stop-color="#c68420" stop-opacity=".72"/></linearGradient>
        <clipPath id="t4-liquid-clip"><path data-interior/></clipPath>
        <filter id="t4-soft" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="5"/></filter>
      </defs>
      <rect width="480" height="340" fill="url(#t4-light)"/>
      <circle cx="240" cy="142" r="111" fill="none" stroke="#d4e9df" stroke-opacity=".055"/>
      <circle cx="240" cy="142" r="134" fill="none" stroke="#d4e9df" stroke-opacity=".035"/>
      <path d="M0 272H480V340H0Z" fill="url(#t4-table)"/>
      <path d="M0 272H480" stroke="#a6d4c1" stroke-opacity=".12"/>
      <ellipse cx="243" cy="278" rx="75" ry="10" fill="#07181d" opacity=".7" filter="url(#t4-soft)"/>
      <g data-pools></g>
      <g data-ripples></g>
      <g data-handle>
        <path d="M287 123H305C341 123 341 207 302 207H284" fill="none" stroke="#b8d3ce" stroke-opacity=".4" stroke-width="14"/>
        <path d="M289 121H305C335 121 336 203 303 203H288" fill="none" stroke="#effff7" stroke-opacity=".6" stroke-width="3"/>
      </g>
      <g clip-path="url(#t4-liquid-clip)">
        <path data-liquid fill="url(#t4-amber)"/>
        <g data-bubbles fill="#fff2be" opacity=".48"></g>
        <path data-foam fill="#fff1cd"/>
        <path data-foam-top fill="none" stroke="#fffaf0" stroke-width="2" opacity=".8"/>
      </g>
      <g data-glass>
        <path d="M188 90L196 251Q197 263 210 263H270Q283 263 284 251L292 90" fill="url(#t4-glass)" stroke="#d8eae1" stroke-opacity=".8" stroke-width="2.5"/>
        <path d="M195 104L202 243" stroke="#fff" stroke-width="4" opacity=".58" stroke-linecap="round"/>
        <path d="M207 105L212 240" stroke="#fff" stroke-width="1.3" opacity=".2"/>
        <path d="M284 108L277 247" stroke="#fff" stroke-width="2" opacity=".36"/>
        <path d="M199 253Q239 262 280 253" fill="none" stroke="#eef8ec" stroke-width="6" opacity=".55"/>
        <ellipse cx="240" cy="90" rx="51" ry="5" fill="none" stroke="#e9f4eb" stroke-width="2" opacity=".85"/>
        <path d="M190 91Q240 99 290 91" fill="none" stroke="#fff" stroke-width="1.5" opacity=".7"/>
      </g>
      <path data-stream fill="none" stroke="url(#t4-jet)" stroke-linecap="round"/>
      <path data-stream-shine fill="none" stroke="#fff1bb" stroke-opacity=".7" stroke-linecap="round"/>
      <g data-drops fill="#efba51"></g>
    </svg>`;
    const model=new Liquid();
    const node=name=>host.querySelector(`[data-${name}]`);
    const svgNS='http://www.w3.org/2000/svg';
    const make=(name,parent)=>{const e=document.createElementNS(svgNS,name);parent.appendChild(e);return e;};
    const nodes=Object.fromEntries(['interior','liquid','foam','foam-top','glass','handle','stream','stream-shine','drops','ripples'].map(k=>[k,node(k)]));
    const poolNodes=model.pools.map(()=>{
      const g=make('g',node('pools'));
      const body=make('path',g);
      body.setAttribute('d','M-1 0C-1.12-.42-.71-.8-.32-.7C-.06-1.08 .2-.98 .44-.75C.92-.84 1.14-.28 1 .12C1.12 .64 .55 .96 .15 .76C-.24 1.06-.62 .71-.82 .53C-1.07 .48-1.08 .15-1 0Z');
      body.setAttribute('fill','url(#t4-pool)');
      const shine=make('path',g);
      shine.setAttribute('d','M-.78-.21Q-.48-.64-.12-.53M.33 .48Q.69 .52 .84 .16');
      shine.setAttribute('fill','none');shine.setAttribute('stroke','#ffe7aa');shine.setAttribute('stroke-width','.025');shine.setAttribute('opacity','.55');
      return g;
    });
    const bubbles=Array.from({length:19},(_,i)=>{
      const e=make('circle',node('bubbles'));e.setAttribute('r',.8+(i%4)*.38);return e;
    });
    let raf=0,last=0,active=false,emission=0,streamAge=0;
    let drops=[],ripples=[];
    const reduced=global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function draw(dt){
      const s=model.step(dt);
      const transform=`rotate(${model.angle} 240 264)`;
      nodes.glass.setAttribute('transform',transform);nodes.handle.setAttribute('transform',transform);
      nodes.interior.setAttribute('d',`M${s.points.map(p=>`${p.x},${p.y}`).join('L')}Z`);
      const wave=reduced ? 0 : Math.sin(model.time*9)*model.wave*.22;
      const surface=`M80 ${s.level}Q190 ${s.level+wave} 240 ${s.level}T400 ${s.level}`;
      nodes.liquid.setAttribute('d',`${surface}V300H80Z`);
      nodes.foam.setAttribute('d',`${surface}L400 ${s.level+10}Q290 ${s.level+13-wave} 240 ${s.level+11}T80 ${s.level+10}Z`);
      nodes['foam-top'].setAttribute('d',surface);
      bubbles.forEach((e,i)=>{
        const y=252-((i*19+(reduced?0:model.time*11))%159);
        e.setAttribute('cx',201+((i*23)%78));
        e.setAttribute('cy',y);
        e.setAttribute('opacity',y>s.level+13?'1':'0');
      });
      poolNodes.forEach((e,i)=>{
        const pool=model.pools[i],r=Math.sqrt(pool.volume/initialVolume);
        e.setAttribute('transform',`translate(${pool.x} ${ground+2}) scale(${r*148} ${r*31})`);
        e.setAttribute('opacity',pool.volume>0?'1':'0');
      });
      const flowing=model.flow>8;
      streamAge=flowing ? streamAge+dt : 0;
      const duration=Math.min(s.fallTime,streamAge);
      const endX=s.rim.x+s.vx*duration,endY=s.rim.y+35*duration+310*duration*duration;
      const path=`M${s.rim.x} ${s.rim.y}Q${s.rim.x+s.vx*duration/2} ${s.rim.y+35*duration/2} ${endX} ${endY}`;
      const width=clamp(model.flow/650,1.6,7);
      [nodes.stream,nodes['stream-shine']].forEach(e=>{e.setAttribute('d',path);e.setAttribute('opacity',flowing?'1':'0');});
      nodes.stream.setAttribute('stroke-width',width);
      nodes['stream-shine'].setAttribute('stroke-width',width*.24);
      emission+=flowing ? dt*40 : 0;
      while(emission>=1){
        emission-=1;
        if(drops.length>=48) break;
        const e=make('ellipse',nodes.drops);
        const phase=model.time*41;
        drops.push({e,x:s.rim.x,y:s.rim.y,vx:s.vx+Math.sin(phase)*12,vy:35,r:width*.22+1.2});
      }
      drops=drops.filter(p=>{
        p.vy+=620*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(p.y>=ground){
          p.e.remove();
          if(!reduced && ripples.length<14){
            const e=make('ellipse',nodes.ripples);
            e.setAttribute('cx',p.x);e.setAttribute('cy',ground+1);e.setAttribute('fill','none');
            e.setAttribute('stroke','#ffe8ac');e.setAttribute('stroke-width','1');
            ripples.push({e,age:0});
          }
          return false;
        }
        p.e.setAttribute('cx',p.x);p.e.setAttribute('cy',p.y);
        p.e.setAttribute('rx',p.r*.75);p.e.setAttribute('ry',p.r+Math.min(2,p.vy/200));
        return true;
      });
      ripples=ripples.filter(p=>{
        p.age+=dt;if(p.age>.5){p.e.remove();return false;}
        p.e.setAttribute('rx',3+p.age*29);p.e.setAttribute('ry',1+p.age*7);
        p.e.setAttribute('opacity',(.5-p.age)*.8);return true;
      });
    }
    function frame(now){
      draw(last ? Math.min(.04,(now-last)/1000) : 0);last=now;
      if(active) raf=global.requestAnimationFrame(frame);
    }
    draw(0);
    return {
      motion:(lean,agitation)=>model.motion(lean,agitation),
      start(){if(active)return;active=true;last=0;raf=global.requestAnimationFrame(frame);},
      stop(){active=false;global.cancelAnimationFrame(raf);last=0;},
      reset(){model.reset();drops.forEach(p=>p.e.remove());ripples.forEach(p=>p.e.remove());drops=[];ripples=[];emission=0;streamAge=0;last=0;draw(0);},
    };
  }
  if(typeof module!=='undefined' && module.exports) module.exports={Liquid,interior,areaBelow,liquidLevel,initialVolume};
  else global.jsdBeer={create};
})(typeof window!=='undefined' ? window : globalThis);
