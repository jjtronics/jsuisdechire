(function(){
  const G=9.80665, box=document.getElementById("t4");
  const info=document.createElement("div"); box.append(info);
  const btn=document.createElement("button"); btn.textContent="Démarrer 8s"; btn.className="px-3 py-2 rounded-lg border"; box.append(btn);
  const dbg=document.createElement("pre"); box.append(dbg);

  async function fetchSettings(){try{const r=await fetch('/api/settings',{cache:'no-store'});return await r.json();}catch(e){return {};}} 
  function norm(v,d){if(v==null)return d;const n=parseFloat(String(v).replace(',','.'));return isNaN(n)?d:n;}
  function defs(s){return{mode:s.bal_mode||'lin',duration:norm(s.bal_duration_ms,8000),low_good:norm(s.bal_low_good,0.02),high_bad:norm(s.bal_high_bad,0.25)};}
  let ST=defs({}),values=[],events=0,started=false,finished=false;

  let gEst={x:0,y:0,z:0},gInit=false,alpha=0.98;
  function push(v){if(!finished){values.push(v);events++;}}
  function onDev(e){let m=null;if(ST.mode==='lin'){const acc=e.acceleration,accIG=e.accelerationIncludingGravity;if(acc&&acc.x!=null){m=Math.hypot(acc.x||0,acc.y||0,acc.z||0)/G;}else if(accIG){if(!gInit){gEst={x:accIG.x,y:accIG.y,z:accIG.z};gInit=true;}else{gEst={x:alpha*gEst.x+(1-alpha)*accIG.x,y:alpha*gEst.y+(1-alpha)*accIG.y,z:alpha*gEst.z+(1-alpha)*accIG.z};}const lin={x:accIG.x-gEst.x,y:accIG.y-gEst.y,z:accIG.z-gEst.z};m=Math.hypot(lin.x,lin.y,lin.z)/G;}}else{const a=e.accelerationIncludingGravity||{x:0,y:0,z:0};m=Math.hypot(a.x,a.y,a.z)/G;}if(m!=null)push(m);}

  function detach(){window.removeEventListener('devicemotion',onDev);}
  function compute(){detach();if(values.length<10){dbg.textContent+="\\nPas assez de données";return;}const mean=values.reduce((a,b)=>a+b,0)/values.length;const variance=values.reduce((a,b)=>a+Math.pow(b-mean,2),0)/values.length;const std=Math.sqrt(variance);
    let s;if(std<=ST.low_good)s=100;else if(std>=ST.high_bad)s=0;else s=(ST.high_bad-std)/(ST.high_bad-ST.low_good)*100;s=Math.round(Math.max(0,Math.min(100,s)));
    dbg.textContent=`Mode:${ST.mode}\\nSeuil100:${ST.low_good}\\nSeuil0:${ST.high_bad}\\nstd_g=${std.toFixed(3)} -> score=${s}`;window.__run={bal:{std_g:std,score:s}};
    const next=document.getElementById('next');if(next){next.disabled=false;next.onclick=()=>location.href='/results';}}
  btn.onclick=async()=>{if(started)return;started=true;ST=defs(await fetchSettings());info.textContent=`Mode:${ST.mode} ·100@${ST.low_good}g ·0@${ST.high_bad}g`;window.addEventListener('devicemotion',onDev,{passive:true});setTimeout(compute,ST.duration);};
})();