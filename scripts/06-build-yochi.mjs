// 用途地域（国土数値情報 A29-19 ひたちなか市）→ yochi.js
import fs from 'fs'
import * as turf from '@turf/turf'

const OUT = 'G:/マイドライブ/Claude/hitachinaka-map/data'
const SRC = 'A29/A29-19_08/01-03_GeoJSON形式/A29-19_08221.geojson'
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
    z: ft.properties.A29_004,        // 用途地域コード(1-12)
    name: ft.properties.A29_005,     // 用途地域名
    kenpei: ft.properties.A29_006,   // 建ぺい率(%)
    yoseki: ft.properties.A29_007,   // 容積率(%)
  }
  return s
})
fs.writeFileSync(`${OUT}/yochi.js`, 'window.YOCHI_GEO = ' + JSON.stringify(turf.featureCollection(feats)) + ';\n', 'utf8')
const kb = Math.round(fs.statSync(`${OUT}/yochi.js`).size/1024)
const types = [...new Set(feats.map(f=>f.properties.name))]
console.log(`yochi.js: ${feats.length} 区域 (${kb} KB)`)
console.log('用途種別:', types.join(' / '))
