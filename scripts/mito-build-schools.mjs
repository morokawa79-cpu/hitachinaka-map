// 水戸市 学区ポリゴンを通学区域一覧(市公式)から自作 → mito-elementary.js / mito-junior.js
// 国土数値情報A27/A32に水戸市が無いため、町丁→学校の対応表で census 町丁を割り当てて dissolve する。
import fs from 'fs'
import * as topojson from 'topojson-client'
import * as turf from '@turf/turf'

const OUT = 'G:/マイドライブ/Claude/hitachinaka-map/data'

// ===== 通学区域データ（水戸市公式 学区検索より。小学校ページに親中学校も明記）=====
// towns: 算用数字の丁目はそのまま記載（コードで漢数字に正規化して census とマッチ）。
// 丁目なし=大字全域。競合する丁目/大字は配列の「前にある学校」が優先（その大字を冠する学校を前に置く）。
const SCHOOLS = [
  { elem:'浜田小',     jun:'第三中', towns:['浜田1丁目','浜田2丁目','浜田町','白梅2丁目','白梅3丁目','白梅4丁目','城南2丁目','城南3丁目','東台1丁目','本町1丁目','本町2丁目','本町3丁目','柳町1丁目','柳町2丁目','朝日町','瓦谷','紺屋町','渋井町','東桜川','藤柄町','宮内町','元台町','谷田町','吉田町'] },
  { elem:'石川小',     jun:'石川中', towns:['赤塚1丁目','赤塚2丁目','石川1丁目','石川2丁目','石川3丁目','石川4丁目','石川町','東赤塚'] },
  { elem:'千波小',     jun:'千波中', towns:['千波町','白梅','城南','中央','米沢町'] },
  { elem:'城東小',     jun:'第三中', towns:['城東1丁目','城東2丁目','城東3丁目','城東4丁目','城東5丁目','柵町2丁目','柵町3丁目','東台2丁目','若宮1丁目','若宮2丁目','若宮町'] },
  { elem:'三の丸小',   jun:'第二中', towns:['泉町1丁目','大町1丁目','大町2丁目','大町3丁目','柵町1丁目','桜川1丁目','桜川2丁目','三の丸1丁目','三の丸2丁目','三の丸3丁目','根本1丁目','梅香1丁目','梅香2丁目','南町1丁目','南町2丁目','南町3丁目','宮町1丁目','宮町2丁目','宮町3丁目','北見町','水府町','下梅香'] },
  { elem:'新荘小',     jun:'第一中', towns:['栄町1丁目','栄町2丁目','新荘1丁目','新荘2丁目','新荘3丁目','末広町1丁目','末広町2丁目','末広町3丁目','大工町1丁目','大工町2丁目','大工町3丁目','常磐町1丁目','常磐町2丁目','緑町1丁目','緑町2丁目','元山町1丁目','元山町2丁目','天王町','八幡町','松本'] },
  { elem:'常磐小',     jun:'第一中', towns:['上水戸1丁目','上水戸2丁目','上水戸3丁目','上水戸4丁目','ちとせ1丁目','ちとせ2丁目','西原1丁目','西原2丁目','西原3丁目','袴塚1丁目','袴塚2丁目','東原1丁目','東原2丁目','東原3丁目','文京1丁目','松が丘1丁目','松が丘2丁目','緑町3丁目','曙町','愛宕町','自由が丘','松本町'] },
  { elem:'五軒小',     jun:'第二中', towns:['泉町','大町','金町','五軒町','栄町','大工町','ちとせ','天王町','常磐町','根本','八幡町','梅香','備前町','南町'] },
  { elem:'渡里小',     jun:'第五中', towns:['文京2丁目','田野町','堀町','渡里町'] },
  { elem:'堀原小',     jun:'第五中', towns:['新原1丁目','新原2丁目','袴塚3丁目'] },
  { elem:'河和田小',   jun:'赤塚中', towns:['河和田1丁目','萱場町','河和田町'] },
  { elem:'赤塚小',     jun:'赤塚中', towns:['河和田2丁目','河和田3丁目'] },
  { elem:'見川小',     jun:'見川中', towns:['見川1丁目','見川2丁目','見川3丁目','見川4丁目','見川5丁目'] },
  { elem:'梅が丘小',   jun:'見川中', towns:['姫子1丁目','姫子2丁目','見和1丁目','見和2丁目','見和3丁目'] },
  { elem:'緑岡小',     jun:'緑岡中', towns:['小吹町','見川町'] },
  { elem:'双葉台小',   jun:'双葉台中', towns:['双葉台1丁目','双葉台2丁目','双葉台3丁目','双葉台4丁目','双葉台5丁目','中丸町','開江町','木葉下町','全隈町','谷津町'] },
  { elem:'上中妻小',   jun:'赤塚中', towns:['飯島町','大塚町','加倉井町','金谷町'] },
  { elem:'飯富小',     jun:'飯富中', towns:['飯富町','岩根町','成沢町','藤井町','藤が原'] },
  { elem:'上大野小',   jun:'第三中', towns:['圷大野','中大野','西大野','東大野','吉沼町'] },
  { elem:'柳河小',     jun:'第一中', towns:['青柳町','上河内町','中河内町','柳河町'] },
  { elem:'寿小',       jun:'笠原中', towns:['平須町'] },
  { elem:'笠原小',     jun:'笠原中', towns:['笠原町','東野町'] },
  { elem:'酒門小',     jun:'第四中', towns:['けやき台1丁目','けやき台2丁目','けやき台3丁目','酒門町','元石川町'] },
  { elem:'吉田小',     jun:'第四中', towns:['元吉田町','住吉町'] },
  { elem:'吉沢小',     jun:'第四中', towns:['吉沢町'] },
  { elem:'稲荷第一小', jun:'常澄中', towns:['東前1丁目','東前2丁目','東前3丁目','東前町','大串町','島田町'] },
  { elem:'稲荷第二小', jun:'常澄中', towns:['栗崎町','百合が丘町','六反田町'] },
  { elem:'下大野小',   jun:'常澄中', towns:['川又町','小泉町','塩崎町','下大野町','平戸町'] },
  { elem:'大場小',     jun:'常澄中', towns:['秋成町','大場町','下入野町','森戸町'] },
  { elem:'鯉淵小',     jun:'内原中', towns:['鯉淵町','五平町','高田町','下野町','小林町'] },
  { elem:'妻里小',     jun:'内原中', towns:['中原町','杉崎町','三湯町','小原町','大足町','有賀町','黒磯町','牛伏町','田島町','三野輪町','筑地町','赤尾関町'] },
  { elem:'内原小',     jun:'内原中', towns:['内原1丁目','内原2丁目','内原町'] },
  // 義務教育学校（小中一貫）。北部の国田地区。
  { elem:'国田義務教育学校', jun:'国田義務教育学校', towns:['上国井町','下国井町','田谷町'] },
  // 0人の飛び地・小字（隣接学区に寄せる）
  { elem:'吉田小',     jun:'第四中', towns:['吉田'] },
  { elem:'五軒小',     jun:'第二中', towns:['根本町'] },
]

// ===== 算用数字の丁目 → 漢数字（census形式）へ正規化 =====
const KANJI = ['','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五']
const toCensus = (s) => s.replace(/(\d+)丁目$/, (_, n) => (KANJI[Number(n)] || n) + '丁目')

// chome(丁目)マップ と oaza(大字)マップ を構築（先に出た学校が優先＝上書きしない）
const chomeMap = {}, oazaMap = {}
for (const sc of SCHOOLS) {
  for (const t of sc.towns) {
    const key = toCensus(t)
    if (/丁目$/.test(key)) { if (!(key in chomeMap)) chomeMap[key] = sc }
    else { if (!(key in oazaMap)) oazaMap[key] = sc }
  }
}

const stripChome = (s) => s.replace(/[一二三四五六七八九十〇0-9０-９]+丁目$/, '')

// ===== census 町丁を読み込み学校を割り当て =====
const tj = JSON.parse(fs.readFileSync('r2ka08201.topojson','utf8'))
const town = topojson.feature(tj, tj.objects.town)
const land = town.features.filter(f => f.properties.HCODE !== 8154)

const assign = (sname) => {
  if (sname in chomeMap) return chomeMap[sname]            // 丁目で完全一致
  const o = stripChome(sname)
  if (o in oazaMap) return oazaMap[o]                      // 大字全域でフォールバック
  if (sname in oazaMap) return oazaMap[sname]              // 念のため
  return null
}

const unmatched = []
for (const f of land) {
  const sc = assign(f.properties.S_NAME)
  if (sc) { f.properties._elem = sc.elem; f.properties._jun = sc.jun }
  else { unmatched.push(f.properties.S_NAME) }
}
console.log('割当済:', land.filter(f=>f.properties._elem).length, '/', land.length)
if (unmatched.length) console.log('未割当(' + unmatched.length + '):', [...new Set(unmatched)].join(', '))

// ===== 学校別に dissolve して書き出し =====
const roundCoords = (geom, p=5) => {
  const f=10**p, r=(c)=>Array.isArray(c[0])?c.map(r):[Math.round(c[0]*f)/f,Math.round(c[1]*f)/f]
  geom.coordinates=r(geom.coordinates); return geom
}
function buildDistricts(propKey, varName, outFile, label) {
  const feats = land.filter(f => f.properties[propKey])
  const flat = turf.flatten(turf.featureCollection(feats.map(f => turf.feature(f.geometry, { K: f.properties[propKey] }))))
  flat.features.forEach(f => { try { turf.cleanCoords(f, {mutate:true}) } catch {} })
  let dissolved
  try { dissolved = turf.dissolve(flat, { propertyName: 'K' }) }
  catch(e){ console.log('  dissolve失敗',e.message); dissolved = flat }
  // 同名を MultiPolygon に統合
  const groups = {}
  for (const f of dissolved.features) (groups[f.properties.K] = groups[f.properties.K]||[]).push(f)
  const out = []
  for (const [name, arr] of Object.entries(groups)) {
    const polys = []
    for (const f of arr) {
      if (f.geometry.type==='Polygon') polys.push(f.geometry.coordinates)
      else if (f.geometry.type==='MultiPolygon') polys.push(...f.geometry.coordinates)
    }
    if (!polys.length) continue
    let mp = turf.multiPolygon(polys, { name })
    try { mp = turf.simplify(mp, {tolerance:0.00004, highQuality:true, mutate:false}) } catch {}
    if (!mp.geometry || !mp.geometry.coordinates.length) mp = turf.multiPolygon(polys, { name })
    roundCoords(mp.geometry, 5)
    let lbl
    try { lbl = turf.pointOnFeature(turf.multiPolygon(polys)).geometry.coordinates } catch { lbl = turf.centroid(turf.multiPolygon(polys)).geometry.coordinates }
    mp.properties = { name, cx: Math.round(lbl[0]*1e5)/1e5, cy: Math.round(lbl[1]*1e5)/1e5 }
    out.push(mp)
  }
  fs.writeFileSync(`${OUT}/${outFile}`, `window.${varName} = ${JSON.stringify(turf.featureCollection(out))};\n`, 'utf8')
  const kb = Math.round(fs.statSync(`${OUT}/${outFile}`).size/1024)
  console.log(`  ${label}: ${out.length}校区 (${kb} KB) →`, out.map(f=>f.properties.name).join(' '))
}
buildDistricts('_elem','ELEMENTARY_GEO','mito-elementary.js','小学校区')
buildDistricts('_jun','JUNIOR_GEO','mito-junior.js','中学校区')
console.log('done.')
