# ひたちなか市マップ 元データのダウンロード
# 実行例: powershell -File 01-download.ps1
# ダウンロード先は作業フォルダ（このスクリプトと同じ場所）。
$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36"

# 1) 大字（町丁・字等）境界 TopoJSON … NII Geoshape（総務省 令和2年国勢調査）
Invoke-WebRequest -UserAgent $ua -OutFile "r2ka08221.topojson" `
  -Uri "https://geoshape.ex.nii.ac.jp/ka/topojson/2020/08/r2ka08221.topojson"

# 2) 小学校区 A27（茨城県=08, 2023年）… 国土数値情報
Invoke-WebRequest -UserAgent $ua -OutFile "A27.zip" `
  -Uri "https://nlftp.mlit.go.jp/ksj/gml/data/A27/A27-23/A27-23_08_GML.zip"
Expand-Archive "A27.zip" "A27" -Force

# 3) 中学校区 A32（茨城県=08, 2023年）… 国土数値情報
Invoke-WebRequest -UserAgent $ua -OutFile "A32.zip" `
  -Uri "https://nlftp.mlit.go.jp/ksj/gml/data/A32/A32-23/A32-23_08_GML.zip"
Expand-Archive "A32.zip" "A32" -Force

# 4) 用途地域 A29（茨城県=08, 2019年。市区町村別GeoJSON同梱）… 国土数値情報
Invoke-WebRequest -UserAgent $ua -OutFile "A29.zip" `
  -Uri "https://nlftp.mlit.go.jp/ksj/gml/data/A29/A29-19/A29-19_08_GML.zip"
Expand-Archive "A29.zip" "A29" -Force

Write-Host "ダウンロード完了。次に: npm install topojson-client @turf/turf"
Write-Host "その後: node 02-process.mjs / 04-assign-schools.mjs / 05-build-chome.mjs / 06-build-yochi.mjs / 03-build-poi.mjs"
