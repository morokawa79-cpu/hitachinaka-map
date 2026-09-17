import {propertyWarnings} from './readjustment.js?v=46fc5f6e8747';
import {assess,TSUBO,resolveAddress,ZONE_LABELS,areaInSqm,switchAreaUnit,displayAmounts} from './calc.js?v=79ae7c489602';
const $=s=>document.querySelector(s),form=$('#assessment-form'),output=$('#result-content'),notice=$('#data-notice');
const initial=output.innerHTML,fmt=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:1});
const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
let market,towns=[],structures={};
let pendingTimer=null,pendingResolve=null;
const submitLabel=$('.submit').innerHTML;
function cancelCalculation(){if(pendingTimer!==null)clearTimeout(pendingTimer);pendingTimer=null;if(pendingResolve)pendingResolve(false);pendingResolve=null;$('#result').removeAttribute('aria-busy');$('.submit').disabled=!market;$('.submit').innerHTML=submitLabel;}
const man=yen=>fmt.format(yen/10000);
const unitPrices=yenPerSqm=>`約${fmt.format(Math.round(yenPerSqm))}円／㎡ ・ 約${man(yenPerSqm*TSUBO)}万円／坪`;
function estimateUnits(result){
  if(result.input.kind==='house')return '';
  const area=result.input.landArea,low=Math.ceil(result.low/10)*100000/area,high=Math.ceil(result.high/10)*100000/area;
  return `<div class="estimate-units"><p>価格帯の単価：${fmt.format(Math.round(low))}〜${fmt.format(Math.round(high))}円／㎡<br>約${man(low*TSUBO)}〜${man(high*TSUBO)}万円／坪</p><p>査定額の単価：${unitPrices(Math.ceil(result.median/100000)*100000/area)}</p></div>`;
}
function kind(){return form.elements.kind.value;}
function converted(field){const raw=$(`#${field}-area`).value;return areaInSqm(raw,$(`#${field}-unit`).value);}
function readInput(){if(kind()==='house'&&form.elements.use.value==='business')return {kind:'house',use:'business'};const raw=$('#address').value.trim(),resolved=raw?resolveAddress(raw,towns):null;if(raw&&!resolved)throw Error('町名を確認できませんでした。ひたちなか市の町名を入力するか、候補から選んでください。');return {kind:kind(),use:form.elements.use.value,town:resolved?.name??$('#town').value,landArea:converted('land'),buildingArea:converted('building'),age:$('#age').value,structure:$('#structure').value,zone:$('#zone').value};}
function clearResult(){cancelCalculation();output.innerHTML=initial;$('#form-error').hidden=true;}
function toggleBuilding(){const house=kind()==='house',business=house&&form.elements.use.value==='business';$('#use-field').hidden=!house;$('#business-notice').hidden=!business;$('#property-fields').hidden=business;$('.submit').hidden=business;for(const control of $('#property-fields').querySelectorAll('input,select'))control.disabled=business;$('#building-fields').hidden=!house;$('#structure-field').hidden=!house;for(const id of ['building-area','building-unit','age','structure'])$(`#${id}`).disabled=!house||business;if(business)render({status:'consultation',input:{kind:'house',use:'business'}});}
function conversion(field){const n=Number($(`#${field}-area`).value);$(`#${field}-conversion`).textContent=!n?'面積を入力すると、もう一方の単位も表示します。':$(`#${field}-unit`).value==='sqm'?`約 ${fmt.format(n/TSUBO)} 坪`:`約 ${fmt.format(n*TSUBO)} ㎡`;}
function publicHtml(result){
  const points=(result.nearbyPublicPoints??(result.publicPoint?[result.publicPoint]:[])).slice(0,3);
  return `<div class="reference"><h3>近隣の公示地価${points.length?`（${points.length}地点）`:''}</h3>${points.length?`<ol class="public-point-list">${points.map(p=>`<li><p><strong>${esc(p.label)} ／ ${p.year}年1月1日時点</strong><br>${esc(p.address)}</p><p class="public-point-price"><strong>${fmt.format(p.price)}円／㎡</strong> ・ 約${man(p.price*TSUBO)}万円／坪<br>入力面積での参考額：<strong>約${man(p.price*result.input.landArea)}万円</strong></p><p class="small">${esc(p.areaDivision||p.zoning)} ／ 町域の代表点から約${p.distance.toFixed(1)}km</p></li>`).join('')}</ol><p class="small">近い順に最大3地点。入力物件とは位置・土地条件が異なります。建物の価格は含みません。</p>`:'<p>近くに区域条件の合う公示地価が見つかりませんでした。公示地価による照合は行っていません。</p>'}</div>`;
}
function render(result){
  if(result.status==='consultation'){output.innerHTML='<div class="insufficient"><p class="eyebrow">土地＋建物 ／ 事業用</p><h3>事業用物件は、<br>個別にご相談ください。</h3><p>店舗・事務所・工場・倉庫などは、用途・建物の仕様・収益性によって評価が大きく異なるため、かんたん査定を行っていません。</p><p>所在地や現在のご利用状況をお伺いして、売却のご相談を承ります。</p><a class="primary" href="https://lin.ee/hH9SPoe" target="_blank" rel="noopener noreferrer">LINEで事業用物件を相談する</a><a class="form-action" href="https://www.beingfudousan.com/satei/" target="_blank" rel="noopener noreferrer">お問い合わせフォームで相談する ↗</a><p class="business-phone"><a class="phone" href="tel:0293544000">☎ 029-354-4000</a></p></div>';return;}
  const i=result.input;
  const summary=`ひたちなか市${esc(i.town)} ／ 区域：${ZONE_LABELS[i.zone]}<br>土地 ${fmt.format(i.landArea)}㎡（${fmt.format(i.landArea/TSUBO)}坪）${i.kind==='house'?`<br>建物 ${fmt.format(i.buildingArea)}㎡（${fmt.format(i.buildingArea/TSUBO)}坪）・築${i.age}年`:''}`;
  if(result.status!=='ok'){output.innerHTML=`<div class="insufficient"><p class="result-summary">${summary}</p><h3>詳しい確認が必要な物件です</h3><p>${esc(result.reason)}</p><a class="primary" href="https://lin.ee/hH9SPoe" target="_blank" rel="noopener noreferrer">ビーイングに相談する</a></div>${publicHtml(result)}`;return;}
  const b=result.building,count=result.cases.length;
  const amounts=displayAmounts(result),displayedLand=amounts.land,displayedBuilding=amounts.building,displayedTotal=amounts.total;
  output.innerHTML=`<p class="result-summary">${summary}</p>
    <div class="price-box"><p class="price-label">${i.kind==='house'?'土地＋建物の':'土地の'}売却価格の目安</p><div class="price-value"><span>${man(amounts.low)}<small>万円</small></span><small>〜</small><span>${man(amounts.high)}<small>万円</small></span></div><p class="median">${i.kind==='house'?'土地と建物を合計した基準価格':'査定額'}：<strong>${man(displayedTotal)}万円</strong></p>${estimateUnits(result)}<p class="price-disclaimer">概算の参考値です。売却価格を保証するものではありません。</p></div>
    ${propertyWarnings(i.zone,i.town)}
    <div class="result-actions"><a class="primary" href="https://lin.ee/hH9SPoe" target="_blank" rel="noopener noreferrer">売却についてLINEで相談する<span>売却前のご相談も無料</span></a><a class="phone-action" href="tel:0293544000">電話で相談<span>029-354-4000</span></a><a class="form-action" href="https://www.beingfudousan.com/satei/" target="_blank" rel="noopener noreferrer">お問い合わせフォームで相談する ↗</a></div>
    ${i.kind==='house'?`<div class="breakdown"><div><span>土地の査定額</span><strong>${man(displayedLand)}<small>万円</small></strong><p class="breakdown-units">${unitPrices(displayedLand/i.landArea)}<small>土地面積で換算</small></p></div><span class="plus">＋</span><div><span>建物の査定額</span><strong>${man(displayedBuilding)}<small>万円</small></strong><p class="breakdown-units">${unitPrices(displayedBuilding/i.buildingArea)}<small>延床面積で換算・減価後</small></p></div></div>`:''}
    <div class="calculation-note"><p><strong>土地</strong>　${result.basis==='comparables'?`${count}件の土地事例の単価${count===1?'':'中央値'}`:'公示地価の単価'} ${unitPrices(result.landUnit)}<br>㎡単価 × ${fmt.format(i.landArea)}㎡で計算</p>${i.kind==='house'?`<p><strong>建物</strong>　${esc(b.label)}・参考工事単価（減価前）<br>${unitPrices(b.unitCost)}<br>㎡単価 × ${fmt.format(i.buildingArea)}㎡ × 残価率 ${fmt.format(b.remainingRate*100)}％</p><p class="small">築年数で減価する前の参考額：${man(b.replacement)}万円。築${i.age}年・計算上の減価年数${b.usefulLife}年で概算しています。</p><p class="small">建物は参考単価と築年数から概算。クリーニング済みで、すぐ住める状態を前提としています。</p>${b.assumption?`<p class="small">${esc(b.assumption)}</p>`:''}`:''}</div>
    ${i.kind==='house'&&b.remainingRate===0?'<p class="result-warning">標準の減価計算では建物評価が０円となります。実際の建物の価値がないという意味ではありません。修繕・リフォーム・利用状況を確認すると評価が変わる場合があります。</p>':''}
    ${result.confidence==='low'?`<p class="result-warning"><strong>参考情報が少ないため、価格の確かさは低めです。</strong><br>${count?`土地事例${count}件で試算しています。`:'近い条件の土地事例がないため、公示地価から試算しています。'} 実際の売却価格は表示範囲を外れる場合があります。</p>`:''}
    <h3>${count?`土地の査定に使った${count}事例`:'近い条件の土地事例は見つかりませんでした'}</h3><p class="small">${result.expanded?'直近３年で不足するため、最長５年の事例まで確認しています。':'現在から３年以内の事例です。'} 同じ町域・隣接する町域を優先しています。</p><p class="small case-source">国交省の公開取引事例です。当社の成約実績ではありません。${result.sourceCounts.survey?'取引価格情報はアンケートに基づきます。':''}</p>
    <ol class="case-list">${result.cases.map((r,index)=>`<li class="case"><div class="case-head"><span class="case-title">${index+1}. ${esc(r.town)}</span><span class="case-price">${man(r.price)}<small>万円</small></span></div><p class="case-meta">土地 ${fmt.format(r.landArea)}㎡（${fmt.format(r.landArea/TSUBO)}坪）<br>${unitPrices(r.unitPrice)}<br>${r.year}年第${r.quarter}四半期 ／ ${esc(r.source)}</p><p class="case-meta">${r.same?'同じ町域':`${r.adjacent?'隣接する町域':'近隣の町域'}（代表点間 約${r.km.toFixed(1)}km）`}${r.zoning?` ／ ${esc(r.zoning)}`:''}</p><p class="case-adjusted"><span>入力した土地面積での参考価格</span><strong>${man(Math.round(r.adjusted/10000)*10000)}万円</strong></p></li>`).join('')}</ol>
    ${publicHtml(result)}
    ${result.divergence!==null&&Math.abs(result.divergence)>.5?'<div class="result-warning reference-consult"><strong>公示地価との差が大きいため、個別の確認をおすすめします。</strong><p>用途地域・道路・敷地条件を確認し、より詳しい査定をご案内します。</p><a class="form-action" href="https://www.beingfudousan.com/satei/" target="_blank" rel="noopener noreferrer">詳しくはお問い合わせください ↗</a></div>':''}
    
    <details class="method"><summary>選び方・計算方法について</summary><p>区画整理の注意は町名単位の参考表示です。土地そのものの区域内・外を判定するものではなく、注意が出なくても区域外を保証しません。町名を理由とする価格補正は行っていません。<a href="https://www.city.hitachinaka.lg.jp/machizukuri/kukakuseiri/1002500/index.html" target="_blank" rel="noopener noreferrer">市の施行中地区</a>と<a href="https://www.rosenka.nta.go.jp/main_r08/kanto/ibaraki/ratios/pdf/c16203rt.pdf" target="_blank" rel="noopener noreferrer">国税庁の令和8年分町名別資料</a>を照合（2026年9月17日確認）。</p><p>ひたちなか市内の同じ町名を優先し、隣接する町・大字まで広げます。それ以外は町域代表点間３km以内。番地の隣の敷地を特定するものではありません。選択した区域が分かる場合は、異なる区域・区域不明の事例を除外します。</p><p>土地面積比約0.67〜1.5倍、原則３年以内（不足時は５年以内）の土地事例を最大５件選び、㎡単価の中央値×入力面積で土地を評価します。１件でも計算し、０件なら同じ区域条件の近くの公示地価を使います。重複候補・特殊な取引・極端な単価を除きます。</p><p>建物は構造別の参考単価×延床面積×残価率で概算します。木造は国税庁の令和8年分・茨城県の工事費用表（23.2万円／㎡、約76.7万円／坪）を参考に採用。税務上の損失額計算向けの参考値で、実際の建築見積・売却価格とは異なります。<a href="https://www.nta.go.jp/taxes/shiraberu/saigai/h30/0018008-045/07.htm" target="_blank" rel="noopener noreferrer">出典（2026年9月17日確認）↗</a>。軽量鉄骨は減価年数19年、重量鉄骨は34年、コンクリート造はRC造47年の代表設定で概算します。不明は木造として仮計算します。木造以外の単価と減価年数は査定書工房の標準設定です。構造の詳細により評価は変わります。減価は国税庁の評価式ではなく、独自の簡易式「１−築年数÷耐用年数」（０〜100％）です。木造22年は計算用の設定で、建物の寿命を意味しません。建築月がないため年単位で計算し、計算上は土地・建物それぞれ万円単位で丸め、表示はそれぞれ10万円単位に切り上げて合計します。内訳の㎡・坪単価は表示額から換算します。修繕による残価補正や個別調整は未入力です。</p><p>公示地価を土地事例の１件として中央値へ混ぜることはありません。道路・形状・建築条件・修繕状態や市況変動の個別補正は未対応です。表示幅は統計的な信頼区間や売却保証ではありません。</p></details>`;
}
async function calculate(input){
  if(!market)throw Error('データを読み込めませんでした。ページを再読み込みしてください。');
  const result=assess(input,market,towns,structures);cancelCalculation();
  if(result.status==='consultation'){render(result);return result;}
  output.innerHTML='<div class="loading-result" role="status"><span class="loading-spinner" aria-hidden="true"></span><h3>査定結果を準備しています</h3><p>もう少しで価格の目安を表示します。</p></div>';
  $('#result').setAttribute('aria-busy','true');$('.submit').disabled=true;$('.submit').textContent='査定結果を準備しています…';
  $('#result').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
  const completed=await new Promise(resolve=>{pendingResolve=resolve;pendingTimer=setTimeout(()=>{pendingTimer=null;pendingResolve=null;resolve(true);},4000);});
  if(!completed)return null;
  $('#result').removeAttribute('aria-busy');$('.submit').disabled=false;$('.submit').innerHTML=submitLabel;render(result);
  (output.querySelector('.price-box')??$('#result')).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});return result;
}
form.addEventListener('submit',async event=>{event.preventDefault();$('#form-error').hidden=true;try{await calculate(readInput());}catch(error){cancelCalculation();$('#form-error').textContent=error.message;$('#form-error').hidden=false;}});
form.addEventListener('input',clearResult);form.addEventListener('change',()=>{clearResult();toggleBuilding();});
$('#address').addEventListener('input',()=>{const found=resolveAddress($('#address').value,towns);$('#town').value=found?.name??'';$('#address-match').textContent=found?`「ひたちなか市${found.name}」として査定します。`:'';});
function syncAreaUnit(field,convert=false){const unit=$(`#${field}-unit`),area=$(`#${field}-area`);if(convert)area.value=switchAreaUnit(area.value,unit.dataset.previous??'sqm',unit.value);unit.dataset.previous=unit.value;const factor=unit.value==='tsubo'?TSUBO:1;area.min=(field==='land'?30:20)/factor;area.max=(field==='land'?2000:500)/factor;area.placeholder=unit.value==='sqm'?(field==='land'?'例：200':'例：100'):(field==='land'?'例：60.5':'例：30.25');conversion(field);}
for(const field of ['land','building']){$(`#${field}-area`).addEventListener('input',()=>conversion(field));$(`#${field}-unit`).addEventListener('change',()=>syncAreaUnit(field,true));syncAreaUnit(field);}
async function init(){
  try{
    const responses=await Promise.all(['./data/towns.json?v=b5fdb668ac59','./data/market.json?v=a7b9594f7c70','./data/structures.json?v=d434640e8233'].map(url=>fetch(new URL(url,import.meta.url))));if(responses.some(r=>!r.ok))throw Error();
    const [g,m,s]=await Promise.all(responses.map(r=>r.json()));towns=g.towns;market=m;structures=s;
    for(const town of towns){const opt=document.createElement('option');opt.value=town.name;$('#town-list').append(opt);}
    $('#structure').replaceChildren();for(const [value,item]of Object.entries(structures)){const opt=document.createElement('option');opt.value=value;opt.textContent=item.label;$('#structure').append(opt);}
    notice.classList.add('live');notice.textContent=`国交省の取得済み公開データで計算します。取得日：${new Date(market.updatedAt).toLocaleDateString('ja-JP')}。`;
    if((Date.now()-new Date(market.updatedAt).getTime())/86400000>120)notice.textContent+=' データ取得から120日以上経過しています。更新が必要です。';
    conversion('land');conversion('building');toggleBuilding();$('.submit').disabled=false;registerTool();
  }catch{notice.textContent='査定用データを読み込めませんでした。データ更新後にページを再読み込みしてください。';$('.submit').disabled=true;}
}
function registerTool(){
  if(!document.modelContext?.registerTool)return;
  try{Promise.resolve(document.modelContext.registerTool({name:'calculate_hitachinaka_estimate',title:'ひたちなか市の概算価格を表示',description:'土地の比較査定と建物の減価後再調達価格を計算して画面に表示。事業用は価格を出さず相談案内を表示。問い合わせは送信しません。',inputSchema:{type:'object',properties:{kind:{type:'string',enum:['land','house']},use:{type:'string',enum:['residential','business']},town:{type:'string'},landArea:{type:'number',minimum:30,maximum:2000},buildingArea:{type:'number',minimum:20,maximum:500},age:{type:'integer',minimum:0,maximum:100},zone:{type:'string',enum:['unknown','urban','control']},structure:{type:'string',enum:Object.keys(structures)}},required:['kind'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},async execute(input){const result=await calculate(input);if(!result)return {status:'cancelled'};const i=result.input;form.elements.kind.value=i.kind;form.elements.use.value=i.use??'residential';if(result.status!=='consultation'){$('#town').value=i.town;$('#address').value=i.town;$('#address-match').textContent='';$('#land-area').value=i.landArea;$('#land-unit').value='sqm';$('#building-area').value=i.buildingArea??'';$('#building-unit').value='sqm';$('#age').value=i.age??'';$('#zone').value=i.zone;$('#structure').value=i.structure;}toggleBuilding();syncAreaUnit('land');syncAreaUnit('building');return {status:result.status,lowMan:result.low??null,highMan:result.high??null,landMan:result.landValue==null?null:result.landValue/10000,buildingMan:result.building?.value==null?null:result.building.value/10000,comparableCount:result.cases?.length??0,reason:result.reason??null};}})).catch(()=>{});}catch{}
}
init();
