// 那珂市 用途地域（国土数値情報 A29-19）→ data/naka-yochi.js
import fs from 'fs'
import * as turf from '@turf/turf'

const OUT = 'G:/マイドライブ/Claude/hitachinaka-map/data'

let SRC = null
const candidates = [
  'A29/A29-19_08/01-03_GeoJSON形式/A29-19_08226.geojson',
  'A29/A29-19_08226.geojson',
  'A29/A29-19_08/A29-19_08226.geojson',
]
for (const c of candidates) {
  if (fs.existsSync(c)) { SRC = c; break }
}
if (!SRC) {
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return null
    for (const f of fs.readdirSync(dir)) {
      const p = `${dir}/${f}`
      if (fs.statSync(p).isDirectory()) { const r = walk(p); if (r) return r }
      if (f === 'A29-19_08226.geojson') return p
    }
    return null
  }
  SRC = walk('A29')
}
if (!SRC) throw new Error('A29-19_08226.geojson が見つかりません。A29/ フォルダを確認してください。')
console.log('SRC:', SRC)

const g = JSON.parse(fs.readFileSync(SRC,'utf8'))

const roundCoords = (geom, p=5) => {
  const f=10**p, r=(c)=>Array.isArray(c[0])?c.map(r):[Math.round(c[0]*f)/f,Math.round(c[1]*f)/f]
  geom.coordinates=r(geom.coordinates); return geom
}

const feats = g.features.map(ft => {
  let s
  try { s = turf.simplify(ft, {tolerance:0.00002, highQuality:true, mutate:false}) } catch { s = ft }
  if (!s.geometry || !s.geometry.coordinates.length) s = ft
  roundCoords(s.geometry, 5)
  s.properties = {
    z: ft.properties.A29_004,
    name: ft.properties.A29_005,
    kenpei: ft.properties.A29_006,
    yoseki: ft.properties.A29_007,
  }
  return s
})
fs.writeFileSync(`${OUT}/naka-yochi.js`, 'window.YOCHI_GEO = ' + JSON.stringify(turf.featureCollection(feats)) + ';\n', 'utf8')
const kb = Math.round(fs.statSync(`${OUT}/naka-yochi.js`).size/1024)
const types = [...new Set(feats.map(f=>f.properties.name))]
console.log(`naka-yochi.js: ${feats.length} 区域 (${kb} KB)`)
console.log('用途種別:', types.join(' / '))
