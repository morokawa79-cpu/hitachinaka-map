# ビーイング 売却実績マップ（公開用）

- 公開URL：https://morokawa79-cpu.github.io/hitachinaka-map/being-jisseki/ （いえらぶブログ entry-875225 に iframe で埋め込み。ページ自体は noindex）
- このリポジトリには**公開用のデータだけ**を置く。価格・面積は約10%の幅（埋め込みデータは幅の中間値）、場所は約2km（実績2件以下の町は約4km）単位、町名まで。300万円以下は「300万円以下」。
- 正確な金額・面積・建物名・築年数などの元データは社内（\Landisk\…\ビーイングHP社内デモ\ブログ下書き\売却実績マップ\ と Codex の作業フォルダ）にだけ置く。ここには絶対に入れない。

## 更新の流れ
1. 社内の「売却実績_入力画面.html」で実績を追加し「CSVを保存」
2. tools/build-public.cjs で index.html を作り直す（Codex の public.html ＋ 追加分JSON）
3. tools/chk.cjs で、表示の幅が正確な値を含むことを全件確認
4. tools/blogbody.cjs でブログ本文を作り直し、いえらぶの entry-875225 を更新
