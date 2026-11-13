// Single-buffer StarryNight renderer. No full-screen bloom buffers or per-star objects.
(() => {
 'use strict';
 globalThis.OverdriveStarryNight={create(canvas){
  const root=document.documentElement,ctx=canvas.getContext('2d',{alpha:true});
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=false,raf=0,last=0,elapsed=0,next=2,width=1,height=1,dpr=1,stars=new Float32Array(0),meteors=[],moons=[];
  let drawnAt=0;
  let frames=0,builds=0,signature='',suspended=false;
  const rand=(a,b)=>a+Math.random()*(b-a),p=()=>globalThis.OverdrivePreferences||{};
  const quality=()=>root.dataset.quality||'medium';
  const profile=()=>({low:[.75,15,.65],medium:[1,24,.85],max:[1.5,40,1]})[quality()];
  const active=()=>root.dataset.mode==='astra'&&!document.hidden;
  const setting=(key,fallback)=>p()[key]??fallback;
  // One shared white glow sprite, drawn scaled for every star (no per-star objects).
  let glow=null;
  function glowSprite(){
   if(glow)return glow;
   glow=document.createElement('canvas');glow.width=glow.height=64;
   const g=glow.getContext('2d'),grad=g.createRadialGradient(32,32,0,32,32,32);
   grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.12,'rgba(255,255,255,.85)');grad.addColorStop(.35,'rgba(200,220,255,.25)');grad.addColorStop(1,'rgba(200,220,255,0)');
   g.fillStyle=grad;g.fillRect(0,0,64,64);
   return glow;
  }
  function build(force=false){
   const [cap,,density]=profile(); const w=innerWidth,h=innerHeight,ratio=Math.min(devicePixelRatio||1,cap);
   const key=[w,h,ratio,density,setting('density',100)].join('|');
   if(!force&&key===signature&&!suspended)return;
   signature=key;suspended=false;width=w;height=h;dpr=ratio;
   canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
   const count=Math.min(800,Math.max(30,Math.round(w*h/4000*density*setting('density',100)/100)));
   if(stars.length!==count*6)stars=new Float32Array(count*6);
   for(let i=0;i<stars.length;i+=6){stars[i]=Math.random()*w;stars[i+1]=Math.random()*h;stars[i+2]=Math.random()<.5?.55:1;stars[i+3]=rand(.5,1);stars[i+4]=rand(0,Math.PI*2);stars[i+5]=Math.random()<.2?1:0;}
   builds++;
  }
  function spawnMeteor(x=rand(width*.15,width*1.15),y=-15){
   if(paused||reduce.matches||!active())return;
   const speed=setting('meteorSpeed',100)/100;
   if(meteors.length===4)meteors.shift();
   meteors.push({x,y,age:0,life:rand(2.4,4)/speed,speed:rand(280,420)*speed,length:rand(150,280)*setting('trail',100)/100});sync();
  }
  function draw(){
   if(!active()||suspended)return;
   frames++;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
   const opacity=setting('skyOpacity',100)/100*(root.classList.contains('has-backdrop')?.55:1);
   const brightness=setting('brightness',80)/100,twinkle=setting('twinkle',true);
   ctx.fillStyle='#ffffff';
   const glow=glowSprite(),lowQ=quality()==='low';
   for(let i=0;i<stars.length;i+=6){
    // Every star twinkles at its own speed; bloom swells with the twinkle, and the brighter stars get a wider halo.
    const tw=twinkle?.5+.5*Math.sin(elapsed*(1+(i%7)*.13)+stars[i+4]):1,base=opacity*brightness*stars[i+3];
    const x=stars[i],y=stars[i+1],r=stars[i+2],big=stars[i+5];
    if(!lowQ||big){
     const halo=(big?18:9)*(.8+.4*tw)*r;
     ctx.globalAlpha=base*(.3+.7*tw*tw)*(big?.7:.45);
     ctx.drawImage(glow,x-halo/2,y-halo/2,halo,halo);
    }
    ctx.globalAlpha=base*(.45+.55*tw);
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
   }
   ctx.globalAlpha=opacity;
   for(const m of meteors){
    const fade=Math.min(1,m.age*3,(m.life-m.age)*2);
    const tail=ctx.createLinearGradient(m.x,m.y,m.x+m.length,m.y-m.length);
    tail.addColorStop(0,`rgba(255,255,255,${fade})`);tail.addColorStop(1,'#ffffff00');
    ctx.strokeStyle=tail;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(m.x+m.length,m.y-m.length);ctx.stroke();
    ctx.shadowColor='white';ctx.shadowBlur=quality()==='low'?4:12;ctx.fillStyle=`rgba(255,255,255,${fade})`;ctx.beginPath();ctx.arc(m.x,m.y,1.7,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
   }
   for(const m of moons){const g=ctx.createRadialGradient(m.x-8,m.y-9,1,m.x,m.y,23);g.addColorStop(0,'#f5f0dc');g.addColorStop(.7,'#a3adbd');g.addColorStop(1,'#26374a');ctx.fillStyle=g;ctx.beginPath();ctx.arc(m.x,m.y,23,0,Math.PI*2);ctx.fill();}
   ctx.globalAlpha=1;
  }
  const animated=()=>setting('twinkle',true)||setting('meteors',true)||meteors.length||moons.length;
  function frame(time){
   raf=0;if(!active()||paused||reduce.matches)return;
   raf=requestAnimationFrame(frame);const interval=1000/profile()[1];if(time-last<interval)return;
   const dt=drawnAt?Math.min(.2,(time-drawnAt)/1000):0;drawnAt=time;last=time-((time-last)%interval);elapsed+=dt;next-=dt;
   if(next<=0){if(setting('meteors',true))spawnMeteor();next=setting('meteorInterval',5)*rand(.8,1.2);}
   for(let i=meteors.length-1;i>=0;i--){const m=meteors[i];m.age+=dt;m.x-=m.speed*dt;m.y+=m.speed*dt;if(m.age>=m.life)meteors.splice(i,1);}
   for(let i=moons.length-1;i>=0;i--){moons[i].x+=dt*12;if(moons[i].x>width+30)moons.splice(i,1);}
   draw();if(!animated()){cancelAnimationFrame(raf);raf=0;}
  }
  function sync(){
   if(!active()) {cancelAnimationFrame(raf);raf=0;last=0;if(!suspended){canvas.width=canvas.height=1;suspended=true;meteors.length=0;moons.length=0;}return;}
   build();draw();
   if(paused||reduce.matches||!animated()){cancelAnimationFrame(raf);raf=0;last=0;}
   else if(!raf){last=0;drawnAt=0;raf=requestAnimationFrame(frame);}
  }
  let timer;addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(sync,150);},{passive:true});
  document.addEventListener('visibilitychange',sync);document.addEventListener('od-mode-change',sync);
  document.addEventListener('od-preferences-change',()=>{next=Math.min(next,setting('meteorInterval',5));sync();});
  document.addEventListener('od-quality-change',sync);reduce.addEventListener('change',sync);
  sync();
  return {get paused(){return paused||reduce.matches;},get stats(){return {frames,builds,stars:stars.length/6,meteors:meteors.length,moons:moons.length,quality:quality(),bufferBytes:canvas.width*canvas.height*4,starBytes:stars.byteLength,running:!!raf};},
   toggle(){paused=!paused;root.classList.toggle('starry-paused',paused);sync();return paused;},refresh:sync,spawnMeteor,
   spawnMoon(x,y){if(!paused&&!reduce.matches&&active()){if(moons.length===2)moons.shift();moons.push({x,y});sync();}}
  };
 }};
})();
