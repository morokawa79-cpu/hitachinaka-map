const fs=require('fs');const [csvPath,out,extraCsv]=process.argv.slice(2).filter(a=>!a.startsWith('--')).slice(-3);
let lines=fs.readFileSync(csvPath,"utf8").replace(/^\uFEFF/,'').trim().split(/\r?\n/);const head=lines[0].split(',');
if(extraCsv){const ex=fs.readFileSync(extraCsv,"utf8").replace(/^\uFEFF/,"").trim().split(/\r?\n/);const eh=ex[0].split(",");const idx=head.map(h=>eh.indexOf(h));lines=lines.concat(ex.slice(1).map(l=>{const c=l.split(",");return idx.map(i=>i<0?"":c[i]).join(",")}))}
const rows=lines.slice(1).map(l=>{const c=l.split(',');const o={};head.forEach((h,i)=>o[h]=c[i]);return o});
const MIN_PRICE=0; // これ未満（万円）は公開しない（0＝すべて公開）
const LOW_PRICE=300; // これ以下は「300万円以下」
const B="https://www.beingfudousan.com/blog/";
const town={'中根':871468,'高場':871720,'田彦':871722,'市毛':872364,'東石川':872365,'武田':872994,'馬渡':872998,'阿字ケ浦町':873386,'阿字ヶ浦町':873386,'足崎':873387,'東大島':873897};
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
const addr=a=>a.replace(/^茨城県/,'');
const cityOf=a=>{const m=addr(a).match(/^(.+?[市町村])/);const x=addr(a);if(/^東茨城郡/.test(x))return x.match(/^東茨城郡.+?町/)[0];return m?m[1]:x};
const townOf=a=>addr(a).replace(/^(東茨城郡)?.+?[市町村]/,'').replace(/[0-9０-９一二三四五六七八九十]+丁目.*$/,'');
const rng=(n,st)=>{const s=st(n-0.001);const hi=Math.ceil(n/s)*s;return [Math.max(0,hi-s),hi]};const pstep=n=>n<1000?50:n<3000?100:n<10000?500:1000;const astep=n=>n<100?10:n<1000?50:n<3000?100:500;const fj=x=>x.toLocaleString("ja-JP");const band=n=>{if(n<=LOW_PRICE)return fj(LOW_PRICE)+"万円以下";const [a,b]=rng(n,pstep);return fj(a)+"〜"+fj(b)+"万円"};const aband=n=>{const [a,b]=rng(n,astep);return fj(a)+"〜"+fj(b)+"㎡"};
const ym=s=>{const [y,m]=s.split('-');return `${y}年${+m}月`};
const area=r=>{const v=r.land_area_m2||r.occupied_area_m2||r.building_area_m2;if(!v)return '－';const n=+v;return aband(n)};
for(let i=rows.length-1;i>=0;i--)if(+rows[i].approx_price_man_yen<MIN_PRICE)rows.splice(i,1);
rows.sort((a,b)=>b.contract_month.localeCompare(a.contract_month));
const byCity={};const byType={};const byTown={};
for(const r of rows){const c=cityOf(r.address);byCity[c]=(byCity[c]||0)+1;byType[r.property_type]=(byType[r.property_type]||0)+1;if(c==='ひたちなか市'){const t=townOf(r.address);byTown[t]=(byTown[t]||0)+1}}
const cityTxt=Object.entries(byCity).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}件`).join('、');
const typeTxt=['土地','戸建','マンション','収益物件'].filter(k=>byType[k]).map(k=>`${k} ${byType[k]}件`).join('、');
const topTowns=Object.entries(byTown).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([t,v])=>town[t]?`<a href="${B}entry-${town[t]}/">${esc(t)}</a>（${v}件）`:`${esc(t)}（${v}件）`).join('、');
const years=[...new Set(rows.map(r=>r.contract_month.slice(0,4)))].sort();
const trs=rows.map(r=>{const c=cityOf(r.address),t=townOf(r.address);const tl=c==='ひたちなか市'&&town[t]?`<a href="${B}entry-${town[t]}/">${esc(t)}</a>`:esc(t);return `<tr><td>${ym(r.contract_month)}</td><td>${esc(c)}${tl}</td><td>${esc(r.property_type)}</td><td>${band(+r.approx_price_man_yen)}</td><td>${area(r)}</td></tr>`}).join('\n');
const html=`<div id="being-jisseki" style="max-width:860px;margin:auto;color:#263238;font-size:16px;line-height:1.9;">
<style>#being-jisseki *{box-sizing:border-box}#being-jisseki h2{font-size:23px;line-height:1.5;margin:34px 0 14px;padding:0 0 8px;border:0;border-bottom:2px solid #00acab;background:none;font-weight:700;color:#263238}#being-jisseki p{margin:0 0 14px}#being-jisseki a{color:#007b7a;font-weight:700}#being-jisseki .bj-sum{display:flex;flex-wrap:wrap;gap:8px 18px;padding:14px 18px;background:#f1f9f9;border-radius:10px;margin:0 0 16px}#being-jisseki .bj-sum b{font-size:24px;color:#007b7a}#being-jisseki .bj-wrap{overflow-x:auto;border:1px solid #dce7e7;border-radius:8px;max-height:640px;overflow-y:auto}#being-jisseki table{width:100%;border-collapse:collapse;font-size:14px;min-width:560px}#being-jisseki th,#being-jisseki td{border-bottom:1px solid #e3ecec;padding:8px 10px;text-align:left;white-space:nowrap}#being-jisseki th{background:#f1f9f9;position:sticky;top:0}#being-jisseki .bj-src{font-size:12px;color:#56676a}#being-jisseki .bt-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;padding:12px 16px;margin:0 0 22px;border:2px solid #00acab;border-radius:10px;font-size:15px}#being-jisseki .bt-top span{font-weight:700;flex:1 1 220px}#being-jisseki .bt-top a{text-decoration:none;display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 14px;border:2px solid #00acab;border-radius:6px;line-height:1.3}#being-jisseki .bt-top-tel{background:#00acab;color:#fff !important;font-size:17px}#being-jisseki .bt-top-link{background:#fff;font-size:15px}#being-jisseki .bt-cta{padding:26px 20px;background:#263238;color:#fff;border-radius:12px;margin-top:30px}#being-jisseki .bt-cta a{display:block;text-align:center;border-radius:6px;padding:12px;margin-top:10px;text-decoration:none}#being-jisseki .bt-tel{background:#00acab}#being-jisseki .bt-tel,#being-jisseki .bt-tel *{color:#fff !important}#being-jisseki .bt-tel strong{display:block;font-size:28px}#being-jisseki .bt-sub{background:#fff}</style>
<p>有限会社ビーイングが仲介した、ひたちなか市・水戸市周辺の土地・戸建て・マンションの売却実績です。${years[0]}年〜${years[years.length-1]}年に契約した${rows.length}件を、地図と一覧でご覧いただけます。「近所で、どんな土地がいくらくらいで売れているか」の参考にしてください。</p>
<div class="bt-top"><span>ご自宅や土地の価格を無料でお調べします</span><a class="bt-top-tel" href="tel:0293544000">☎ 029-354-4000</a><a class="bt-top-link" href="https://www.beingfudousan.com/satei/">フォームで査定依頼 ›</a></div>
<div class="bj-sum"><span>掲載実績 <b>${rows.length}</b> 件</span><span>${typeTxt}</span></div>
<h2>売却実績マップ</h2>
<p>地図の円をタップすると、その周辺の実績が表示されます。</p>
<iframe src="https://morokawa79-cpu.github.io/hitachinaka-map/being-jisseki/?embed=1" title="有限会社ビーイングの売却実績マップ" width="100%" height="900" loading="lazy" style="border:1px solid #dce7e7;border-radius:8px;display:block;"></iframe>
<h2>地域別の売却実績</h2>
<p>${cityTxt}の売却実績があります。</p>
<p>ひたちなか市内では、${topTowns}などで売却のお手伝いをしてきました。町名のリンクから、その町の土地相場の記事をご覧いただけます。</p>
<p><a href="${B}entry-874036/">ひたちなか市の土地相場マップ（町別の坪単価一覧） ›</a></p>
<h2>売却実績一覧（新しい順）</h2>
<div class="bj-wrap"><table>
<tr><th>契約年月</th><th>所在地（町名まで）</th><th>種別</th><th>価格</th><th>面積</th></tr>
${trs}
</table></div>
<p class="bj-src" style="margin-top:8px;">お客様の個人情報保護のため、価格・面積・場所はおおよその表示にしています。</p>
<h2>売却をご検討の方へ</h2>
<p>同じ町でも、土地の形や道路の付き方、区画整理の区域か、市街化調整区域かなどで価格は大きく変わります。実績の数字は目安として、実際の価格は物件ごとにお調べします。</p>
<p><a href="${B}entry-873404/">区画整理区域の土地を売るには ›</a><br><a href="${B}entry-873405/">相続した家・土地、どうする？ ›</a><br><a href="${B}entry-873406/">市街化調整区域の土地は売れる？ ›</a></p>
<div class="bt-cta">
<p style="margin:0 0 4px;font-size:20px;font-weight:700;">ひたちなか市周辺の不動産売却は、地元のビーイングへ</p>
<p style="margin:0;font-size:14px;color:#eceff1;">売るかどうか決まっていなくても大丈夫です。ご相談・査定は無料です。</p>
<a class="bt-tel" href="tel:0293544000"><span style="font-size:14px;">お電話で相談する（無料）</span><strong>029-354-4000</strong><span style="font-size:12px;">9:00〜18:00（水曜・GW・お盆・年末年始を除く）</span></a>
<a class="bt-sub" href="https://www.beingfudousan.com/satei/">フォームで無料査定を依頼する ›</a>
<a class="bt-sub" href="${B}entry-855000/">連絡不要のかんたん査定で目安を見る ›</a>
</div>
<p class="bj-src" style="margin-top:18px;">地図：国土地理院（淡色地図）。周辺位置の参照：Geolonia住所データ（CC BY 4.0、町名の代表点を約2km単位に加工）。</p>
</div>`;
fs.writeFileSync(out,html);console.log('bytes',Buffer.byteLength(html),'chars',html.length,'rows',rows.length,'|',cityTxt,'|',typeTxt);
