// 市町村データ一括生成（那珂市スクリプトの汎用版）
// 使い方: node city-build.mjs <市町村コード> <接頭辞> [poi]
//   例: node city-build.mjs 08216 kasama poi
// 出力: <接頭辞>-oaza.js / -elementary.js / -junior.js / -chome.js / -yochi.js（A29にあれば）/ -poi.js（poi指定時）
import fs from 'fs'
import * as topojson from 'topojson-client'
import * as turf from '@turf/turf'

const OUT = 'G:/マイドライブ/Claude/hitachinaka-map/data'
const [CITY, PREFIX, WITH_POI] = process.argv.slice(2)
if (!/^\d{5}$/.test(CITY ?? '') || !PREFIX) throw new Error('usage: node city-build.mjs <code> <prefix> [poi]')

const roundCoords = (geom, p = 5) => {
  const f = 10 ** p
  const r = (c) => Array.isArray(c[0]) ? c.map(r) : [Math.round(c[0]*f)/f, Math.round(c[1]*f)/f]
  geom.coordinates = r(geom.coordinates)
  return geom
}
const normOaza = (s) => s ? s.replace(/^大字/, '').replace(/[一二三四五六七八九十〇0-9０-９]+丁目$/, '') : s
const subLabel = (s) => {
  if (!s) return ''
  const m = s.match(/([一二三四五六七八九十〇0-9０-９]+丁目)$/)
  if (m) return m[1]
  if (s.startsWith('大字')) return '大字'
  return ''
}
const simplify = (f, tolerance) => {
  let s
  try { s = turf.simplify(f, { tolerance, highQuality: true, mutate: false }) } catch { s = f }
  if (!s.geometry || !s.geometry.coordinates.length) s = f
  return s
}
const labelPoint = (f) => {
  try { return turf.pointOnFeature(f).geometry.coordinates } catch { return turf.centroid(f).geometry.coordinates }
}
const writeJs = (file, varName, obj, header = '') => {
  fs.writeFileSync(`${OUT}/${file}`, `${header}window.${varName} = ${JSON.stringify(obj)};\n`, 'utf8')
  console.log(`  wrote ${file}  (${Math.round(fs.statSync(`${OUT}/${file}`).size/1024)} KB)`)
}

const tj = JSON.parse(fs.readFileSync(`r2ka${CITY}.topojson`, 'utf8'))
const town = topojson.feature(tj, tj.objects.town)
const land = town.features.filter(f => f.properties.HCODE !== 8154)

// ================= 大字境界 =================
console.log(`[1] 大字境界 ${CITY} ${land[0]?.properties.CITY_NAME}`)
const popByOaza = {}, setaiByOaza = {}
for (const f of land) {
  const o = normOaza(f.properties.S_NAME)
  f.properties.OAZA = o
  popByOaza[o] = (popByOaza[o]||0) + (f.properties.JINKO||0)
  setaiByOaza[o] = (setaiByOaza[o]||0) + (f.properties.SETAI||0)
}
const flat = turf.flatten(turf.featureCollection(land))
flat.features.forEach(f => { try { turf.cleanCoords(f, { mutate: true }) } catch {} })
let dissolved
try { dissolved = turf.dissolve(flat, { propertyName: 'OAZA' }) } catch (e) { console.log('  dissolve failed:', e.message); dissolved = flat }

const groups = {}
for (const f of dissolved.features) (groups[f.properties.OAZA] ||= []).push(f)
const combined = []
for (const [name, list] of Object.entries(groups)) {
  const polys = []
  for (const f of list) {
    if (f.geometry.type === 'Polygon') polys.push(f.geometry.coordinates)
    else if (f.geometry.type === 'MultiPolygon') polys.push(...f.geometry.coordinates)
  }
  if (polys.length) combined.push(turf.multiPolygon(polys, { name }))
}
console.log('  大字数:', combined.length)

const bb = combined.map(f => turf.bbox(f))
const overlap = (a, b) => !(a[2]<b[0]||b[2]<a[0]||a[3]<b[1]||b[3]<a[1])
const neighbors = combined.map(() => new Set())
for (let i = 0; i < combined.length; i++) {
  for (let j = i + 1; j < combined.length; j++) {
    if (!overlap(bb[i], bb[j])) continue
    let touch = false
    try { touch = turf.booleanIntersects(combined[i], combined[j]) } catch {}
    if (touch) { neighbors[i].add(combined[j].properties.name); neighbors[j].add(combined[i].properties.name) }
  }
}
const oaza = turf.featureCollection(combined.map((f, idx) => {
  const s = simplify(f, 0.00004)
  roundCoords(s.geometry, 5)
  const label = labelPoint(f)
  const name = f.properties.name
  s.properties = {
    name,
    pop: popByOaza[name]||0,
    setai: setaiByOaza[name]||0,
    cx: Math.round(label[0]*1e5)/1e5,
    cy: Math.round(label[1]*1e5)/1e5,
    neighbors: [...neighbors[idx]].sort((a, b) => a.localeCompare(b, 'ja')),
  }
  return s
}))

// ================= 学区（国土数値情報 A27/A32） =================
function processSchool(file, codeKey, nameKey, label) {
  const g = JSON.parse(fs.readFileSync(file, 'utf8'))
  const feats = g.features.filter(ft => String(ft.properties[codeKey]) === CITY).map(ft => {
    const s = simplify(ft, 0.00004)
    roundCoords(s.geometry, 5)
    const p = labelPoint(ft)
    s.properties = { name: ft.properties[nameKey], cx: Math.round(p[0]*1e5)/1e5, cy: Math.round(p[1]*1e5)/1e5 }
    return s
  })
  console.log(`  ${label}:`, feats.length, '区域')
  return turf.featureCollection(feats)
}
const elem = processSchool('A27/A27-23_08.geojson', 'A27_001', 'A27_004', '小学校区')
const jun = processSchool('A32/A32-23_08.geojson', 'A32_001', 'A32_004', '中学校区')
writeJs(`${PREFIX}-elementary.js`, 'ELEMENTARY_GEO', elem)
writeJs(`${PREFIX}-junior.js`, 'JUNIOR_GEO', jun)

// 各大字に学区を紐付け（ラベル点が入る学区）
const findSchool = (pt, fc) => {
  for (const f of fc.features) { try { if (turf.booleanPointInPolygon(pt, f)) return f.properties.name } catch {} }
  return ''
}
let okE = 0, okJ = 0
for (const f of oaza.features) {
  const pt = turf.point([f.properties.cx, f.properties.cy])
  f.properties.elem = findSchool(pt, elem)
  f.properties.junior = findSchool(pt, jun)
  if (f.properties.elem) okE++
  if (f.properties.junior) okJ++
}
console.log(`  学区紐付け 小:${okE}/${oaza.features.length} 中:${okJ}/${oaza.features.length}`)
writeJs(`${PREFIX}-oaza.js`, 'OAZA_GEO', oaza)

// ================= 丁目境界 =================
const chome = land.map(f => {
  const s = simplify(f, 0.00003)
  roundCoords(s.geometry, 5)
  s.properties = { oaza: normOaza(f.properties.S_NAME), sub: subLabel(f.properties.S_NAME), full: f.properties.S_NAME }
  return s
})
const cnt = {}
chome.forEach(f => cnt[f.properties.oaza] = (cnt[f.properties.oaza]||0) + 1)
writeJs(`${PREFIX}-chome.js`, 'CHOME_GEO', turf.featureCollection(chome.filter(f => cnt[f.properties.oaza] >= 2)))

// ================= 用途地域（国土数値情報 A29-19） =================
const yochiSrc = `A29/A29-19_08/01-03_GeoJSON形式/A29-19_${CITY}.geojson`
if (fs.existsSync(yochiSrc)) {
  const g = JSON.parse(fs.readFileSync(yochiSrc, 'utf8'))
  const feats = g.features.map(ft => {
    const s = simplify(ft, 0.00002)
    roundCoords(s.geometry, 5)
    s.properties = { z: ft.properties.A29_004, name: ft.properties.A29_005, kenpei: ft.properties.A29_006, yoseki: ft.properties.A29_007 }
    return s
  })
  writeJs(`${PREFIX}-yochi.js`, 'YOCHI_GEO', turf.featureCollection(feats))
  console.log('  用途種別:', [...new Set(feats.map(f => f.properties.name))].join(' / '))
} else {
  console.log('  A29 に用途地域なし:', yochiSrc)
}

// ================= 施設（OSM Overpass） =================
if (WITH_POI === 'poi') {
  const cityPoly = turf.combine(turf.flatten(topojson.feature(tj, tj.objects.city))).features[0]
  const [w, s, e, n] = turf.bbox(cityPoly)
  const BBOX = [s, w, n, e].map(v => v.toFixed(3)).join(',')
  const inCity = (lon, lat) => { try { return turf.booleanPointInPolygon(turf.point([lon, lat]), cityPoly) } catch { return false } }
  const cat = (t) => {
    if (t.railway === 'station') return 'station'
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
    return null
  }
  const q = `[out:json][timeout:120];
(
  node["railway"="station"](${BBOX});
  nwr["shop"~"^(supermarket|convenience|department_store|mall|wholesale|doityourself)$"](${BBOX});
  nwr["amenity"~"^(restaurant|fast_food|hospital|bank|post_office|library|townhall|prison|crematorium)$"](${BBOX});
  nwr["man_made"="works"]["name"](${BBOX});
  nwr["landuse"="industrial"]["name"](${BBOX});
  nwr["landuse"="cemetery"]["name"](${BBOX});
  nwr["amenity"="school"]["name"](${BBOX});
);
out center;`
  const sleep = (ms) => new Promise(r => setTimeout(r, ms))
  const EPS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
  let elements = null
  for (let attempt = 0; attempt < 6 && !elements; attempt++) {
    try {
      const r = await fetch(EPS[attempt % EPS.length], { signal: AbortSignal.timeout(150000), method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ibaraki-map/1.0' }, body: 'data=' + encodeURIComponent(q) })
      if (!r.ok) throw new Error('overpass ' + r.status)
      elements = (await r.json()).elements
    } catch (err) { console.log('  retry:', err.message); await sleep(8000) }
  }
  if (!elements) throw new Error('overpass failed')

  const seen = new Set(), pois = []
  const push = (c, name, lat, lon) => {
    const key = c + ':' + name + ':' + lat.toFixed(3)
    if (seen.has(key)) return
    seen.add(key)
    pois.push({ name, cat: c, lat: Math.round(lat*1e5)/1e5, lng: Math.round(lon*1e5)/1e5 })
  }
  for (const el of elements) {
    const t = el.tags || {}
    if (!t.name) continue
    const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon
    if (lat == null || lon == null || !inCity(lon, lat)) continue
    let name = t.name.replace(/\s*\(.*?\)\s*/g, '').trim()
    if (t.amenity === 'school') {
      if (/小学校|義務教育学校/.test(name)) push('school_e', name, lat, lon)
      if (/中学校|義務教育学校/.test(name)) push('school_j', name, lat, lon)
      continue
    }
    const c = cat(t)
    if (!c) continue
    if (c === 'station' && !name.endsWith('駅')) name += '駅'
    if (c === 'factory' && !/工場|製造|製作所|日立|酒造|醸造|工業団地/.test(name)) continue
    push(c, name, lat, lon)
  }
  pois.sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name, 'ja'))
  console.log('  施設:', JSON.stringify(pois.reduce((m, p) => (m[p.cat] = (m[p.cat]||0) + 1, m), {})))
  console.log('  駅:', pois.filter(p => p.cat === 'station').map(p => p.name).join(' / '))
  writeJs(`${PREFIX}-poi.js`, 'POI', pois, `// ${land[0]?.properties.CITY_NAME} 施設データ（編集可）\n`)
}
console.log('done.')
