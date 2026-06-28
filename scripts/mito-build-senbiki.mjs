// 水戸市 市街化区域 / 市街化調整区域 境界（線引き）→ data/mito-senbiki.js
// 方針: A29(用途地域=市街化区域にのみ存在)を全結合 → 市街化区域
//       r2ka08201.topojson(市境界) - 市街化区域 → 市街化調整区域
// ※ turf v7: union/difference は (FeatureCollection) を受け取る
import fs from 'fs'
import * as turf from '@turf/turf'
import topojsonClient from 'topojson-client'

const OUT = 'G:/マイドライブ/Claude/hitachinaka-map/data'

// ---- A29: 用途地域ポリゴンを結合して市街化区域を得る ----
const a29 = JSON.parse(fs.readFileSync(
  'A29/A29-19_08/01-03_GeoJSON形式/A29-19_08201.geojson', 'utf8'))
console.log(`A29: ${a29.features.length} 用途地域 zones`)

// 各フィーチャを先に簡略化
const simplified = a29.features
  .filter(f => f.geometry)
  .map(f => {
    try { return turf.simplify(turf.feature(f.geometry, {}), { tolerance: 0.00015, highQuality: true }) }
    catch { return turf.feature(f.geometry, {}) }
  })
  .filter(f => f.geometry && f.geometry.coordinates && f.geometry.coordinates.length)
console.log(`  simplified: ${simplified.length} features`)

// turf v7: union(FeatureCollection)
process.stdout.write('  union all ... ')
let shigaika = turf.union(turf.featureCollection(simplified))
process.stdout.write('done\n')

shigaika = turf.simplify(shigaika, { tolerance: 0.0001, highQuality: true })
shigaika.properties = { type: '市街化区域' }

const [minLng, minLat, maxLng, maxLat] = turf.bbox(shigaika)
console.log(`市街化区域: done (bbox: lat ${minLat.toFixed(4)}–${maxLat.toFixed(4)}, lng ${minLng.toFixed(4)}–${maxLng.toFixed(4)})`)

// ---- 市境界: topojsonのmerge（全大字を1ポリゴンに）----
const topo = JSON.parse(fs.readFileSync('r2ka08201.topojson', 'utf8'))
const objKey = Object.keys(topo.objects)[0]
const cityGeom = topojsonClient.merge(topo, topo.objects[objKey].geometries)
let cityFeat = turf.simplify(turf.feature(cityGeom, {}), { tolerance: 0.0002, highQuality: true })
const [cMinLng, cMinLat, cMaxLng, cMaxLat] = turf.bbox(cityFeat)
console.log(`City boundary: done (bbox: lat ${cMinLat.toFixed(4)}–${cMaxLat.toFixed(4)}, lng ${cMinLng.toFixed(4)}–${cMaxLng.toFixed(4)})`)

// ---- 市街化調整区域 = 市境界 - 市街化区域 ----
// turf v7: difference(FeatureCollection) 最初のfeature - 残り全て
let choseika = null
try {
  process.stdout.write('  difference (city - 市街化区域) ... ')
  choseika = turf.difference(turf.featureCollection([cityFeat, shigaika]))
  process.stdout.write('done\n')
  if (choseika) {
    choseika = turf.simplify(choseika, { tolerance: 0.0001, highQuality: true })
    choseika.properties = { type: '市街化調整区域' }
    console.log('市街化調整区域: done')
  }
} catch (e) {
  console.error('difference error:', e.message)
}

// 座標を小数5桁に丸める
const round5 = (geom) => {
  const f = 1e5
  const r = c => Array.isArray(c[0]) ? c.map(r) : [Math.round(c[0]*f)/f, Math.round(c[1]*f)/f]
  geom.coordinates = r(geom.coordinates)
  return geom
}
;[shigaika, choseika].filter(Boolean).forEach(ft => round5(ft.geometry))

const features = [shigaika, choseika].filter(Boolean)
const out = 'window.SENBIKI_GEO = ' + JSON.stringify(turf.featureCollection(features)) + ';\n'
fs.writeFileSync(`${OUT}/mito-senbiki.js`, out, 'utf8')
const kb = Math.round(fs.statSync(`${OUT}/mito-senbiki.js`).size / 1024)
console.log(`\nmito-senbiki.js: ${features.length} features (${kb} KB)`)
console.log('types:', features.map(f => f.properties.type).join(', '))
