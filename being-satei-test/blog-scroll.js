// Runs in the host blog; accept positioning messages only from our own iframe.
(()=>{
  const frame=document.querySelector('#being-satei-embed iframe');
  if(!frame||frame.dataset.scrollBridge)return;
  frame.dataset.scrollBridge='ready';
  window.addEventListener('message',event=>{
    if(event.origin!=='https://morokawa79-cpu.github.io'||event.source!==frame.contentWindow)return;
    const data=event.data;
    if(data?.type!=='being-satei:result'||!Number.isFinite(data.top)||data.top<0||data.top>10000)return;
    const rect=frame.getBoundingClientRect(),scale=rect.height/frame.offsetHeight;
    const header=document.querySelector('#js-header'),headerRect=header?.getBoundingClientRect();
    const headerSpace=headerRect&&headerRect.top<=1?Math.max(0,headerRect.bottom):0;
    window.scrollTo({top:Math.max(0,window.scrollY+rect.top+data.top*scale-headerSpace-20),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
})();
