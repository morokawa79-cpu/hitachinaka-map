// 水戸市 丁目（町丁・字）境界 → data/mito-chome.js
import fs from 'fs'
import * as topojson from 'topojson-client'
import * as turf from '@turf/turf'

const OUT = 'G:/マイドライブ/Claude/hitachinaka-map/data'
const tj = JSON.parse(fs.readFileSync('r2ka08201.topojson','utf8'))
const town = topojson.feature(tj, tj.objects.town)

const normOaza = (s) => s ? s.replace(/^大字/, '').replace(/[一二三四五六七八九十〇0-9０-９]+丁目$/, '') : s
const subLabel = (s) => {
  if (!s) return ''
  const m = s.match(/([一二三四五六七八九十〇0-9０-９]+丁目)$/)
  if (m) return m[1]
  if (s.startsWith('大字')) return '大字'
  return ''
}
const roundCoords = (geom, p=5) => {
  const f=10**p, r=(c)=>Array.isArray(c[0])?c.map(r):[Math.round(c[0]*f)/f,Math.round(c[1]*f)/f]
  geom.coordinates=r(geom.coordinates); return geom
}

const feats = []
for (const f of town.features) {
  if (f.properties.HCODE === 8154) continue
  const sname = f.properties.S_NAME
  const oaza = normOaza(sname)
  let s
  try { s = turf.simplify(f, {tolerance:0.00003, highQuality:true, mutate:false}) } catch { s = f }
  if (!s.geometry || !s.geometry.coordinates.length) s = f
  roundCoords(s.geometry, 5)
  s.properties = { oaza, sub: subLabel(sname), full: sname }
  feats.push(s)
}
const cnt = {}
feats.forEach(f => cnt[f.properties.oaza] = (cnt[f.properties.oaza]||0)+1)
const kept = feats.filter(f => cnt[f.properties.oaza] >= 2)

fs.writeFileSync(`${OUT}/mito-chome.js`, 'window.CHOME_GEO = ' + JSON.stringify(turf.featureCollection(kept)) + ';\n', 'utf8')
const kb = Math.round(fs.statSync(`${OUT}/mito-chome.js`).size/1024)
console.log(`mito-chome.js: ${kept.length}/${feats.length} 区域 (${kb} KB), 丁目を持つ大字数: ${Object.values(cnt).filter(c=>c>=2).length}`)
