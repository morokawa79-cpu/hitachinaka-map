// naka.html を雛形に、茨城県の市町村ごとのマップHTMLを作る。
// 都市ナビは市町村が多いのでプルダウンにし、都市選択画面（index.html）も作り直す。
// 水戸市・ひたちなか市は独自の作りのページなので、ナビだけ差し替える。
import fs from 'fs'

// 改行コードが CRLF のコピー（git の autocrlf）でも置き換えられるよう、LF にそろえて読む
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

const DIR = 'G:/マイドライブ/Claude/hitachinaka-map'
// [key, 名前, 地区検索の例]（査定書工房の data/ibarakiCities.ts と同じ順・同じ key）
const CITIES = [
  ['mito', '水戸市'], ['hitachi', '日立市', '助川町'], ['tsuchiura', '土浦市', '大和町'], ['koga', '古河市', '本町'],
  ['ishioka', '石岡市', '府中'], ['yuki', '結城市', '結城'], ['ryugasaki', '龍ケ崎市', '佐貫町'], ['shimotsuma', '下妻市', '下妻乙'],
  ['joso', '常総市', '水海道'], ['hitachiota', '常陸太田市', '山下町'], ['takahagi', '高萩市', '本町'], ['kitaibaraki', '北茨城市', '磯原町'],
  ['kasama', '笠間市', '友部'], ['toride', '取手市', '新町'], ['ushiku', '牛久市', '中央'], ['tsukuba', 'つくば市', '竹園'],
  ['hitachinaka', 'ひたちなか市'], ['kashima', '鹿嶋市', '宮中'], ['itako', '潮来市', '潮来'], ['moriya', '守谷市', '中央'],
  ['hitachiomiya', '常陸大宮市', '中富町'], ['naka', '那珂市'], ['chikusei', '筑西市', '丙'], ['bando', '坂東市', '岩井'],
  ['inashiki', '稲敷市', '江戸崎'], ['kasumigaura', 'かすみがうら市', '稲吉'], ['sakuragawa', '桜川市', '岩瀬'], ['kamisu', '神栖市', '大野原'],
  ['namegata', '行方市', '麻生'], ['hokota', '鉾田市', '鉾田'], ['tsukubamirai', 'つくばみらい市', '紫峰ヶ丘'], ['omitama', '小美玉市', '堅倉'],
  ['ibarakimachi', '茨城町', '小鶴'], ['oarai', '大洗町', '磯浜町'], ['shirosato', '城里町', '石塚'], ['tokai', '東海村', '舟石川'],
  ['daigo', '大子町', '大子'], ['miho', '美浦村', '受領'], ['ami', '阿見町', '阿見'], ['kawachi', '河内町', '源清田'],
  ['yachiyo', '八千代町', '菅谷'], ['goka', '五霞町', '小福田'], ['sakai', '境町', '旭町'], ['tone', '利根町', '布川'],
].map(([key, name, example]) => ({ key, name, example, file: `${key}.html` }))
const TEMPLATE_KEYS = new Set(['mito', 'hitachinaka', 'naka'])

const dataFile = (key, kind) => key === 'hitachinaka' ? `${kind}.js` : `${key}-${kind}.js`
const hasData = (key, kind) => fs.existsSync(`${DIR}/data/${dataFile(key, kind)}`)
const available = CITIES.filter(c => hasData(c.key, 'oaza'))

const navFor = (current) => [
  '<div class="city-nav-switch">',
  '            <select class="city-nav-select" aria-label="市町村を切り替え" onchange="location.href=this.value">',
  ...available.map(c => `              <option value="${c.file}"${c.name === current ? ' selected' : ''}>${c.name}</option>`),
  '            </select>',
  '          </div>',
].join('\n')
const NAV_RE = /<div class="city-nav-switch">[\s\S]*?<\/div>/

const template = read(`${DIR}/naka.html`)
for (const city of available.filter(c => !TEMPLATE_KEYS.has(c.key))) {
  const t = read(`${DIR}/data/${dataFile(city.key, 'oaza')}`)
  const oaza = JSON.parse(t.slice(t.indexOf('=') + 1).replace(/;\s*$/, ''))
  const xs = oaza.features.map(f => f.properties.cx), ys = oaza.features.map(f => f.properties.cy)
  const center = [((Math.min(...ys) + Math.max(...ys)) / 2).toFixed(3), ((Math.min(...xs) + Math.max(...xs)) / 2).toFixed(3)]
  let html = template
    .replaceAll('那珂市', city.name)
    .replace('例：菅谷', `例：${city.example}`)
    .replace(/center: \[[^\]]+\]/, `center: [${center.join(', ')}]`)
  // データの無い種類（用途地域が無い町村、施設をまだ取っていない市町村など）は空のデータを入れる。
  // js/app.js は YOCHI_GEO・POI などがある前提で書かれているため
  const EMPTY = {
    oaza: 'window.OAZA_GEO = { type: "FeatureCollection", features: [] }',
    chome: 'window.CHOME_GEO = { type: "FeatureCollection", features: [] }',
    yochi: 'window.YOCHI_GEO = { type: "FeatureCollection", features: [] }',
    elementary: 'window.ELEMENTARY_GEO = { type: "FeatureCollection", features: [] }',
    junior: 'window.JUNIOR_GEO = { type: "FeatureCollection", features: [] }',
    poi: 'window.POI = []',
  }
  for (const kind of Object.keys(EMPTY)) {
    const tag = `  <script src="data/naka-${kind}.js"></script>\n`
    html = html.replace(tag, hasData(city.key, kind)
      ? tag.replace('naka-', `${city.key}-`)
      : `  <script>${EMPTY[kind]}</script>\n`)
  }
  if (html.includes('data/naka-') || html.includes('那珂市')) console.log('WARN 置き換え残り:', city.file)
  fs.writeFileSync(`${DIR}/${city.file}`, html, 'utf8')
}
for (const city of available) {
  const p = `${DIR}/${city.file}`
  if (!fs.existsSync(p)) continue
  const html = read(p)
  if (!NAV_RE.test(html)) { console.log('nav not found:', city.file); continue }
  fs.writeFileSync(p, html.replace(NAV_RE, navFor(city.name)), 'utf8')
}
console.log('pages:', available.length, '/ missing data:', CITIES.filter(c => !hasData(c.key, 'oaza')).map(c => c.name).join(' '))

// 都市選択画面のカードを作り直す
let index = read(`${DIR}/index.html`)
const indexBefore = index
const cards = available.map(c => `      <a href="${c.file}" class="city-card">
        <span class="city-name">${c.name}</span>
        <span class="city-sub">大字 / 用途地域<br>学区 / 施設</span>
      </a>`).join('\n')
index = index.replace(/<div class="cities">[\s\S]*?\n    <\/div>\n    <div class="credit">/,
  `<div class="cities">\n${cards}\n    </div>\n    <div class="credit">`)
index = index.replace(/\.city-card \{[\s\S]*?\}/, `.city-card {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      width: 150px; padding: 18px 12px; border-radius: 12px;
      background: #1f2933; border: 2px solid #2d3946;
      text-decoration: none; color: #e6e9ed;
      transition: border-color .18s;
      cursor: pointer;
    }`)
index = index.replace(/\.city-card:hover \{[^}]*\}/, '.city-card:hover { border-color: #16a34a; }')
index = index.replace(/\.cities \{[^}]*\}/, '.cities { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; max-width: 1000px; }')
index = index.replace(/\.city-name \{[^}]*\}/, '.city-name { font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 4px; }')
if (!available.every(c => index.includes(`href="${c.file}"`))) console.log('WARN index.html にカードを入れられませんでした')
if (index === indexBefore) console.log('WARN index.html は変わっていません')
fs.writeFileSync(`${DIR}/index.html`, index, 'utf8')

// プルダウンの見た目
const cssPath = `${DIR}/css/style.css`
const css = read(cssPath)
if (!css.includes('.city-nav-select')) {
  const nextCss = css.replace(
    /(\.city-nav-link:hover \{[^}]*\}\n)/,
    `$1.city-nav-select { font-size: 12px; color: #fff; background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.4); border-radius: 10px; padding: 2px 6px; }\n.city-nav-select option { color: #111; }\n`,
  )
  if (nextCss === css) console.log('WARN style.css にプルダウンの見た目を入れられませんでした')
  fs.writeFileSync(cssPath, nextCss, 'utf8')
}
console.log('index.html / style.css updated')
