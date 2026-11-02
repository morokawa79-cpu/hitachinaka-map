// 茨城県の残り市町村の地図データを一括生成
// 使い方: node build-all.mjs nopoi … 境界・用途地域・学区だけ（oaza がある市町村は飛ばす。速い）
//         node build-all.mjs       … 施設（poi）まで（poi がある市町村は飛ばす）
import fs from 'fs'
import { spawnSync } from 'child_process'

const DATA = 'G:/マイドライブ/Claude/hitachinaka-map/data'
const CITIES = [
  '08202 hitachi', '08203 tsuchiura', '08204 koga', '08207 yuki', '08208 ryugasaki',
  '08210 shimotsuma', '08211 joso', '08212 hitachiota', '08214 takahagi', '08215 kitaibaraki',
  '08217 toride', '08219 ushiku', '08220 tsukuba', '08222 kashima', '08223 itako',
  '08224 moriya', '08225 hitachiomiya', '08227 chikusei', '08228 bando', '08229 inashiki',
  '08230 kasumigaura', '08231 sakuragawa', '08232 kamisu', '08233 namegata', '08234 hokota',
  '08235 tsukubamirai', '08236 omitama', '08309 oarai', '08310 shirosato', '08341 tokai',
  '08364 daigo', '08442 miho', '08443 ami', '08447 kawachi', '08521 yachiyo',
  '08542 goka', '08546 sakai', '08564 tone',
]
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const withPoi = process.argv[2] !== 'nopoi'

for (const entry of CITIES) {
  const [code, prefix] = entry.split(' ')
  const doneFile = `${DATA}/${prefix}-${withPoi ? 'poi' : 'oaza'}.js`
  if (fs.existsSync(doneFile)) { console.log('skip', prefix); continue }
  const topo = `r2ka${code}.topojson`
  for (let i = 0; i < 10 && !fs.existsSync(topo); i++) {
    try {
      const r = await fetch(`https://geoshape.ex.nii.ac.jp/ka/topojson/2020/08/${topo}`, { signal: AbortSignal.timeout(60000) })
      if (!r.ok) throw new Error(String(r.status))
      fs.writeFileSync(topo, Buffer.from(await r.arrayBuffer()))
    } catch (e) { console.log('  download retry', code, e.message); await sleep(15000) }
  }
  if (!fs.existsSync(topo)) { console.log('FAIL download', code, prefix); continue }
  const args = ['city-build.mjs', code, prefix, ...(withPoi ? ['poi'] : [])]
  const run = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 15 * 60 * 1000 })
  console.log(`${prefix} | ${(run.stdout || '').trim().replace(/\n/g, `\n${prefix} | `)}`)
  if (run.status !== 0) console.log(`FAIL build ${prefix}: ${(run.stderr || '').split('\n').slice(0, 3).join(' / ')}`)
  if (withPoi) await sleep(5000)
}
console.log('ALL DONE')
