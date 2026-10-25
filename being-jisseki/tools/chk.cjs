const fs=require('fs');const [html,csv,extra]=process.argv.slice(-3);const h=fs.readFileSync(html,'utf8');
const recs=JSON.parse(h.match(/<script id="initial-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const rangeOf=(n,st)=>{n=+n;const s=st(n-0.001);const hi=Math.ceil(n/s)*s;return [Math.max(0,hi-s),hi]};const pStep=n=>n<1000?50:n<3000?100:n<10000?500:1000;const aStep=n=>n<100?10:n<1000?50:n<3000?100:500;
const exact={};for(const f of [csv,extra]){const L=fs.readFileSync(f,'utf8').replace(/^\uFEFF/,'').trim().split(/\r?\n/);const hd=L[0].split(',');L.slice(1).forEach(l=>{const c=l.split(',');const o={};hd.forEach((k,i)=>o[k]=c[i]);exact[o.id]=o})}
let bad=0;for(const r of recs){const e=exact[r.id];const ep=+e.approx_price_man_yen;const disp=r.approx_price_man_yen;if(ep>300){const [a,b]=rangeOf(disp,pStep);if(!(ep>a&&ep<=b)){bad++;console.log('price',r.id,ep,a,b)}}for(const k of ['land_area_m2','building_area_m2']){if(r[k]!=null){const ea=+e[k];const [a,b]=rangeOf(r[k],aStep);if(!(ea>a&&ea<=b)){bad++;console.log('area',r.id,k,ea,a,b)}}}}
console.log('records',recs.length,'bad',bad);
