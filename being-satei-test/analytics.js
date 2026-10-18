// Googleアナリティクス（ビーイングHPと同じプロパティ）。入力した町名・面積・査定額は送らない。
(()=>{
  const ID='G-PHWT2NZXSV';
  const embedded=new URLSearchParams(location.search).get('embed')==='1';
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  gtag('js',new Date());
  // iframe内でも計測できるよう、Cookieをサードパーティ扱いでも送れる設定にする。
  gtag('config',ID,{cookie_flags:'SameSite=None;Secure',allow_google_signals:false,allow_ad_personalization_signals:false,page_title:embedded?'かんたん査定（ブログ埋め込み）':'かんたん査定（単独ページ）'});
  const script=document.createElement('script');script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${ID}`;document.head.append(script);
  window.beingTrack=(name,params={})=>{try{gtag('event',name,{...params,embedded});}catch{}};
  // 電話・フォーム・LINEのどれを、画面のどこで押したかを記録する。
  const method=a=>a.href.startsWith('tel:')?'tel':a.href.includes('/satei/')?'form':a.href.includes('lin.ee')?'line':null;
  const placement=a=>a.closest('.result-actions')?'result':a.closest('#result')?'result_other':a.closest('.form-panel')?'form':a.closest('.site-header')?'header':a.closest('.consultation')?'consultation':a.closest('.brand-footer')?'footer':'other';
  document.addEventListener('click',event=>{
    const a=event.target.closest?.('a[href]');if(!a)return;
    const m=method(a);if(m)window.beingTrack('kantan_contact',{contact_method:m,placement:placement(a)});
  },true);
})();
