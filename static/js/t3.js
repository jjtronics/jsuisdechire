(function(){
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const wrap=document.createElement("div"); wrap.style.cssText="position:relative;height:180px;border:1px solid rgba(0,0,0,.1);border-radius:12px;overflow:hidden;"; document.getElementById("t3").append(wrap);
  const target=document.createElement("div"); target.style.cssText="position:absolute;width:40px;height:40px;border-radius:50%;border:2px solid #10b981;background:#ecfdf5;"; wrap.append(target);
  const btn=document.createElement("button"); btn.className="px-3 py-2 rounded-lg border"; btn.textContent="Démarrer"; document.getElementById("t3").append(btn);

  async function fetchSettings(){ try{ const r=await fetch('/api/settings',{cache:'no-store'}); return await r.json(); }catch(e){ return {}; } }
  function defs(s){ return { timeSpeed: parseFloat(s.prs_timeSpeed)||0.75, duration: parseInt(s.prs_duration_ms)||10000, jitterAmp: parseFloat(s.prs_jitterAmp)||0.05, captureRadius: parseFloat(s.prs_captureRadius)||36 }; }

  const rand=(a,b)=>a+Math.random()*(b-a);
  const baseA=rand(0.003,0.005), baseB=rand(0.0035,0.0055), driftA=rand(0.00008,0.00018), driftB=rand(0.00008,0.00018), phase0=rand(0,Math.PI*2);
  let cursor={x:0,y:0}, targetPos={x:0,y:0}, raf=0, running=false, finished=false, P=null, start=0, samples=[];
  wrap.addEventListener('pointermove',(e)=>{const r=wrap.getBoundingClientRect();cursor.x=clamp(e.clientX-r.left,0,r.width);cursor.y=clamp(e.clientY-r.top,0,r.height);});

  function anim(now){ if(finished) return; const elapsed=(now-start); const t=elapsed*P.timeSpeed; const rect=wrap.getBoundingClientRect(); const W=rect.width, H=rect.height;
    const a=baseA+driftA*(elapsed/1000); const b=baseB+driftB*(elapsed/1000);
    const cx=W/2,cy=H/2,ax=W*0.44,ay=H*0.38;
    const jitter=P.jitterAmp*(Math.sin(t/500*0.9)*0.5+Math.sin(t/500*0.27+1.3)*0.3+Math.sin(t/500*0.61+2.1)*0.2);
    const x=cx+ax*Math.sin(a*t*2*Math.PI+phase0)+jitter*24; const y=cy+ay*Math.sin(b*t*2*Math.PI+Math.PI/3)+jitter*16;
    target.style.left=(x-20)+'px'; target.style.top=(y-20)+'px'; targetPos={x,y};
    const d=Math.hypot(x-cursor.x,y-cursor.y); if(samples.length%2===0) samples.push(d);
    if(elapsed>=P.duration){ finish(); return; } raf=requestAnimationFrame(anim);
  }
  function finish(){ running=false; cancelAnimationFrame(raf); btn.disabled=true; btn.textContent="Terminé ✔";
    if(samples.length>5){ const mean=samples.reduce((a,b)=>a+b,0)/samples.length; const score=100-Math.min(100,Math.round((mean/140)*100)); window.__run={prs:{mean_error_px:mean,score}}; }
    const next=document.getElementById('next'); if(next){ next.disabled=false; next.onclick=()=>location.href='/t4'; }
  }
  function tryCapture(e){ if(!running||finished)return; const r=wrap.getBoundingClientRect(); const px=e.clientX-r.left,py=e.clientY-r.top; const d=Math.hypot(targetPos.x-px,targetPos.y-py); if(d<=P.captureRadius){ finish(); } }

  btn.addEventListener('click',async()=>{ if(running)return; const s=await fetchSettings(); P=defs(s); samples=[];running=true;btn.disabled=true;btn.textContent="En cours…";start=performance.now();raf=requestAnimationFrame(anim); });
  wrap.addEventListener('pointerdown',tryCapture);
})();