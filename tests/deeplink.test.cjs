const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const test = require('node:test')
const deepLink = require('../js/deeplink.js')

test('URLクエリから市・大字・座標を読み取る', () => {
  assert.deepEqual(
    deepLink.parse('?city=hitachinaka&oaza=%E4%B8%AD%E6%A0%B9&lat=36.38864&lng=140.55504'),
    {
      city: 'hitachinaka',
      oaza: '中根',
      coordinates: { lat: 36.38864, lng: 140.55504 },
    },
  )
})

test('未対応の市と不正・片側だけの座標を採用しない', () => {
  assert.deepEqual(
    deepLink.parse('?city=ibaraki&oaza=%E8%8F%85%E8%B0%B7&lat=91&lng=140.49'),
    { city: null, oaza: '菅谷', coordinates: null },
  )
  assert.equal(deepLink.parse('?lat=36.4').coordinates, null)
})

test('都市選択ページと別市ページからクエリを保持して正しい市へ転送する', () => {
  const search = '?city=mito&oaza=%E5%AE%AE%E7%94%BA&lat=36.3707&lng=140.4763'
  assert.equal(
    deepLink.cityRedirectUrl(search, null, '#map'),
    `mito.html${search}#map`,
  )
  assert.equal(
    deepLink.cityRedirectUrl(search, 'hitachinaka', ''),
    `mito.html${search}`,
  )
  assert.equal(deepLink.cityRedirectUrl(search, 'mito', ''), null)
})

test('現在の市をページ名から判定する', () => {
  assert.equal(deepLink.cityFromPath('/maps/mito.html'), 'mito')
  assert.equal(deepLink.cityFromPath('C:\\maps\\hitachinaka.html'), 'hitachinaka')
  assert.equal(deepLink.cityFromPath('/maps/naka.html'), 'naka')
  assert.equal(deepLink.cityFromPath('/maps/index.html'), null)
})

test('大字はUnicodeと前後空白を正規化して完全一致させる', () => {
  assert.equal(
    deepLink.findOazaName(['中根', '東石川'], '　中根　'),
    '中根',
  )
  assert.equal(
    deepLink.findOazaName(['阿字ケ浦町'], '阿字ケ浦町'),
    '阿字ケ浦町',
  )
  assert.equal(deepLink.findOazaName(['中根'], '中'), null)
})

test('大字一致を座標より優先し、不一致時だけ座標マーカーへフォールバックする', () => {
  assert.deepEqual(
    deepLink.resolveMapAction(
      '?oaza=%E4%B8%AD%E6%A0%B9&lat=36.1&lng=140.1',
      ['中根', '東石川'],
    ),
    { type: 'oaza', name: '中根', requestedOaza: '中根' },
  )
  assert.deepEqual(
    deepLink.resolveMapAction(
      '?oaza=%E6%9C%AA%E7%99%BB%E9%8C%B2&lat=36.38864&lng=140.55504',
      ['中根', '東石川'],
    ),
    {
      type: 'marker',
      lat: 36.38864,
      lng: 140.55504,
      requestedOaza: '未登録',
    },
  )
  assert.deepEqual(
    deepLink.resolveMapAction('?oaza=%E6%9C%AA%E7%99%BB%E9%8C%B2', ['中根']),
    { type: 'none', requestedOaza: '未登録' },
  )
})

test('3市ページが共通URL処理を地図初期化より先に読み込む', () => {
  const indexHtml = readFileSync('index.html', 'utf8')
  assert.match(indexHtml, /MapDeepLink\.cityRedirectUrl\(/)

  for (const page of ['mito.html', 'hitachinaka.html', 'naka.html']) {
    const html = readFileSync(page, 'utf8')
    assert.ok(
      html.indexOf('js/deeplink.js') < html.indexOf('js/app.js'),
      `${page}のdeeplink.js読込順`,
    )
  }
  const appSource = readFileSync('js/app.js', 'utf8')
  assert.match(appSource, /action\.type === 'oaza'[\s\S]*?selectOaza\(action\.name\)/)
  assert.match(appSource, /action\.type !== 'marker'[\s\S]*?L\.marker\(point\)/)
})
