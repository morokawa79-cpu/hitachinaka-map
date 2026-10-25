// ビーイング売却実績マップ：公開用ページを作る（Codexの public.html から）
// 設定 ------------------------------------------------------------
const CFG={
  MIN_PRICE:0,            // これ未満（万円）の実績は公開しない（0＝すべて公開）
  LOW_PRICE:300,          // これ以下（万円）は「300万円以下」とまとめて表示
  SMALL_TOWN:2,           // この件数以下の町は、場所をさらに粗くする
  SMALL_LAT:0.04, SMALL_LON:0.05,  // 粗くするときの単位（約4km）
  pstep:n=>n<1000?50:n<3000?100:n<10000?500:1000,  // 価格の幅（万円）
  astep:n=>n<100?10:n<1000?50:n<3000?100:500,      // 面積の幅（㎡）
};
// ----------------------------------------------------------------
const fs=require('fs');const [src,out,extra]=process.argv.slice(2).filter(a=>!a.startsWith('--')).slice(-3);let h=fs.readFileSync(src,'utf8');
const rng=(n,st)=>{const s=st(n-0.001);const hi=Math.ceil(n/s)*s;return [Math.max(0,hi-s),hi]};
const f=x=>x.toLocaleString('ja-JP');
const pTxt=n=>{if(n<=CFG.LOW_PRICE)return `${f(CFG.LOW_PRICE)}万円以下`;const [a,b]=rng(n,CFG.pstep);return `${f(a)}〜${f(b)}万円`};
const aTxt=n=>{const [a,b]=rng(n,CFG.astep);return `${f(a)}〜${f(b)}㎡`};
const c={};const rnd=(v,s)=>v==null?v:+(Math.round(v/s)*s).toFixed(3);const cnt=(k,n=1)=>c[k]=(c[k]||0)+n;
// 1) データ
const m=h.match(/(<script id="initial-data" type="application\/json">)([\s\S]*?)(<\/script>)/);
let recs=JSON.parse(m[2]);
if(extra){const add=JSON.parse(fs.readFileSync(extra,'utf8')).map(({memo,...r})=>({...r,latitude:rnd(r.latitude,0.02),longitude:rnd(r.longitude,0.025)}));const ids=new Set(recs.map(r=>r.id));recs=recs.concat(add.filter(r=>!ids.has(r.id)));recs.sort((a,b)=>b.contract_month.localeCompare(a.contract_month));c.added=add.length}const excluded=recs.filter(r=>r.approx_price_man_yen<CFG.MIN_PRICE).map(r=>r.id);
recs=recs.filter(r=>!excluded.includes(r.id));
const townCount={};recs.forEach(r=>townCount[r.address]=(townCount[r.address]||0)+1);
for(const r of recs){
  if(townCount[r.address]<=CFG.SMALL_TOWN&&r.latitude!=null){r.latitude=rnd(r.latitude,CFG.SMALL_LAT);r.longitude=rnd(r.longitude,CFG.SMALL_LON);cnt('blurred')}
  r.approx_price_man_yen=r.approx_price_man_yen<=CFG.LOW_PRICE?CFG.LOW_PRICE:(([a,b])=>(a+b)/2)(rng(r.approx_price_man_yen,CFG.pstep));
  for(const k of ['land_area_m2','building_area_m2','occupied_area_m2'])if(r[k]!=null){r[k]=(([a,b])=>(a+b)/2)(rng(r[k],CFG.astep));cnt('area')}
}
h=h.replace(m[0],m[1]+JSON.stringify(recs).replace(/</g,'\u003c')+m[3]);
c.records=recs.length;c.excluded=excluded.join(',');
// 2) 静的な記事・構造化データ（このページは noindex。検索用はブログ記事）
for(const id of excluded){const st=h.indexOf(`<article class="record-card" id="record-${id}"`);if(st>=0){const en=h.indexOf("</article>",st)+"</article>".length;h=h.slice(0,st)+h.slice(en);cnt("rmArticle")}}
h=h.replace(/<script id="structured-data" type="application\/ld\+json">[\s\S]*?<\/script>/,()=>{cnt('rmLD');return ''});
// 3) 地図・表示
h=h.replace(/tileLayer\('https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png',\{attribution:'[^']*'/,()=>{cnt('tile');return "tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png',{attribution:'<a href=\"https://maps.gsi.go.jp/development/ichiran.html\" target=\"_blank\" rel=\"noopener noreferrer\">国土地理院</a>'"});
h=h.replace('if(points.length)map.fitBounds(L.latLngBounds(points).pad(.14),{maxZoom:11,animate:false});',()=>{cnt('fit');return "if(points.length){const core=points.filter(p=>Math.abs(p[0]-36.39)<0.13&&Math.abs(p[1]-140.52)<0.16);const use=core.length>=points.length*0.6?core:points;map.fitBounds(L.latLngBounds(use).pad(.12),{maxZoom:11,animate:false})}"});
h=h.replace('<meta name="robots" content="index,follow">',()=>{cnt('robots');return '<meta name="robots" content="noindex,follow">'});
// 4) 価格・面積の幅
h=h.replace(/約 <strong>([0-9,]+)<\/strong> 万円/g,(x,n)=>{cnt('sprice');return `<strong>${pTxt(+n.replace(/,/g,''))}</strong>`});
h=h.replace(/<span>(土地|建物|専有) ([0-9,.]+)㎡(（約[0-9,.]+坪）)?<\/span>/g,(x,l,n)=>{cnt('sarea');return `<span>${l} ${aTxt(+n.replace(/,/g,''))}</span>`});
const js=`const rangeOf=(n,st)=>{n=+n;const s=st(n-0.001);const hi=Math.ceil(n/s)*s;return [Math.max(0,hi-s),hi]};const pStep=${CFG.pstep.toString()};const aStep=${CFG.astep.toString()};const fmtJ=x=>x.toLocaleString('ja-JP');const priceBand=n=>{if(+n<=${CFG.LOW_PRICE})return fmtJ(${CFG.LOW_PRICE})+'万円以下';const [a,b]=rangeOf(n,pStep);return fmtJ(a)+'〜'+fmtJ(b)+'万円'};const areaBand=n=>{const [a,b]=rangeOf(n,aStep);return fmtJ(a)+'〜'+fmtJ(b)+'㎡'};`;
h=h.replace("const priceText=r=>'約'+number(r.approx_price_man_yen)+'万円';",()=>{cnt('jsprice');return js+"const priceText=r=>priceBand(r.approx_price_man_yen);"});
h=h.replace("約 <strong>${number(r.approx_price_man_yen)}</strong> 万円",()=>{cnt('jscard');return "<strong>${priceBand(r.approx_price_man_yen)}</strong>"});
h=h.replace("${label} ${number(r[field])}㎡${withTsubo?'（約'+number(Math.round(r[field]/3.305785*10)/10)+'坪）':''}",()=>{cnt('jsarea');return "${label} ${areaBand(r[field])}"});
h=h.replace('価格・面積は概算を含みます。地図は約2km単位にぼかした周辺地域を示しています。',()=>{cnt('note');return '価格・面積は幅で表示しています（例：500〜550万円、500〜550㎡。300万円以下はまとめて表示）。地図は約2km単位（実績の少ない町は約4km単位）にぼかした周辺地域を示しています。'});
fs.writeFileSync(out,h);console.log(JSON.stringify(c));
