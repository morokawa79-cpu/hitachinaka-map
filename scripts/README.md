# データ再生成の手順

`data/*.js`（大字境界・学区・施設）を作り直すための手順です。
通常は再生成不要（生成済みデータが `../data/` にあります）。年度更新などで作り直す時だけ使います。

## 必要なもの
- Node.js
- 作業フォルダ（どこでも可。例: `C:\hitachinaka-build`）

## 手順
作業フォルダ内で順に実行します（スクリプトはこの `scripts/` からコピーして使用）。

```powershell
# 1. 元データのダウンロード（大字境界・小中学区・用途地域）
powershell -File 01-download.ps1

# 2. 処理用パッケージ
npm install topojson-client @turf/turf

# 3. 大字境界（丁目→大字に統合・隣接判定・人口集計）→ ../data/oaza.js
node 02-process.mjs

# 4. 各大字に小中学校区を紐付け → ../data/oaza.js を更新
node 04-assign-schools.mjs

# 5. 丁目境界（大字クリックで薄線表示する用）→ ../data/chome.js
node 05-build-chome.mjs

# 6. 用途地域（建ぺい率・容積率付き）→ ../data/yochi.js
node 06-build-yochi.mjs

# 7. 駅・スーパー・商業・コンビニ・飲食・病院・金融・公共・工場・嫌悪施設・学校点（OSM Overpass）→ ../data/poi.js
node 03-build-poi.mjs
```

> 各スクリプトの出力先 `OUT` は `G:/マイドライブ/Claude/hitachinaka-map/data` を直接指しています。
> 別の場所で動かす場合は各 `.mjs` 冒頭の `OUT`/`DIR` を書き換えてください。

## 水戸市（mito-*.js）の再生成
作業フォルダ例: `C:\mito-build`。スクリプトは `mito-*` を使う（市コード=08201）。

```powershell
powershell -File mito-download.ps1            # 元データDL（r2ka08201.topojson, A27/A32/A29）
npm install topojson-client @turf/turf
node mito-process.mjs        # 大字境界＋隣接＋人口 → ../data/mito-oaza.js（A27/A32は水戸市分が無いので学区は空で出る）
node mito-build-schools.mjs  # ★学区を自作 → ../data/mito-elementary.js / mito-junior.js
node mito-assign-schools.mjs # 各大字に学区を紐付け（mito-build-schools の後に実行）→ mito-oaza.js 更新
node mito-build-chome.mjs    # 丁目境界 → ../data/mito-chome.js
node mito-build-yochi.mjs    # 用途地域 → ../data/mito-yochi.js
node mito-build-poi.mjs      # 施設・学校点 → ../data/mito-poi.js
node mito-build-senbiki.mjs  # 市街化調整区域（線引き）→ ../data/mito-senbiki.js
# エリア指定概括図（PDF→PNG）
npm install pdfjs-dist @napi-rs/canvas
curl -L -o erias-gaiyakuzu.pdf "https://www.city.mito.lg.jp/uploaded/attachment/29857.pdf"
node mito-pdf2png.mjs        # erias-gaiyakuzu.pdf → ../data/mito-erias.png
```

> **線引きデータ(mito-senbiki.js)の生成方法:** A29(用途地域)が市街化区域にのみ存在することを利用し、A29の全ポリゴンをunionして市街化区域を算出。r2ka08201.topojson(市境界)との差分で市街化調整区域を得る（turf v7の`union(FeatureCollection)`API使用）。

> **エリア指定概括図:** 水戸市公式PDF（縮尺1:65,000・A3横判）をNode.js/pdfjs-distでPNG変換し、Leaflet imageOverlayで半透明表示。
> bounds は mito.html の `CITY_CONFIG.eriasOverlay.bounds = [[36.3025, 140.3125], [36.4765, 140.6175]]`。
> 導出方法: 縮尺1:65,000・A3(420mm)・1786pxから 15.29m/px（=0.0001708°lng/px, 0.0001378°lat/px）を算出（画像全体のスケール）。
> 位置オフセットは制御点（千波湖=画像px(820,755)↔実座標36.3725,140.4525）で合わせた。再調整時はこの1点を測り直して平行移動すればよい。正確な区域は水戸市建築指導課で確認。

> **重要:** 国土数値情報 A27（小学校区）/ A32（中学校区）には**水戸市（08201）が収録されていない**。
> そのため水戸市の学区は `mito-build-schools.mjs` 内に持つ「町丁→学校」対応表（水戸市公式『学区検索』通学区域より作成）から
> census 町丁を割り当てて dissolve し、ポリゴンを自作している。通学区域が変わったら同スクリプトの `SCHOOLS` 配列を更新する。
> 中央部の大字は丁目ごとに学校が違うため、丁目で完全一致→無ければ大字全域でフォールバック、の順で割当（配列の前の学校が優先）。

## 那珂市（naka-*.js）の再生成
作業フォルダ例: `C:\mito-build`（水戸ビルドと共用可。A27/A32/A29は流用）。市コード=08226。

```powershell
npm install topojson-client @turf/turf
# topojsonのDL（A27/A32/A29は C:\mito-build に既存のものを流用）
curl -L -o r2ka08226.topojson "https://geoshape.ex.nii.ac.jp/ka/topojson/2020/08/r2ka08226.topojson"
node naka-process.mjs        # 大字境界＋学区（国データに那珂市あり）→ naka-oaza.js / naka-elementary.js / naka-junior.js
node naka-assign-schools.mjs # 学区を大字に紐付け → naka-oaza.js 更新
node naka-build-chome.mjs    # 丁目境界 → naka-chome.js
node naka-build-yochi.mjs    # 用途地域 → naka-yochi.js
node naka-build-poi.mjs      # 施設・学校点（BBOX: 36.38,140.40,36.55,140.58）→ naka-poi.js
```

> **注:** 那珂市は国土数値情報 A27/A32 に**収録あり**（水戸市と異なり学区の自作不要）。
> topojson の URL は `https://geoshape.ex.nii.ac.jp/ka/topojson/2020/08/r2ka{コード}.topojson`（r2ka の直 URL は 404 になるので注意）。

## データ仕様
- `oaza.js` … `window.OAZA_GEO`。properties: `name`/`pop`/`setai`/`cx,cy`（ラベル）/`neighbors`（隣接大字配列）/`elem`（小学校区）/`junior`（中学校区）
- `chome.js` … `window.CHOME_GEO`（丁目境界）。properties: `oaza`（親大字）/`sub`（丁目表記）/`full`（正式名）。丁目を持つ大字のみ
- `elementary.js` … `window.ELEMENTARY_GEO`（小学校区。properties.name=学校名）
- `junior.js` … `window.JUNIOR_GEO`（中学校区）
- `yochi.js` … `window.YOCHI_GEO`（用途地域）。properties: `z`（コード1-12）/`name`（用途名）/`kenpei`（建ぺい率%）/`yoseki`（容積率%）
- `poi.js` … `window.POI`（`{name, cat, lat, lng}` の配列）。
  cat=station/supermarket/shopping/homecenter/conveni/restaurant/hospital/finance/public/factory/nuisance/school_e/school_j/landmark

## 出典
- 大字・丁目境界: 総務省 令和2年国勢調査 町丁・字等別境界データ（NII Geoshape 経由）
- 用途地域: 国土交通省 国土数値情報 A29（2019年）
- 小学校区: 国土交通省 国土数値情報 A27（2023年）／ 中学校区: A32（2023年）
- 施設・学校点: © OpenStreetMap contributors
- 背景地図: 国土地理院タイル
