/* ひたちなか市 不動産マップ
 * 大字の区切り線 / 丁目（クリックで表示）/ 用途地域 / 小中学区 / 学校・施設点 を
 * 地理院タイル上に表示。データは data/*.js。
 */

;(function initializeMapApp() {
// ===== 地図 =====
const _cfg = window.CITY_CONFIG || {}
const _deepLink = window.MapDeepLink
const _currentCity = _deepLink?.cityFromPath(window.location.pathname)
const _cityRedirectUrl = _deepLink?.cityRedirectUrl(
  window.location.search,
  _currentCity,
  window.location.hash,
)
if (_cityRedirectUrl) {
  window.location.replace(_cityRedirectUrl)
  return
}
const map = L.map('map', { zoomControl: true }).setView(_cfg.center || [36.39, 140.55], _cfg.zoom || 12)
const GSI = 'https://cyberjapandata.gsi.go.jp/xyz'
const attr = "<a href='https://maps.gsi.go.jp/development/ichiran.html'>国土地理院</a> | © OpenStreetMap"
const bases = {
  pale:  L.tileLayer(`${GSI}/pale/{z}/{x}/{y}.png`,  { attribution: attr, maxZoom: 18 }),
  std:   L.tileLayer(`${GSI}/std/{z}/{x}/{y}.png`,   { attribution: attr, maxZoom: 18 }),
  photo: L.tileLayer(`${GSI}/seamlessphoto/{z}/{x}/{y}.jpg`, { attribution: attr, maxZoom: 18 }),
}
let currentBase = bases.pale.addTo(map)
document.getElementById('baseSeg').addEventListener('click', (e) => {
  const btn = e.target.closest('button'); if (!btn) return
  document.querySelectorAll('#baseSeg button').forEach(b => b.classList.remove('active'))
  btn.classList.add('active')
  map.removeLayer(currentBase)
  currentBase = bases[btn.dataset.base].addTo(map)
  currentBase.bringToBack()
})

// ===== 用途地域 =====
// コード(1-12) → 色・名称（都市計画図に準じた配色）
const YOCHI = {
  1:  ['#6abf6a', '第一種低層住居専用'],
  2:  ['#a6d96a', '第二種低層住居専用'],
  3:  ['#c7e9b4', '第一種中高層住居専用'],
  4:  ['#dcefc4', '第二種中高層住居専用'],
  5:  ['#fff39a', '第一種住居'],
  6:  ['#ffe79a', '第二種住居'],
  7:  ['#ffd27f', '準住居'],
  8:  ['#f4a988', '近隣商業'],
  9:  ['#ef8a8a', '商業'],
  10: ['#c9a7de', '準工業'],
  11: ['#9fc2e6', '工業'],
  12: ['#6fa8dc', '工業専用'],
}
let yochiOpacity = 0.45
const yochiEnabled = new Set(Object.keys(YOCHI).map(Number))
const yochiStyle = (f) => {
  const z = f.properties.z
  const on = yochiEnabled.has(z)
  return { color: '#888', weight: 0.5, fillColor: (YOCHI[z]?.[0] || '#ccc'),
           fillOpacity: on ? yochiOpacity : 0, opacity: on ? 0.5 : 0 }
}
const yochiLayer = L.geoJSON(YOCHI_GEO, {
  style: yochiStyle,
  onEachFeature: (f, layer) => {
    const p = f.properties
    layer.bindPopup(`<b>${p.name}地域</b><br>建ぺい率 ${p.kenpei}％ ／ 容積率 ${p.yoseki}％`)
  }
})
// 凡例（種別ごとにON/OFF）
const legend = document.getElementById('yochiLegend')
Object.entries(YOCHI).forEach(([z, [color, name]]) => {
  const row = document.createElement('label')
  row.className = 'leg-row'
  row.innerHTML = `<input type="checkbox" data-z="${z}" checked><span class="leg-color" style="background:${color}"></span>${name}`
  legend.appendChild(row)
})
legend.addEventListener('change', (e) => {
  const z = Number(e.target.dataset.z); if (!z) return
  if (e.target.checked) yochiEnabled.add(z); else yochiEnabled.delete(z)
  yochiLayer.setStyle(yochiStyle)
})
document.getElementById('yochiOpacity').addEventListener('input', (e) => {
  yochiOpacity = Number(e.target.value) / 100
  yochiLayer.setStyle(yochiStyle)
})

// ===== 大字レイヤー =====
const oazaStyle = { color: '#e8590c', weight: 1.6, fillColor: '#ff922b', fillOpacity: 0.05 }
const oazaSelStyle = { color: '#c92a2a', weight: 3.5, fillColor: '#ff922b', fillOpacity: 0.18 }
const oazaByName = {}
let selectedLayer = null

const oazaLayer = L.geoJSON(OAZA_GEO, {
  style: oazaStyle,
  onEachFeature: (feat, layer) => {
    const name = feat.properties.name
    oazaByName[name] = layer
    layer.on('click', () => selectOaza(name))
    layer.on('mouseover', () => { if (layer !== selectedLayer) layer.setStyle({ fillOpacity: 0.16 }) })
    layer.on('mouseout',  () => { if (layer !== selectedLayer) oazaLayer.resetStyle(layer) })
  }
}).addTo(map)

// 地名ラベル（ズーム13以上で表示）
const labelLayer = L.layerGroup()
OAZA_GEO.features.forEach(f => {
  const p = f.properties
  L.marker([p.cy, p.cx], { interactive: false, icon: L.divIcon({ className: 'oaza-label', html: p.name, iconSize: [0, 0] }) }).addTo(labelLayer)
})
labelLayer.addTo(map)
function updateLabelVisibility() {
  const show = document.getElementById('tg-label').checked && map.getZoom() >= 13
  if (show && !map.hasLayer(labelLayer)) labelLayer.addTo(map)
  else if (!show && map.hasLayer(labelLayer)) map.removeLayer(labelLayer)
}
map.on('zoomend', updateLabelVisibility)
map.fitBounds(oazaLayer.getBounds(), { padding: [10, 10] })

// ===== 丁目（クリックした大字だけ薄線表示）=====
let chomeLayer = null
function showChome(oazaName) {
  if (chomeLayer) { map.removeLayer(chomeLayer); chomeLayer = null }
  const feats = CHOME_GEO.features.filter(f => f.properties.oaza === oazaName)
  if (!feats.length) return
  const group = L.layerGroup()
  L.geoJSON({ type: 'FeatureCollection', features: feats }, {
    style: { color: '#444', weight: 1, opacity: 0.75, dashArray: '3,3', fill: false },
    onEachFeature: (f, layer) => {
      if (f.properties.sub) {
        const c = layer.getBounds().getCenter()
        L.marker(c, { interactive: false, icon: L.divIcon({ className: 'chome-label', html: f.properties.sub, iconSize: [0, 0] }) }).addTo(group)
      }
    }
  }).addTo(group)
  chomeLayer = group.addTo(map)
}

// ===== 学区 =====
function schoolDistrict(geo, color, cls) {
  return L.geoJSON(geo, {
    style: { color, weight: 2, fill: false, dashArray: '5,4' },
    onEachFeature: (f, layer) => layer.bindTooltip(f.properties.name, { permanent: true, direction: 'center', className: `school-label ${cls}` })
  })
}
const elemLayer = schoolDistrict(ELEMENTARY_GEO, '#1c7ed6', 'elem')
const junLayer  = schoolDistrict(JUNIOR_GEO, '#2f9e44', 'jun')

// ===== 施設（点）=====
// cat → [色, グリフ, 表示名, 既定ON]
const CAT = {
  station:    ['#e03131', '🚉', '駅', true],
  supermarket:['#2f9e44', '🛒', 'スーパー', true],
  shopping:   ['#e8590c', '🏬', '商業施設', true],
  homecenter: ['#a9743c', '🔨', 'ホームセンター', false],
  conveni:    ['#0ca678', '🏪', 'コンビニ', false],
  restaurant: ['#e64980', '🍴', '飲食店', false],
  hospital:   ['#d6336c', '＋', '病院', false],
  finance:    ['#3b5bdb', '¥', '銀行・郵便局', false],
  public:     ['#1098ad', '🏛', '公共施設', false],
  factory:    ['#495057', '🏭', '工場', false],
  nuisance:   ['#212529', '⚠', '嫌悪施設', false],
  school_e:   ['#1c7ed6', '小', '小学校', false],
  school_j:   ['#2f9e44', '中', '中学校', false],
  landmark:   ['#9c36b5', '★', 'ランドマーク', true],
}
const poiLayers = {}
for (const [cat, [color, glyph]] of Object.entries(CAT)) {
  const g = L.layerGroup()
  POI.filter(p => p.cat === cat).forEach(p => {
    L.marker([p.lat, p.lng], {
      icon: L.divIcon({ className: '', html: `<div class="poi" style="background:${color}">${glyph}</div>`, iconSize: [20, 20], iconAnchor: [10, 10] })
    }).bindTooltip(p.name, { direction: 'top', offset: [0, -8] }).addTo(g)
  })
  poiLayers[cat] = g
}

// ===== トグルUI生成（施設）=====
const poiGrid = document.getElementById('poiGrid')
for (const [cat, [color, glyph, label, on]] of Object.entries(CAT)) {
  const count = POI.filter(p => p.cat === cat).length
  const el = document.createElement('label')
  el.className = 'poi-toggle'
  el.innerHTML = `<input type="checkbox" data-cat="${cat}" ${on ? 'checked' : ''}>
    <span class="poi-dot" style="background:${color}">${glyph}</span>
    <span class="poi-name">${label}</span><span class="poi-cnt">${count}</span>`
  poiGrid.appendChild(el)
  if (on) poiLayers[cat].addTo(map)
}
poiGrid.addEventListener('change', (e) => {
  const cat = e.target.dataset.cat; if (!cat) return
  if (e.target.checked) poiLayers[cat].addTo(map); else map.removeLayer(poiLayers[cat])
})

// ===== 面レイヤートグル =====
const bindLayer = (id, layer) => document.getElementById(id).addEventListener('change', (e) => {
  if (e.target.checked) layer.addTo(map); else map.removeLayer(layer)
})
bindLayer('tg-oaza', oazaLayer)
bindLayer('tg-elem', elemLayer)
bindLayer('tg-jun', junLayer)
document.getElementById('tg-label').addEventListener('change', updateLabelVisibility)
document.getElementById('tg-yochi').addEventListener('change', (e) => {
  document.getElementById('yochiCtrl').hidden = !e.target.checked
  if (e.target.checked) { yochiLayer.addTo(map); yochiLayer.bringToBack(); currentBase.bringToBack() }
  else map.removeLayer(yochiLayer)
})
updateLabelVisibility()

// ===== 地区選択 =====
function selectOaza(name) {
  const layer = oazaByName[name]; if (!layer) return
  if (selectedLayer) oazaLayer.resetStyle(selectedLayer)
  selectedLayer = layer
  layer.setStyle(oazaSelStyle); layer.bringToFront()
  map.fitBounds(layer.getBounds(), { maxZoom: 15, padding: [60, 60] })
  showChome(name)
  showInfo(layer.feature.properties)
}
function showInfo(p) {
  document.getElementById('infoPanel').hidden = false
  document.getElementById('infoName').textContent = p.name
  document.getElementById('infoMeta').textContent = `人口 ${p.pop.toLocaleString()}人 ／ ${p.setai.toLocaleString()}世帯`
  document.getElementById('infoSchool').innerHTML =
    (p.elem ? `<span class="badge badge-elem">小</span>${p.elem}　` : '') +
    (p.junior ? `<span class="badge badge-jun">中</span>${p.junior}` : '')
  const nb = document.getElementById('infoNeighbors'); nb.innerHTML = ''
  ;(p.neighbors || []).forEach(n => {
    const c = document.createElement('span'); c.className = 'chip'; c.textContent = n
    c.addEventListener('click', () => selectOaza(n)); nb.appendChild(c)
  })
}
document.getElementById('infoClose').addEventListener('click', () => {
  document.getElementById('infoPanel').hidden = true
  if (selectedLayer) { oazaLayer.resetStyle(selectedLayer); selectedLayer = null }
  if (chomeLayer) { map.removeLayer(chomeLayer); chomeLayer = null }
})

// ===== 検索 =====
const dl = document.getElementById('oazaList')
Object.keys(oazaByName).sort((a, b) => a.localeCompare(b, 'ja')).forEach(n => {
  const o = document.createElement('option'); o.value = n; dl.appendChild(o)
})
function doSearch() {
  const v = document.getElementById('oazaSearch').value.trim()
  if (oazaByName[v]) return selectOaza(v)
  const hit = Object.keys(oazaByName).find(n => n.includes(v))
  if (hit) selectOaza(hit); else alert('該当する地区が見つかりません：' + v)
}
document.getElementById('oazaSearchBtn').addEventListener('click', doSearch)
document.getElementById('oazaSearch').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch() })

// ===== URL連携 =====
function applyMapDeepLink() {
  if (!_deepLink) return
  const action = _deepLink.resolveMapAction(
    window.location.search,
    Object.keys(oazaByName),
  )
  const searchInput = document.getElementById('oazaSearch')
  if (action.requestedOaza) searchInput.value = action.requestedOaza
  if (action.type === 'oaza') {
    selectOaza(action.name)
    return
  }
  if (action.type !== 'marker') return

  const point = [action.lat, action.lng]
  L.marker(point)
    .addTo(map)
    .bindTooltip('指定地点', { direction: 'top', offset: [0, -8] })
    .openTooltip()
  map.setView(point, _cfg.deepLinkZoom || 16)
}
applyMapDeepLink()

// ===== 線引き（市街化調整区域）: SENBIKI_GEO が存在する市のみ =====
if (window.SENBIKI_GEO) {
  // 市街化調整区域 = 橙填充、市街化区域 = 青枠線のみ
  const SENBIKI_STYLE = {
    '市街化調整区域': { color: '#e67700', weight: 0.5, fillColor: '#fd7e14', fillOpacity: 0.22 },
    '市街化区域':     { color: '#1971c2', weight: 1.5, fill: false },
  }
  const senbikiLayer = L.geoJSON(SENBIKI_GEO, {
    style: f => SENBIKI_STYLE[f.properties.type] || { color: '#888', weight: 1, fill: false },
    onEachFeature: (f, layer) => layer.bindPopup(`<b>${f.properties.type}</b>`)
  })
  const tgSenbiki = document.getElementById('tg-senbiki')
  if (tgSenbiki) {
    document.getElementById('tg-senbiki-wrap').hidden = false
    tgSenbiki.addEventListener('change', (e) => {
      if (e.target.checked) { senbikiLayer.addTo(map); senbikiLayer.bringToBack(); currentBase.bringToBack() }
      else map.removeLayer(senbikiLayer)
    })
  }
}

// ===== サイドバー開閉 =====
document.getElementById('sidebarToggle').addEventListener('click', () =>
  document.getElementById('sidebar').classList.toggle('collapsed'))
})()
