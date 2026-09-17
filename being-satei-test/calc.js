// Land comparables + depreciated replacement cost, matching Satei Studio defaults.
export const TSUBO=400/121;
export function areaInSqm(value,unit='sqm'){return value===''?NaN:Math.round(Number(value)*(unit==='tsubo'?TSUBO:1)*1e8)/1e8;}
export function switchAreaUnit(value,from,to){return value===''?'':String(Number((Number(value)*(from==='tsubo'?TSUBO:1)/(to==='tsubo'?TSUBO:1)).toFixed(8)));}
export function displayAmounts(result){const up=yen=>Math.ceil(yen/100000)*100000,land=up(result.landValue),building=up(result.building.value),total=land+building;return {land,building,total,low:up(result.low*10000),high:Math.max(up(result.high*10000),total)};}
export const canonicalTown=s=>String(s??'').normalize('NFKC').replace(/^茨城県/,'').replace(/^ひたちなか市/,'').replace(/^大字/,'').replace(/[\s　]/g,'').replace(/[ヶヵ]/g,'ケ');
export function median(values){const v=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!v.length)return null;const m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2;}
export function distance(a,b){if(!a||!b)return Infinity;const rad=Math.PI/180,lat=(a.lat-b.lat)*rad,lng=(a.lng-b.lng)*rad;return 6371*2*Math.asin(Math.sqrt(Math.sin(lat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(lng/2)**2));}
export function findTown(name,towns){const n=canonicalTown(name);return towns.find(t=>canonicalTown(t.name)===n)??towns.find(t=>canonicalTown(t.name)===n.replace(/(?:[0-9一二三四五六七八九十]+丁目)$/,''));}
export const ZONE_LABELS={unknown:'不明',urban:'市街化区域',control:'市街化調整区域'};
export function classifyZone(value){const v=String(value??'').normalize('NFKC');if(/調整区域/.test(v))return 'control';if(/市街化区域|住居|住専|住宅|商業|工業|工専/.test(v))return 'urban';return 'unknown';}
export function resolveAddress(value,towns){
  const raw=String(value??'').normalize('NFKC').replace(/[\s　]/g,'');
  if(/^.{2,3}[都道府県]/.test(raw)&&!raw.startsWith('茨城県'))return null;
  if(/市/.test(raw)&&!raw.startsWith('ひたちなか市')&&!raw.startsWith('茨城県ひたちなか市')&&!raw.startsWith('市毛'))return null;
  const n=canonicalTown(raw);
  return [...towns].sort((a,b)=>canonicalTown(b.name).length-canonicalTown(a.name).length).find(t=>{const name=canonicalTown(t.name);return n===name||(n.startsWith(name)&&/^(?:[0-9一二三四五六七八九十]+|字)/.test(n.slice(name.length)));})??null;
}
export function validateInput(input,towns,structures){
  if(!input||!['house','land'].includes(input.kind))throw Error('土地または土地＋建物を選んでください。');
  const town=towns.find(t=>t.name===input.town);if(!town)throw Error('ひたちなか市の町名を選んでください。');
  const zone=input.zone??'unknown';if(!Object.hasOwn(ZONE_LABELS,zone))throw Error('市街化区域・調整区域・不明から選んでください。');
  const landArea=Number(input.landArea);if(!Number.isFinite(landArea)||landArea<30||landArea>2000)throw Error('土地面積は30〜2,000㎡で入力してください。範囲外の物件は個別にご相談ください。');
  let buildingArea=null,age=null,structure=input.structure??'wood';
  if(input.kind==='house'){
    buildingArea=Number(input.buildingArea);age=input.age===''||input.age==null?NaN:Number(input.age);
    if(!Number.isFinite(buildingArea)||buildingArea<20||buildingArea>500)throw Error('建物面積は20〜500㎡で入力してください。');
    if(!Number.isInteger(age)||age<0||age>100)throw Error('築年数は0〜100年の整数で入力してください。');
    if(!Object.hasOwn(structures,structure))throw Error('建物の構造を選んでください。');
  }
  if(input.use&&!['residential','business'].includes(input.use))throw Error('住宅または事業用を選んでください。');
  return {kind:input.kind,use:input.use??'residential',town:town.name,landArea,buildingArea,age,structure,zone};
}
function dedupe(records){const unique=new Map();for(const r of records){const id=[r.kind,canonicalTown(r.town),r.year,r.quarter,r.price,r.landArea].join('|');if(!unique.has(id)||r.source==='成約価格情報')unique.set(id,r);}return [...unique.values()];}
function neighborhood(record,target,towns){
  const center=findTown(record.town,towns);if(!center)return null;
  const same=canonicalTown(center.name)===canonicalTown(target.name),km=same?0:distance(center,target);
  const adjacent=target.neighbors?.some(n=>canonicalTown(n)===canonicalTown(center.name))||center.neighbors?.some(n=>canonicalTown(n)===canonicalTown(target.name));
  if(!same&&!adjacent&&km>3)return null;
  return {same,adjacent:!!adjacent,km,tier:same?0:adjacent?1:2};
}
function trimOutliers(rows){const mid=median(rows.map(r=>r.unitPrice));if(!mid)return [];const mad=median(rows.map(r=>Math.abs(r.unitPrice-mid)));return rows.filter(r=>r.unitPrice>=mid*.45&&r.unitPrice<=mid*2.2&&(!mad||Math.abs(r.unitPrice-mid)<=Math.max(3*1.4826*mad,mid*.35)));}
function rank(a,b){return a.tier-b.tier||a.score-b.score||b.year-a.year||b.quarter-a.quarter||a.price-b.price||a.town.localeCompare(b.town,'ja');}
export function buildingValue(input,structures){
  if(input.kind==='land')return {value:0,replacement:0,remainingRate:0,unitCost:0,usefulLife:0,label:null};
  const s=structures[input.structure];
  const remainingRate=Math.min(1,Math.max(0,1-input.age/s.usefulLife));
  // Studio stores ten-thousand yen; round the evaluated component to the same unit.
  return {value:Math.round(s.unitCost*input.buildingArea*remainingRate)*10000,replacement:s.unitCost*10000*input.buildingArea,remainingRate,unitCost:s.unitCost*10000,usefulLife:s.usefulLife,label:s.label};
}
export function assess(input,market,towns,structures,now=new Date()){
  if(input?.kind==='house'&&input.use==='business')return {status:'consultation',reason:'事業用物件はかんたん査定の対象外です。用途や収益性、建物の仕様を伺って個別に査定します。',input};
  input=validateInput(input,towns,structures);const target=findTown(input.town,towns),nowQ=now.getFullYear()*4+Math.floor(now.getMonth()/3);
  const all=dedupe(market.records??[]).filter(r=>r.kind==='land'&&r.city==='08221'&&Number.isFinite(r.price)&&r.price>0&&Number.isFinite(r.landArea)&&r.landArea>0&&Number.isInteger(r.year)&&Number.isInteger(r.quarter)&&r.quarter>=1&&r.quarter<=4);
  const eligible=all.filter(r=>{const elapsed=nowQ-(r.year*4+r.quarter-1);return elapsed>=0&&elapsed<20&&(input.zone==='unknown'||classifyZone(r.zoning)===input.zone);});
  const latestQ=Math.max(-Infinity,...eligible.map(r=>r.year*4+r.quarter-1));
  const nearbyPublicPoints=(market.publicPoints??[]).filter(p=>p.year>=now.getFullYear()-1&&p.year<=now.getFullYear()&&Number.isFinite(p.price)&&p.price>0&&(input.zone==='unknown'||classifyZone(p.areaDivision||p.zoning)===input.zone)).map(p=>({...p,distance:distance(target,p)})).filter(p=>p.distance<=3).sort((a,b)=>a.distance-b.distance).slice(0,5);
  const publicPoint=nearbyPublicPoints[0]??null;
  const candidates=trimOutliers(eligible.flatMap(r=>{
    const place=neighborhood(r,target,towns),ratio=input.landArea/r.landArea;
    if(!place||ratio<.67||ratio>1.5)return [];
    return [{...r,...place,unitPrice:r.price/r.landArea,adjusted:r.price/r.landArea*input.landArea,score:Math.abs(Math.log(ratio))*3+place.km*.2+(latestQ-(r.year*4+r.quarter-1))*.06}];
  }));
  const recent=candidates.filter(r=>nowQ-(r.year*4+r.quarter-1)<12),expanded=recent.length<5;
  const chosen=(expanded?candidates:recent).sort(rank).slice(0,5),basis=chosen.length?'comparables':'public';
  const landUnit=chosen.length?median(chosen.map(r=>r.unitPrice)):publicPoint?.price;
  if(!landUnit)return {status:'insufficient',reason:'近隣・隣接地域の土地事例と公示地価がどちらも見つからず、根拠のある金額を計算できませんでした。',input,publicPoint,nearbyPublicPoints,mode:market.mode};
  const landValue=Math.round(landUnit*input.landArea/10000)*10000,building=buildingValue(input,structures),center=landValue+building.value;
  return {status:'ok',input,mode:market.mode,basis,confidence:chosen.length===5?'standard':'low',landValue,landUnit,building,median:center,low:Math.floor(center*.95/10000),high:Math.ceil(center*1.15/10000),cases:chosen,expanded,publicPoint,nearbyPublicPoints,divergence:publicPoint?landUnit/publicPoint.price-1:null,spread:chosen.length?(Math.max(...chosen.map(r=>r.adjusted))-Math.min(...chosen.map(r=>r.adjusted)))/landValue:null,sourceCounts:{survey:chosen.filter(r=>r.source==='不動産取引価格情報').length,contract:chosen.filter(r=>r.source==='成約価格情報').length}};
}
