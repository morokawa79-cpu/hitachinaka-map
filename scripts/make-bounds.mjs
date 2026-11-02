// data/*-oaza.js から市町村ごとの範囲（西・南・東・北）を作り、査定書工房の ibarakiCityBounds.ts に書く
import fs from 'fs'

const DATA = 'G:/マイドライブ/Claude/hitachinaka-map/data'
const OUT = 'G:/マイドライブ/Claude/satei-studio-0.5.7-adjustment-price-ui/src/renderer/src/data/ibarakiCityBounds.ts'

const bounds = {}
for (const file of fs.readdirSync(DATA).filter(f => /^(?:[a-z]+-)?oaza\.js$/.test(f)).sort()) {
  const key = file === 'oaza.js' ? 'hitachinaka' : file.replace(/-oaza\.js$/, '')
  const text = fs.readFileSync(`${DATA}/${file}`, 'utf8')
  const geo = JSON.parse(text.slice(text.indexOf('=') + 1).replace(/;\s*$/, ''))
  let w = 180, s = 90, e = -180, n = -90
  const walk = (c) => {
    if (typeof c[0] === 'number') { w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); return }
    c.forEach(walk)
  }
  geo.features.forEach(f => walk(f.geometry.coordinates))
  bounds[key] = [w, s, e, n].map(v => Math.round(v * 1000) / 1000)
}

const lines = Object.entries(bounds).map(([k, b]) => `  ${k}: [${b.join(', ')}],`)
fs.writeFileSync(OUT, `// 自動生成（hitachinaka-map/scripts/make-bounds.mjs）。市町村ごとの範囲 [西, 南, 東, 北]
export const IBARAKI_CITY_BOUNDS: Readonly<Record<string, readonly [number, number, number, number]>> = {
${lines.join('\n')}
}
`, 'utf8')
console.log(Object.keys(bounds).length, 'cities')
