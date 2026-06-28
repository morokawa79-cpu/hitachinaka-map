// エリア指定 概括図 PDF → PNG 変換
// pdfjs-dist v6 + @napi-rs/canvas
import { createCanvas } from '@napi-rs/canvas'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'fs'
import path from 'path'

const PDF_PATH = 'erias-gaiyakuzu.pdf'
const OUT_PNG  = 'G:/マイドライブ/Claude/hitachinaka-map/data/mito-erias.png'
const SCALE = 1.5   // レンダリング解像度倍率（大きいほど高画質・重い）

const data = new Uint8Array(fs.readFileSync(PDF_PATH))
const doc = await pdfjsLib.getDocument({ data }).promise
console.log(`PDF: ${doc.numPages} pages`)

const page = await doc.getPage(1)
const vp = page.getViewport({ scale: SCALE })
console.log(`Page 1 viewport: ${vp.width.toFixed(0)} × ${vp.height.toFixed(0)} px (scale=${SCALE})`)
console.log(`  PDF units: ${vp.width/SCALE} × ${vp.height/SCALE} pt`)

const canvas = createCanvas(vp.width, vp.height)
const ctx = canvas.getContext('2d')
ctx.fillStyle = 'white'
ctx.fillRect(0, 0, vp.width, vp.height)

// pdfjs-dist canvasFactory
const canvasFactory = {
  create(w, h) { const c = createCanvas(w, h); return { canvas: c, context: c.getContext('2d') } },
  reset(p, w, h) { p.canvas.width = w; p.canvas.height = h },
  destroy(p) {}
}

await page.render({
  canvasContext: ctx,
  viewport: vp,
  canvasFactory
}).promise

const buf = canvas.toBuffer('image/png')
fs.writeFileSync(OUT_PNG, buf)
const kb = Math.round(buf.length / 1024)
console.log(`\nSaved: ${OUT_PNG} (${kb} KB)`)
console.log(`PNG size: ${canvas.width} × ${canvas.height}`)
