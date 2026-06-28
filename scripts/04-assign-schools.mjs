import fs from 'fs'
import * as turf from '@turf/turf'

const DIR = 'G:/マイドライブ/Claude/hitachinaka-map/data'
const load = (file, varName) => {
  const t = fs.readFileSync(`${DIR}/${file}`, 'utf8')
  const i = t.indexOf('=')
  return JSON.parse(t.slice(i+1).replace(/;\s*$/, ''))
}
const oaza = load('oaza.js')
const elem = load('elementary.js')
const jun  = load('junior.js')

const findSchool = (pt, fc) => {
  for (const f of fc.features) {
    try { if (turf.booleanPointInPolygon(pt, f)) return f.properties.name } catch {}
  }
  return null
}

let okE = 0, okJ = 0
for (const f of oaza.features) {
  const pt = turf.point([f.properties.cx, f.properties.cy])
  const e = findSchool(pt, elem)
  const j = findSchool(pt, jun)
  if (e) okE++; if (j) okJ++
  f.properties.elem = e || ''
  f.properties.junior = j || ''
}
console.log(`小学校区 紐付け: ${okE}/${oaza.features.length}, 中学校区: ${okJ}/${oaza.features.length}`)
fs.writeFileSync(`${DIR}/oaza.js`, 'window.OAZA_GEO = ' + JSON.stringify(oaza) + ';\n', 'utf8')
console.log('oaza.js updated')
// sample
oaza.features.slice(0,6).forEach(f=>console.log(' ',f.properties.name,'→ 小:'+f.properties.elem,'中:'+f.properties.junior))
