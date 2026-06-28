import fs from 'fs'
import * as topojson from 'topojson-client'
import * as turf from '@turf/turf'

const OUT = 'G:/マイドライブ/Claude/hitachinaka-map/data'
const CITY = '08201'

const roundCoords = (geom, p = 5) => {
  const f = 10 ** p
  const r = (c) => Array.isArray(c[0]) ? c.map(r) : [Math.round(c[0]*f)/f, Math.round(c[1]*f)/f]
  geom.coordinates = r(geom.coordinates)
  return geom
}
const normOaza = (s) => {
  if (!s) return s
  let n = s.replace(/^大字/, '')
  n = n.replace(/[一二三四五六七八九十〇0-9０-９]+丁目$/, '')
  return n
}
const writeJs = (file, varName, obj) => {
  fs.writeFileSync(`${OUT}/${file}`, `window.${varName} = ${JSON.stringify(obj)};\n`, 'utf8')
  const kb = Math.round(fs.statSync(`${OUT}/${file}`).size/1024)
  console.log(`  wrote ${file}  (${kb} KB)`)
}

// ================= 大字境界 =================
console.log('[1] 大字境界 処理中...')
const tj = JSON.parse(fs.readFileSync('r2ka08201.topojson','utf8'))
const town = topojson.feature(tj, tj.objects.town)

const land = town.features.filter(f => f.properties.HCODE !== 8154)
const popByOaza = {}, setaiByOaza = {}
for (const f of land) {
  const o = normOaza(f.properties.S_NAME)
  f.properties.OAZA = o
  popByOaza[o] = (popByOaza[o]||0) + (f.properties.JINKO||0)
  setaiByOaza[o] = (setaiByOaza[o]||0) + (f.properties.SETAI||0)
}

const flat = turf.flatten(turf.featureCollection(land))
flat.features.forEach(f => { try { turf.cleanCoords(f, {mutate:true}) } catch {} })
let dissolved
try {
  dissolved = turf.dissolve(flat, { propertyName: 'OAZA' })
  console.log('  dissolve OK:', dissolved.features.length, 'pieces')
} catch (e) {
  console.log('  dissolve failed, fallback:', e.message)
  dissolved = flat
}

const groups = {}
for (const f of dissolved.features) {
  const n = f.properties.OAZA
  ;(groups[n] = groups[n] || []).push(f)
}
const combined = []
for (const [name, fs2] of Object.entries(groups)) {
  const polys = []
  for (const f of fs2) {
    const g = f.geometry
    if (g.type === 'Polygon') polys.push(g.coordinates)
    else if (g.type === 'MultiPolygon') polys.push(...g.coordinates)
  }
  if (!polys.length) continue
  combined.push(turf.multiPolygon(polys, { name }))
}
console.log('  大字数:', combined.length)

const bb = combined.map(f => turf.bbox(f))
const overlap = (a,b) => !(a[2]<b[0]||b[2]<a[0]||a[3]<b[1]||b[3]<a[1])
const neighbors = combined.map(() => new Set())
for (let i=0;i<combined.length;i++){
  for (let j=i+1;j<combined.length;j++){
    if(!overlap(bb[i],bb[j])) continue
    let touch=false
    try { touch = turf.booleanIntersects(combined[i], combined[j]) } catch {}
    if(touch){
      neighbors[i].add(combined[j].properties.name)
      neighbors[j].add(combined[i].properties.name)
    }
  }
}

const oazaFeatures = combined.map((f,idx) => {
  let s
  try { s = turf.simplify(f, {tolerance:0.00004, highQuality:true, mutate:false}) }
  catch { s = f }
  if(!s.geometry || !s.geometry.coordinates.length) s = f
  roundCoords(s.geometry, 5)
  let label
  try { label = turf.pointOnFeature(f).geometry.coordinates } catch { label = turf.centroid(f).geometry.coordinates }
  const name = f.properties.name
  s.properties = {
    name,
    pop: popByOaza[name]||0,
    setai: setaiByOaza[name]||0,
    cx: Math.round(label[0]*1e5)/1e5,
    cy: Math.round(label[1]*1e5)/1e5,
    neighbors: [...neighbors[idx]].sort((a,b)=>a.localeCompare(b,'ja'))
  }
  return s
})
writeJs('mito-oaza.js','OAZA_GEO', turf.featureCollection(oazaFeatures))

// ================= 学区 =================
function processSchool(file, codeKey, nameKey, label, varName, outFile){
  console.log(`[*] ${label} 処理中...`)
  const g = JSON.parse(fs.readFileSync(file,'utf8'))
  const hit = g.features.filter(ft => String(ft.properties[codeKey]) === CITY)
  const feats = hit.map(ft => {
    let s
    try { s = turf.simplify(ft, {tolerance:0.00004, highQuality:true, mutate:false}) } catch { s = ft }
    if(!s.geometry || !s.geometry.coordinates.length) s = ft
    roundCoords(s.geometry,5)
    let label2
    try { label2 = turf.pointOnFeature(ft).geometry.coordinates } catch { label2 = turf.centroid(ft).geometry.coordinates }
    s.properties = {
      name: ft.properties[nameKey],
      cx: Math.round(label2[0]*1e5)/1e5,
      cy: Math.round(label2[1]*1e5)/1e5
    }
    return s
  })
  console.log(`  ${label}:`, feats.length, '区域')
  writeJs(outFile, varName, turf.featureCollection(feats))
}
processSchool('A27/A27-23_08.geojson','A27_001','A27_004','小学校区','ELEMENTARY_GEO','mito-elementary.js')
processSchool('A32/A32-23_08.geojson','A32_001','A32_004','中学校区','JUNIOR_GEO','mito-junior.js')

console.log('done.')
