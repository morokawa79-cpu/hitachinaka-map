// Town-level screening only. No parcel boundaries or price adjustments.
// Active projects: Hitachinaka City; town references: NTA R8 table (pages below).
export const READJUSTMENT_CHECKED_AT='2026-09-17';
export const READJUSTMENT_SOURCES={
  active:'https://www.city.hitachinaka.lg.jp/machizukuri/kukakuseiri/1002500/index.html',
  towns:'https://www.rosenka.nta.go.jp/main_r08/kanto/ibaraki/ratios/pdf/c16203rt.pdf',
  mutsuno:'https://www.city.hitachinaka.lg.jp/machizukuri/kukakuseiri/1002500/1002552.html'
};
export const READJUSTMENT_TOWNS=[
  {name:'阿字ケ浦町',projects:['阿字ヶ浦'],ntaPage:1},
  {name:'高野',projects:['佐和駅東'],ntaPage:4},
  {name:'高場',projects:['佐和駅東','六ッ野'],ntaPage:6,citySource:'mutsuno'},
  {name:'武田',projects:['武田'],ntaPage:6},
  {name:'中根',projects:['東部第1','六ッ野'],ntaPage:8,citySource:'mutsuno'},
  {name:'東石川',projects:['六ッ野'],ntaPage:9,citySource:'mutsuno'},
  {name:'はしかべ',projects:['六ッ野'],citySource:'mutsuno',note:'市の施行地区一覧に、はしかべ1丁目の一部を記載。入力は丁目をまとめた町名単位。'},
  {name:'東本町',projects:['船窪'],ntaPage:10},
  {name:'富士ノ上',projects:['船窪'],ntaPage:10},
  {name:'富士ノ下',projects:['船窪'],ntaPage:10},
  {name:'船窪',projects:['船窪'],ntaPage:10},
  {name:'馬渡',projects:['東部第2'],ntaPage:11},
  {name:'廻り目',projects:['船窪'],ntaPage:11},
  {name:'湊泉町',projects:['船窪'],ntaPage:12},
  {name:'狢谷津',projects:['船窪'],ntaPage:12}
];
// Call with the resolved town name, not a raw address. A missing match is NOT
// evidence that the property lies outside a project. Sources need periodic review.
export function readjustmentTown(town){
  const name=String(town??'').normalize('NFKC').replace(/[ヶヵ]/g,'ケ');
  return READJUSTMENT_TOWNS.find(item=>item.name===name)??null;
}
export function propertyWarnings(zone,town){
  const readjustment=readjustmentTown(town)
    ?'<p data-warning="readjustment"><strong><span aria-hidden="true">⚠</span> 区画整理区域を含む町名です</strong><br>区域内では事業の進行により価格が大きく変わります。詳しくは個別査定をご相談ください。<a class="caution-consult" href="https://www.beingfudousan.com/satei/" target="_blank" rel="noopener noreferrer">無料で詳しく相談する ↗</a></p>'
    :'';
  const zoneNote=zone==='control'
    ?'<strong>市街化調整区域</strong><br>建築・再建築の条件で価格が変わります。個別査定をご相談ください。'
    :zone==='unknown'
      ?'<strong>市街化区域・調整区域が不明な方へ</strong><br>調整区域かどうかで価格が変わります。区域の確認と個別査定をご相談ください。'
      :'';
  if(!readjustment&&!zoneNote)return '';
  return `<aside class="property-caution" aria-label="査定額の注意事項">${readjustment}${zoneNote?`<p data-warning="zone">${zoneNote}</p>`:''}</aside>`;
}
