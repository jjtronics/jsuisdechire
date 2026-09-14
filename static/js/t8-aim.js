(function(){
  const root=document.getElementById('t8');
  if(!root)return;
  const stage=root.querySelector('.t8-stage');
  const ball=stage&&stage.querySelector('.t8-ball');
  if(!stage||!ball)return;
  const t=window.i18n||((key)=>key);
  const text=(key,fallback)=>{const value=typeof t==='function'?t(key):key;return value===key?fallback:value;};

  const style=document.createElement('style');
  style.textContent=`
    #t8 .t8-stage{cursor:default}
    #t8 .t8-shoot-zone{position:absolute;z-index:2;left:8%;right:8%;bottom:0;height:6.8rem;border-top:1px dashed rgba(254,240,138,.34);background:linear-gradient(180deg,transparent,rgba(2,44,34,.34));pointer-events:none}
    #t8 .t8-launch-pad{position:absolute;z-index:4;left:50%;top:calc(100% - 5.2rem);width:5rem;height:5rem;border:2px dashed rgba(254,240,138,.78);border-radius:50%;background:rgba(254,240,138,.08);box-shadow:0 0 0 .45rem rgba(254,240,138,.07),inset 0 0 1.2rem rgba(254,240,138,.08);transform:translate(-50%,-50%);pointer-events:none;transition:border-color .12s ease,background .12s ease,box-shadow .12s ease}
    #t8 .t8-launch-pad::before{content:'';position:absolute;inset:11px;border:1px solid rgba(255,255,255,.42);border-radius:50%}
    #t8 .t8-launch-pad.is-active{border-color:#fff;background:rgba(254,240,138,.16);box-shadow:0 0 0 .55rem rgba(254,240,138,.13),0 0 1.5rem rgba(254,240,138,.38),inset 0 0 1.2rem rgba(254,240,138,.12)}
    #t8 .t8-launch-label{position:absolute;z-index:6;left:50%;top:calc(100% - 2.08rem);color:rgba(254,240,138,.82);font-size:.52rem;font-weight:950;letter-spacing:.16em;line-height:1;pointer-events:none;transform:translate(-50%,-50%);white-space:nowrap}
    #t8 .t8-aim-reticle{position:absolute;z-index:7;width:2.35rem;height:2.35rem;border:2px solid rgba(255,255,255,.94);border-radius:50%;box-shadow:0 0 0 .25rem rgba(253,230,138,.2),0 0 1rem rgba(253,230,138,.58);opacity:0;pointer-events:none;transform:translate(-50%,-50%) scale(.72);transition:opacity .1s ease,transform .1s ease}
    #t8 .t8-aim-reticle::before{content:'';position:absolute;left:50%;top:50%;width:.3rem;height:.3rem;border-radius:50%;background:#fff;transform:translate(-50%,-50%)}
    #t8 .t8-aim-reticle::after{content:'';position:absolute;inset:-.55rem;border:1px solid rgba(253,230,138,.42);border-radius:50%}
    #t8 .t8-aim-reticle.is-visible{opacity:1;transform:translate(-50%,-50%) scale(1)}
    #t8 .t8-ball.is-armed{box-shadow:0 0 0 .45rem rgba(253,230,138,.26),0 0 1.2rem rgba(253,230,138,.74),0 8px 18px rgba(0,0,0,.4)}
    @media(max-width:520px){#t8 .t8-launch-pad{top:calc(100% - 4.7rem);width:4.6rem;height:4.6rem}#t8 .t8-launch-label{top:calc(100% - 1.78rem)}}
  `;
  document.head.appendChild(style);

  const shootZone=document.createElement('div');shootZone.className='t8-shoot-zone';
  const launchPad=document.createElement('div');launchPad.className='t8-launch-pad';
  const launchLabel=document.createElement('div');launchLabel.className='t8-launch-label';launchLabel.textContent=text('t8.launch_point','TIRE ICI');
  const reticle=document.createElement('div');reticle.className='t8-aim-reticle';
  stage.append(shootZone,launchPad,launchLabel,reticle);

  const instruction=root.querySelector('.t8-instruction');
  const setInstruction=(value)=>{if(instruction)instruction.textContent=value;};
  const point=(event)=>{const rect=stage.getBoundingClientRect();return{x:event.clientX-rect.left-stage.clientLeft,y:event.clientY-rect.top-stage.clientTop};};
  const anchor=()=>{const ballRect=ball.getBoundingClientRect();const stageRect=stage.getBoundingClientRect();return{x:ballRect.left+ballRect.width/2-stageRect.left-stage.clientLeft,y:ballRect.top+ballRect.height/2-stageRect.top-stage.clientTop};};
  const placeReticle=(event)=>{const p=point(event);reticle.style.left=`${p.x}px`;reticle.style.top=`${p.y}px`;reticle.classList.add('is-visible');};
  const hideReticle=()=>{reticle.classList.remove('is-visible');launchPad.classList.remove('is-active');};
  const launchTop='calc(100% - 5.2rem)';
  const launchTopMobile='calc(100% - 4.7rem)';
  const repositionLaunch=()=>{const mobile=window.innerWidth<=520;const top=mobile?launchTopMobile:launchTop;const guideTop=mobile?'calc(100% - 4.7rem - 1.5px)':'calc(100% - 5.2rem - 1.5px)';ball.style.left='50%';ball.style.top=top;launchPad.style.top=top;launchLabel.style.top=mobile?'calc(100% - 1.78rem)':'calc(100% - 2.08rem)';if(!aiming){const guide=stage.querySelector('.t8-guide');if(guide){guide.style.left='50%';guide.style.top=guideTop;}}};
  let aiming=false,forwarding=false,gestureAnchor=null,lastBallStyle='',stableTicks=0;
  stage.addEventListener('pointerdown',(event)=>{
    const p=point(event);const a=anchor();
    if(Math.hypot(p.x-a.x,p.y-a.y)>30){
      event.preventDefault();event.stopImmediatePropagation();
      setInstruction(text('t8.launch_hint','Appuie sur le cercle de départ pour lancer la visée.'));
      return;
    }
    aiming=true;gestureAnchor={x:event.clientX,y:event.clientY};launchPad.classList.add('is-active');ball.classList.add('is-armed');placeReticle(event);
  },true);
  stage.addEventListener('pointermove',(event)=>{
    if(!aiming||forwarding)return;
    event.preventDefault();event.stopImmediatePropagation();placeReticle(event);
    if(!gestureAnchor)return;
    // The player pulls backward like a slingshot. Mirror and soften the
    // pointer for the original physics engine so the ball launches forward
    // with a less aggressive maximum force.
    const strength=.72;
    const mirroredX=gestureAnchor.x-(event.clientX-gestureAnchor.x)*strength;
    const mirroredY=gestureAnchor.y-(event.clientY-gestureAnchor.y)*strength;
    forwarding=true;
    stage.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,clientX:mirroredX,clientY:mirroredY,pointerId:event.pointerId,pointerType:event.pointerType||'mouse',buttons:event.buttons}));
    forwarding=false;
  },true);
  ['pointerup','pointercancel','lostpointercapture'].forEach((name)=>stage.addEventListener(name,()=>{if(!aiming)return;aiming=false;window.setTimeout(hideReticle,110);},true));
  window.addEventListener('resize',repositionLaunch);
  repositionLaunch();
  window.setInterval(()=>{
    if(aiming)return;
    const styleKey=`${ball.style.left}|${ball.style.top}`;
    if(styleKey===lastBallStyle)stableTicks+=1;else{stableTicks=0;lastBallStyle=styleKey;}
    const stageRect=stage.getBoundingClientRect();const ballRect=ball.getBoundingClientRect();
    const outside=ballRect.bottom<stageRect.top-20||ballRect.top>stageRect.bottom+20||ballRect.right<stageRect.left-40||ballRect.left>stageRect.right+40;
    if(outside&&stableTicks>=1){repositionLaunch();stableTicks=0;}
    else if(stableTicks>=3&&Math.abs(ballRect.top-(stageRect.top+stageRect.height-(window.innerWidth<=520?4.7:5.2)*16))>18){repositionLaunch();stableTicks=0;}
  },150);
})();
