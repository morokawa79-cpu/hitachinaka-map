import fs from 'fs'
import * as topojson from 'topojson-client'
import * as turf from '@turf/turf'

const OUT = 'G:/マイドライブ/Claude/hitachinaka-map/data'
const BBOX = '36.31,140.48,36.48,140.64'

// 市域ポリゴン
const tj = JSON.parse(fs.readFileSync('r2ka08221.topojson','utf8'))
const cityPolys = turf.combine(turf.flatten(topojson.feature(tj, tj.objects.city))).features[0]
const inCity = (lon,lat) => { try { return turf.booleanPointInPolygon(turf.point([lon,lat]), cityPolys) } catch { return false } }

// 主要ランドマーク（名前指定）
const LM = '国営ひたち海浜公園|おさかな市場|ひたちなか総合病院|那珂湊反射炉|阿字ヶ浦海水浴場|平磯海水浴場|ひたちなか市総合運動公園|ひたちなか市文化会館|湊公園|那珂湊天満宮'
const LM_DEFS = [
  { term:'ひたち海浜公園', name:'国営ひたち海浜公園' },
  { term:'おさかな市場',   name:'那珂湊おさかな市場' },
  { term:'反射炉',         name:'那珂湊反射炉跡' },
  { term:'天満宮',         name:'那珂湊天満宮' },
  { term:'総合運動公園',   name:'ひたちなか市総合運動公園' },
  { term:'文化会館',       name:'ひたちなか市文化会館' },
  { term:'阿字ヶ浦海水浴場', name:'阿字ヶ浦海水浴場' },
  { term:'湊公園',         name:'湊公園' },
]
const canonLandmark = (nm) => { for (const d of LM_DEFS) if (nm.includes(d.term)) return d.name; return null }

// カテゴリ判定
const cat = (t) => {
  if (t.railway === 'station') return 'station'
  if (t.name && /コストコ|Costco/i.test(t.name)) return 'shopping'
  if (t.shop === 'supermarket') return 'supermarket'
  if (t.shop === 'convenience') return 'conveni'
  if (['mall','department_store','wholesale'].includes(t.shop)) return 'shopping'
  if (t.shop === 'doityourself') return 'homecenter'
  if (['restaurant','fast_food'].includes(t.amenity)) return 'restaurant'
  if (t.amenity === 'hospital') return 'hospital'
  if (['bank','post_office'].includes(t.amenity)) return 'finance'
  if (['library','townhall','community_centre'].includes(t.amenity)) return 'public'
  if (['prison','crematorium'].includes(t.amenity)) return 'nuisance'
  if (t.landuse === 'cemetery') return 'nuisance'
  if (t.man_made === 'works' || t.landuse === 'industrial') return 'factory'
  if (t.amenity === 'townhall') return 'public'
  if (t.name && new RegExp(LM).test(t.name)) return 'landmark'
  return null
}

const mainQ = `[out:json][timeout:120];
(
  node["railway"="station"](${BBOX});
  nwr["shop"="supermarket"](${BBOX});
  nwr["shop"="convenience"](${BBOX});
  nwr["shop"="department_store"](${BBOX});
  nwr["shop"="mall"](${BBOX});
  nwr["shop"="wholesale"](${BBOX});
  nwr["shop"="doityourself"](${BBOX});
  nwr["amenity"="restaurant"](${BBOX});
  nwr["amenity"="fast_food"](${BBOX});
  nwr["amenity"="hospital"](${BBOX});
  nwr["amenity"="bank"](${BBOX});
  nwr["amenity"="post_office"](${BBOX});
  nwr["amenity"="library"](${BBOX});
  nwr["amenity"="townhall"](${BBOX});
  nwr["amenity"="prison"](${BBOX});
  nwr["amenity"="crematorium"](${BBOX});
  nwr["man_made"="works"]["name"](${BBOX});
  nwr["landuse"="industrial"]["name"](${BBOX});
  nwr["landuse"="cemetery"]["name"](${BBOX});
  nwr["amenity"="school"]["name"](${BBOX});
);
out center;`
const lmQ = `[out:json][timeout:90];( nwr["name"~"${LM}"](${BBOX}); );out center;`
const costcoQ = `[out:json][timeout:60];( nwr["name"~"コストコ|Costco"](${BBOX}); );out center;`

const sleep = (ms) => new Promise(r=>setTimeout(r,ms))
const EPS = ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://maps.mail.ru/osm/tools/overpass/api/interpreter']
const fetchOv = async (q) => {
  for (let attempt=0; attempt<6; attempt++) {
    const ep = EPS[attempt % EPS.length]
    try {
      const r = await fetch(ep, { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded', 'User-Agent':'hitachinaka-map/1.0' }, body:'data='+encodeURIComponent(q) })
      if (r.status === 429 || r.status === 504) { console.log('  retry', r.status, 'wait...'); await sleep(8000); continue }
      if (!r.ok) throw new Error('overpass '+r.status)
      return (await r.json()).elements
    } catch (e) { console.log('  err', e.message, 'retry'); await sleep(5000) }
  }
  throw new Error('overpass failed after retries')
}
const elements = []
for (const q of [mainQ, lmQ, costcoQ]) { elements.push(...await fetchOv(q)); await sleep(3000) }

// 干し芋屋は除外
const isHoshiimo = (nm) => /干し芋|ほしいも|干しいも|乾燥芋/.test(nm)

const seen = new Set()
const pois = []
const push = (c, name, lat, lon) => {
  const key = c + ':' + name + ':' + lat.toFixed(3)
  if (seen.has(key)) return
  seen.add(key)
  pois.push({ name, cat: c, lat: Math.round(lat*1e5)/1e5, lng: Math.round(lon*1e5)/1e5 })
}
for (const e of elements) {
  const t = e.tags || {}
  if (!t.name) continue
  const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon
  if (lat == null || lon == null || !inCity(lon, lat)) continue
  let name = t.name.replace(/\s*\(.*?\)\s*/g,'').trim()
  if (isHoshiimo(name)) continue

  // 学校（点）: 小中のみ。義務教育学校（美乃浜学園）は小中両方に表示
  if (t.amenity === 'school') {
    if (/小学校/.test(name)) push('school_e', name, lat, lon)
    if (/中学校/.test(name)) push('school_j', name, lat, lon)
    if (/義務教育学校|美乃浜学園/.test(name)) { push('school_e', name, lat, lon); push('school_j', name, lat, lon) }
    continue
  }

  const c = cat(t)
  if (!c) continue
  if (c === 'station' && !name.endsWith('駅')) name += '駅'
  if (c === 'landmark') { name = canonLandmark(name); if (!name) continue }
  // 工場は日立系・主要のみ（名前で絞る）
  if (c === 'factory' && !/日立|製作所|Astemo|アステモ|工場|製造|建機|ファナック|FANUC/i.test(name)) continue
  push(c, name, lat, lon)
}

pois.sort((a,b)=> a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name,'ja'))
const counts = pois.reduce((m,p)=>(m[p.cat]=(m[p.cat]||0)+1,m),{})
console.log('counts:', JSON.stringify(counts), 'total', pois.length)
for (const c of Object.keys(counts).sort()) {
  console.log('---', c)
  pois.filter(p=>p.cat===c).slice(0,40).forEach(p=>console.log('   ',p.name))
}

const header = `// ひたちなか市 施設データ（編集可）
// cat: station=駅 / supermarket=スーパー / shopping=商業施設 / homecenter=ホームセンター
//      conveni=コンビニ / restaurant=飲食店 / hospital=病院 / finance=銀行・郵便局
//      public=公共施設 / factory=工場 / nuisance=嫌悪施設 / landmark=ランドマーク
`
fs.writeFileSync(`${OUT}/poi.js`, header + 'window.POI = ' + JSON.stringify(pois, null, 0) + ';\n', 'utf8')
console.log('wrote poi.js')
