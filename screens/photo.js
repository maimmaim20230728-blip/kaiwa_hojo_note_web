'use strict';
/* 画面: ひと・しゃしん (v0.1 本実装)
   ・この写真辞書は本アプリで最重要の画面。中身はこのファイルの中だけで完結させる(並行実装の衝突回避)。
   ・SPEC_V1: カテゴリ(ひと/ばしょ/たべもの/すること/ほしいもの)ごとに、
     📷カメラ＋アルバムの両方から取り込み → アプリ内トリミング
     (正方形枠に指ドラッグpan＋やじるし＋スライダーズーム=ピンチ不使用・256px正方形JPEG)
     → 端末内 kaiwa.dict.v1 に保存。カード=写真＋自由記入ラベル(家族代筆可)。
     カードタップで拡大表示し、せっていの「よみあげ」がONのときだけ名前を読み上げ(既定OFF)。
     追加/なまえ変更/けす は作成モードのときだけ。本人使用モードでは見せるだけ。
     写真枚数は無制限(端末容量しだい・容量オーバーは通知して取消)。
   ・約束: 触ってよいのはこのファイルだけ。CSSは css-photo に1回だけ注入(接頭辞 photo-)。
     文言は必ず api.T('screen.photo.*') 経由。操作は Tap.bind(click禁止)。単純タップのみ。
     トリミングの位置合わせは「やじるしボタン」でも動かせる(ドラッグを必須にしない=片麻痺配慮)。 */
(function(){

  var LS_DICT = 'kaiwa.dict.v1';                                   // 自分のデータキー(端末内のみ・外部送信なし)
  var CATS = ['people','places','food','activities','wants'];      // タブ(内部キー)
  var TAB_ICON = { people:'👥', places:'📍', food:'🍽️', activities:'🚶', wants:'🙋' }; // 文字なし表示でも意味が残るよう絵を必ず併記
  var CROP_V = 300, CROP_OUT = 256;                               // トリミング枠(内部px)/書き出しpx
  var NUDGE = 40;                                                  // やじるし1回の移動量(内部px)

  /* せっていの言語(将来12言語)→ 読み上げ用ロケール。未対応の値はそのまま渡す */
  var TTS_LANG = {
    ja:'ja-JP', en:'en-US', de:'de-DE', fr:'fr-FR', es:'es-ES', it:'it-IT',
    pt:'pt-PT', nl:'nl-NL', sv:'sv-SE', ko:'ko-KR', zh:'zh-CN', ar:'ar-SA'
  };

  /* ---- 小さなヘルパ ---- */
  function tapBind(el, fn, opts){
    var T = (typeof window !== 'undefined' && window.Tap) ? window.Tap
          : (typeof Tap !== 'undefined' ? Tap : null);            // tap.js の Tap を使う(clickは使わない)
    if(T && T.bind) T.bind(el, fn, opts);
  }
  function elc(tag, cls, txt){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(txt != null) e.textContent = txt;
    return e;
  }

  /* ---- 保存(端末内のみ) ---- */
  function loadDict(){
    try{ var s = localStorage.getItem(LS_DICT); var a = s ? JSON.parse(s) : []; return Array.isArray(a) ? a : []; }
    catch(_){ return []; }
  }
  function saveDict(list){
    try{ localStorage.setItem(LS_DICT, JSON.stringify(list)); return true; }
    catch(_){ return false; }                                     // 容量オーバー等は false(呼び出し側で通知して取消)
  }
  function nextId(list){
    var m = 0;
    list.forEach(function(c){ var n = parseInt(String(c && c.id).slice(1), 10); if(n > m) m = n; });
    return 'p' + (m + 1);
  }

  /* ---- 読み上げ(TTS・せっていONのときだけ) ---- */
  /* Play版(Capacitor)のWebViewはWeb Speech API非対応の端末が多い→端末内蔵TTSへ橋渡し */
  var NATIVE_TTS = (function(){
    try{
      var c = window.Capacitor;
      if(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform() &&
         typeof c.registerPlugin === 'function'){ return c.registerPlugin('TextToSpeech'); }
    }catch(_){}
    return null;
  })();
  function speak(text, lang){
    if(!text) return;
    var tag = TTS_LANG[lang] || lang || 'ja-JP';
    if(NATIVE_TTS){
      try{
        NATIVE_TTS.stop().catch(function(){}).then(function(){
          NATIVE_TTS.speak({ text: String(text), lang: String(tag), rate: 1, pitch: 1.0, volume: 1.0 }).catch(function(){});
        });
      }catch(_){}
      return;
    }
    if(typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try{
      var synth = window.speechSynthesis; synth.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.lang = tag;
      /* 🔴端末の既定音声(例:日本語)のままだと対象言語で読まれない対策=対象言語に合う音声を明示選択。
         getVoices()が空(未ロード)の時は従来どおり u.lang のみで読む(例外は出さない)。 */
      try{
        var vs = synth.getVoices() || [];
        var pre = String(tag).split('-')[0].toLowerCase();
        var v = vs.filter(function(x){ return x.lang && x.lang.toLowerCase() === String(tag).toLowerCase(); })[0]
             || vs.filter(function(x){ return x.lang && x.lang.toLowerCase().indexOf(pre) === 0; })[0];
        if(v) u.voice = v;
      }catch(_){}
      synth.speak(u);
    }catch(_){}
  }
  function stopSpeak(){
    try{ if(NATIVE_TTS) NATIVE_TTS.stop().catch(function(){}); }catch(_){}
    try{ if(typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }catch(_){}
  }

  /* ---- モード判定(作成モードか) ----
     api には錠の状態が来ないので、共有シェルが出し入れする「せってい」ナビの表示で判定する(DOMは読むだけ)。
     せっていが見える=作成モード / 隠れている=本人使用モード。 */
  function isCreateMode(){
    var ns = document.getElementById('nav-set');
    return !!(ns && !ns.classList.contains('hidden'));
  }

  /* ---- モジュール状態(再描画をまたいで保つ) ---- */
  var _container = null, _api = null, _cat = 'people', _overlay = null, _observer = null;

  function sectionVisible(){ return !!(_container && !_container.classList.contains('hidden')); }

  /* ---- オーバーレイ(拡大/トリミング)。position:fixed でヘッダーもナビも覆う ---- */
  function closeOverlay(){
    stopSpeak();
    if(_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
    _overlay = null;
  }
  function openOverlay(node){
    closeOverlay();
    _overlay = node;
    _container.appendChild(node);
  }

  /* ---- CSS(1回だけ注入・接頭辞 photo-・色/フォント/44px規約は style.css の変数を再利用) ---- */
  function injectCss(){
    if(document.getElementById('css-photo')) return;
    var st = document.createElement('style');
    st.id = 'css-photo';
    st.textContent = [
      '#scr-photo .photo-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:2px 0 16px;}',
      '#scr-photo .photo-tab{flex:1 1 auto;min-width:60px;min-height:52px;padding:6px 6px;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;',
      'border:2px solid var(--line);background:var(--card);color:var(--sub);border-radius:14px;',
      'font-family:inherit;font-size:.82em;font-weight:700;line-height:1.15;}',
      '#scr-photo .photo-tab.active{border-color:var(--brand);color:var(--brand);}',
      '#scr-photo .photo-tab-ico{font-size:1.5em;line-height:1;}',
      '#scr-photo .photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:12px;}',
      '#scr-photo .photo-card{background:var(--card);border:2px solid var(--line);border-radius:16px;',
      'padding:8px;display:flex;flex-direction:column;align-items:center;gap:6px;min-height:44px;}',
      '#scr-photo .photo-card-img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:12px;',
      'background:var(--bg);display:block;}',
      '#scr-photo .photo-card-label{font-size:.95em;text-align:center;word-break:break-word;line-height:1.3;}',
      '#scr-photo .photo-empty{margin-top:8px;}',
      '#scr-photo .photo-add{display:flex;flex-direction:column;gap:12px;margin-top:22px;}',
      '#scr-photo .photo-add-btn{width:100%;min-height:60px;display:flex;align-items:center;justify-content:center;gap:10px;',
      'border:2px solid var(--brand);background:var(--card);color:var(--ink);border-radius:16px;',
      'font-family:inherit;font-size:1.02em;font-weight:700;}',
      '#scr-photo .photo-file{display:none;}',
      /* オーバーレイ */
      '#scr-photo .photo-ov{position:fixed;inset:0;z-index:300;background:var(--bg);color:var(--ink);',
      'display:flex;flex-direction:column;align-items:center;overflow-y:auto;',
      /* 上下ともエッジtoエッジ対応(上を固定pxのままにすると「とじる」等が時計と重なる) */
      'padding:calc(20px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom));}',
      '#scr-photo .photo-ov-title{font-size:1.18em;font-weight:700;margin:0 0 6px;text-align:center;}',
      '#scr-photo .photo-ov-hint{color:var(--sub);font-size:.92em;text-align:center;margin:0 0 14px;max-width:22em;}',
      '#scr-photo .photo-big{width:100%;max-width:min(90vw,420px);aspect-ratio:1/1;object-fit:contain;',
      'border-radius:16px;background:var(--card);border:2px solid var(--line);}',
      '#scr-photo .photo-big-label{font-size:1.4em;font-weight:700;text-align:center;margin:16px 8px;word-break:break-word;}',
      '#scr-photo .photo-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;width:100%;max-width:420px;margin-top:12px;}',
      '#scr-photo .photo-btn{min-height:56px;min-width:96px;padding:0 20px;display:flex;align-items:center;justify-content:center;gap:8px;',
      'border:2px solid var(--line);background:var(--card);color:var(--ink);border-radius:14px;',
      'font-family:inherit;font-size:1.02em;font-weight:700;}',
      '#scr-photo .photo-btn.primary{border-color:var(--brand);background:var(--brand);color:#fff;}',
      '#scr-photo .photo-btn.danger{border-color:#cc3b30;color:#cc3b30;}',
      'body[data-theme="dark"] #scr-photo .photo-btn.danger{border-color:#ef9a9a;color:#ef9a9a;}',
      '#scr-photo .photo-ico{font-size:1.2em;line-height:1;}',
      /* トリミング */
      '#scr-photo .photo-crop-canvas{width:min(80vw,300px);height:min(80vw,300px);max-width:300px;max-height:300px;',
      'border-radius:12px;border:2px solid var(--brand);background:#000;touch-action:none;display:block;}',
      '#scr-photo .photo-dpad{display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(3,52px);',
      'gap:6px;margin:14px 0 6px;justify-content:center;}',
      '#scr-photo .photo-nudge{min-width:52px;min-height:52px;border:2px solid var(--line);background:var(--card);',
      'color:var(--ink);border-radius:12px;font-size:1.2em;font-family:inherit;}',
      '#scr-photo .photo-nudge.spacer{border:none;background:none;}',
      '#scr-photo .photo-zoom-row{display:flex;align-items:center;gap:10px;width:100%;max-width:340px;margin:8px 0 2px;}',
      '#scr-photo .photo-zoom-row input[type="range"]{flex:1;min-height:44px;accent-color:var(--brand);}',
      '#scr-photo .photo-cap{align-self:flex-start;width:100%;max-width:360px;margin:14px auto 0;color:var(--sub);font-size:.92em;}',
      '#scr-photo .photo-input{width:100%;max-width:360px;min-height:52px;font-size:1.05em;font-family:inherit;',
      'padding:8px 12px;border:2px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);margin:6px auto 0;}',
      '#scr-photo .photo-edit{width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center;',
      'margin-top:22px;padding-top:16px;border-top:1px solid var(--line);}'
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---- ボタン生成(絵＋文字の二重提示。文字は api.T 経由) ---- */
  function iconBtn(cls, emoji, textKey, fn){
    var b = elc('button', cls); b.type = 'button';
    if(emoji){ var i = elc('span', 'photo-ico', emoji); i.setAttribute('aria-hidden', 'true'); b.appendChild(i); }
    if(textKey){ b.appendChild(elc('span', null, _api.T(textKey))); }
    tapBind(b, fn);
    return b;
  }

  /* ============ 一覧(タブ＋カード＋追加ボタン) ============ */
  function build(){
    if(!_container) return;
    var api = _api, c = _container;
    c.textContent = '';

    c.appendChild(elc('h2', 'scr-title', api.T('screen.photo.title')));

    var create = isCreateMode();
    var showText = create || !!api.pref.showText;   // 文字なし表示ONのとき(showText=false)は、本人には絵だけ見せる

    /* タブ(絵は常に・文字は showText に従う。読み上げ/支援のため aria-label には名前を必ず入れる) */
    var tabs = elc('div', 'photo-tabs');
    CATS.forEach(function(cat){
      var b = elc('button', 'photo-tab' + (cat === _cat ? ' active' : ''));
      b.type = 'button';
      var ic = elc('span', 'photo-tab-ico', TAB_ICON[cat]); ic.setAttribute('aria-hidden', 'true');
      b.appendChild(ic);
      if(showText) b.appendChild(elc('span', 'photo-tab-tx', api.T('screen.photo.tab.' + cat)));
      b.setAttribute('aria-label', api.T('screen.photo.tab.' + cat));
      tapBind(b, function(){ if(_cat !== cat){ _cat = cat; build(); } });
      tabs.appendChild(b);
    });
    c.appendChild(tabs);

    /* カード一覧 */
    var list = loadDict().filter(function(e){ return e && e.cat === _cat; });
    if(list.length){
      var grid = elc('div', 'photo-grid');
      list.forEach(function(entry){
        var card = elc('div', 'photo-card');
        card.setAttribute('aria-label', entry.label || api.T('screen.photo.title'));
        var img = elc('img', 'photo-card-img'); img.alt = entry.label || ''; img.src = entry.img || '';
        card.appendChild(img);
        if(showText && entry.label) card.appendChild(elc('div', 'photo-card-label', entry.label));
        tapBind(card, function(){ openView(entry); });
        grid.appendChild(card);
      });
      c.appendChild(grid);
    } else {
      c.appendChild(elc('p', 'placeholder-note photo-empty',
        create ? api.T('screen.photo.emptyCreate') : api.T('screen.photo.empty')));
    }

    /* 追加(作成モードのときだけ)。見えにくい側に寄らないよう横幅いっぱいで縦積み */
    if(create){
      var add = elc('div', 'photo-add');
      var camIn = makeFileInput(true), rollIn = makeFileInput(false);
      add.appendChild(camIn); add.appendChild(rollIn);

      var camBtn = iconBtn('photo-add-btn', '📷', 'screen.photo.fromCamera', function(){ camIn.click(); });
      var rollBtn = iconBtn('photo-add-btn', '🖼', 'screen.photo.fromRoll', function(){ rollIn.click(); });
      add.appendChild(camBtn); add.appendChild(rollBtn);
      c.appendChild(add);
    }
  }

  /* file input はネイティブイベント(共有シェルの作法どおり。click禁止の例外) */
  function makeFileInput(useCamera){
    var inp = elc('input', 'photo-file'); inp.type = 'file'; inp.accept = 'image/*';
    if(useCamera) inp.setAttribute('capture', 'environment');
    inp.addEventListener('change', onFile);
    return inp;
  }
  function onFile(e){
    var f = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!f) return;
    var url = URL.createObjectURL(f);
    var im = new Image();
    im.onload = function(){ openCrop(im, url); };
    im.onerror = function(){ try{ URL.revokeObjectURL(url); }catch(_){} _api.toast(_api.T('screen.photo.photoFail')); };
    im.src = url;
  }

  /* ============ トリミング(正方形・ドラッグ/やじるしで位置・スライダーで大きさ・ピンチ不使用) ============ */
  function openCrop(img, url){
    var api = _api;
    var ov = elc('div', 'photo-ov photo-crop');
    ov.appendChild(elc('div', 'photo-ov-title', api.T('screen.photo.cropTitle')));
    ov.appendChild(elc('p', 'photo-ov-hint', api.T('screen.photo.cropHint')));

    var cv = elc('canvas', 'photo-crop-canvas'); cv.width = CROP_V; cv.height = CROP_V;
    ov.appendChild(cv);

    var ctx = cv.getContext ? cv.getContext('2d') : null;
    var st = { zoom: 1, ox: 0, oy: 0, drag: null };
    st.base = CROP_V / Math.max(1, Math.min(img.width || 1, img.height || 1)); // 短辺が枠を満たす(cover)

    function dw(){ return (img.width || 1) * st.base * st.zoom; }
    function dh(){ return (img.height || 1) * st.base * st.zoom; }
    function clamp(){
      st.ox = Math.min(0, Math.max(CROP_V - dw(), st.ox));
      st.oy = Math.min(0, Math.max(CROP_V - dh(), st.oy));
    }
    function draw(){
      if(!ctx) return;
      ctx.clearRect(0, 0, CROP_V, CROP_V);
      ctx.drawImage(img, 0, 0, img.width, img.height, st.ox, st.oy, dw(), dh());
    }
    function nudge(dx, dy){ st.ox += dx; st.oy += dy; clamp(); draw(); }
    function zoomTo(v){
      var nz = Math.max(1, Math.min(3, (v || 100) / 100));
      var ow = dw(), oh = dh();
      st.zoom = nz;
      st.ox = CROP_V / 2 - (CROP_V / 2 - st.ox) * (dw() / ow);     // 枠の中心を保って拡大縮小(急に飛ばない)
      st.oy = CROP_V / 2 - (CROP_V / 2 - st.oy) * (dh() / oh);
      clamp(); draw();
    }

    st.ox = (CROP_V - dw()) / 2; st.oy = (CROP_V - dh()) / 2; clamp(); draw();

    /* 指ドラッグでの位置合わせ(canvasは生ポインタ。表示px→内部pxに換算) */
    cv.addEventListener('pointerdown', function(e){ st.drag = { x: e.clientX, y: e.clientY }; });
    cv.addEventListener('pointermove', function(e){
      if(!st.drag) return;
      var disp = CROP_V;
      if(cv.getBoundingClientRect){ var r = cv.getBoundingClientRect(); if(r && r.width) disp = r.width; }
      var s = CROP_V / disp;
      st.ox += (e.clientX - st.drag.x) * s; st.oy += (e.clientY - st.drag.y) * s;
      st.drag = { x: e.clientX, y: e.clientY };
      clamp(); draw();
    });
    cv.addEventListener('pointerup', function(){ st.drag = null; });
    cv.addEventListener('pointercancel', function(){ st.drag = null; });

    /* やじるしでも位置合わせできる(ドラッグを必須にしない=片麻痺・単純タップ配慮) */
    var pad = elc('div', 'photo-dpad');
    function nudBtn(emoji, labelKey, dx, dy){
      var b = elc('button', 'photo-nudge', emoji); b.type = 'button';
      b.setAttribute('aria-label', api.T(labelKey));
      tapBind(b, function(){ nudge(dx, dy); });
      return b;
    }
    function spacer(){ var s = elc('span', 'photo-nudge spacer'); s.setAttribute('aria-hidden', 'true'); return s; }
    pad.appendChild(spacer()); pad.appendChild(nudBtn('⬆', 'screen.photo.panUp',   0, -NUDGE)); pad.appendChild(spacer());
    pad.appendChild(nudBtn('⬅', 'screen.photo.panLeft', -NUDGE, 0)); pad.appendChild(spacer());  pad.appendChild(nudBtn('➡', 'screen.photo.panRight', NUDGE, 0));
    pad.appendChild(spacer()); pad.appendChild(nudBtn('⬇', 'screen.photo.panDown', 0,  NUDGE)); pad.appendChild(spacer());
    ov.appendChild(pad);

    /* スライダーで大きさ(ズーム。ピンチは使わない) */
    var zrow = elc('div', 'photo-zoom-row');
    var zico = elc('span', 'photo-ico', '🔍'); zico.setAttribute('aria-hidden', 'true');
    var range = elc('input'); range.type = 'range'; range.min = '100'; range.max = '300'; range.step = '5'; range.value = '100';
    range.setAttribute('aria-label', api.T('screen.photo.zoom'));
    range.addEventListener('input', function(){ zoomTo(parseInt(range.value, 10)); });
    zrow.appendChild(zico); zrow.appendChild(range);
    ov.appendChild(zrow);

    /* 自由記入ラベル(家族代筆可) */
    ov.appendChild(elc('div', 'photo-cap', api.T('screen.photo.labelLabel')));
    var lbl = elc('input', 'photo-input'); lbl.type = 'text'; lbl.maxLength = 60;
    lbl.placeholder = api.T('screen.photo.labelPlaceholder');
    lbl.setAttribute('aria-label', api.T('screen.photo.labelLabel'));
    ov.appendChild(lbl);

    function closeCrop(){ if(url){ try{ URL.revokeObjectURL(url); }catch(_){} } closeOverlay(); }
    function confirmCrop(){
      try{
        var out = elc('canvas'); out.width = CROP_OUT; out.height = CROP_OUT;
        var octx = out.getContext('2d');
        var s = CROP_OUT / CROP_V;
        octx.drawImage(img, 0, 0, img.width, img.height, st.ox * s, st.oy * s, dw() * s, dh() * s);
        var data = out.toDataURL('image/jpeg', 0.85);
        var label = (lbl.value || '').trim();
        var d = loadDict();
        d.push({ id: nextId(d), cat: _cat, label: label, img: data });
        if(!saveDict(d)){ closeCrop(); build(); api.toast(api.T('screen.photo.storageFull')); return; } // 容量オーバー=通知して取消
        closeCrop(); build(); api.toast(api.T('screen.photo.added'));
      }catch(_){ closeCrop(); api.toast(api.T('screen.photo.photoFail')); }
    }

    var row = elc('div', 'photo-row');
    row.appendChild(iconBtn('photo-btn', '✕', 'screen.photo.cancel', closeCrop));
    row.appendChild(iconBtn('photo-btn primary', '✓', 'screen.photo.make', confirmCrop));
    ov.appendChild(row);

    openOverlay(ov);
  }

  /* ============ 拡大表示(タップで) + 作成モードのみ なまえ変更/けす ============ */
  function openView(entry){
    var api = _api, create = isCreateMode();
    var ov = elc('div', 'photo-ov photo-view');

    var img = elc('img', 'photo-big'); img.src = entry.img || ''; img.alt = entry.label || '';
    ov.appendChild(img);

    var showText = !!api.pref.showText;
    if(entry.label && (showText || create)) ov.appendChild(elc('div', 'photo-big-label', entry.label));

    /* よみあげ(せっていのTTSがONのときだけ。既定OFF)。声を出せない人の「声」になる */
    if(api.pref.tts && entry.label){
      speak(entry.label, api.pref.lang);
      var srow = elc('div', 'photo-row');
      srow.appendChild(iconBtn('photo-btn', '🔊', 'screen.photo.speak', function(){ speak(entry.label, api.pref.lang); }));
      ov.appendChild(srow);
    }

    /* 作成モードだけ: なまえ変更・けす(本人使用モードでは出さない) */
    var edit = null;
    if(create){
      edit = elc('div', 'photo-edit');
      renderEditControls();
      ov.appendChild(edit);
    }

    var crow = elc('div', 'photo-row');
    crow.appendChild(iconBtn('photo-btn', '↩', 'screen.photo.close', closeOverlay));
    ov.appendChild(crow);

    openOverlay(ov);

    function renderEditControls(){
      edit.textContent = '';
      edit.appendChild(elc('div', 'photo-cap', api.T('screen.photo.labelLabel')));
      var inp = elc('input', 'photo-input'); inp.type = 'text'; inp.maxLength = 60;
      inp.value = entry.label || '';
      inp.placeholder = api.T('screen.photo.labelPlaceholder');
      inp.setAttribute('aria-label', api.T('screen.photo.labelLabel'));
      edit.appendChild(inp);
      var row = elc('div', 'photo-row');
      row.appendChild(iconBtn('photo-btn primary', '💾', 'screen.photo.save', function(){ doRelabel(inp.value); }));
      row.appendChild(iconBtn('photo-btn danger', '🗑', 'screen.photo.del', askDelete));
      edit.appendChild(row);
    }
    function doRelabel(v){
      var nl = (v || '').trim();
      var d = loadDict(), idx = -1;
      for(var i = 0; i < d.length; i++){ if(d[i].id === entry.id){ idx = i; break; } }
      if(idx < 0){ closeOverlay(); build(); return; }
      var prev = d[idx].label; d[idx].label = nl;
      if(!saveDict(d)){ d[idx].label = prev; closeOverlay(); build(); api.toast(api.T('screen.photo.storageFull')); return; }
      entry.label = nl;
      closeOverlay(); build(); api.toast(api.T('screen.photo.saved'));
    }
    function askDelete(){
      edit.textContent = '';
      edit.appendChild(elc('p', 'photo-ov-hint', api.T('screen.photo.delConfirm')));  // 押下直後に取消できる(誤タップを恥じさせない)
      var row = elc('div', 'photo-row');
      row.appendChild(iconBtn('photo-btn', '↩', 'screen.photo.delNo', renderEditControls));
      row.appendChild(iconBtn('photo-btn danger', '🗑', 'screen.photo.delYes', doDelete));
      edit.appendChild(row);
    }
    function doDelete(){
      var d = loadDict().filter(function(x){ return x.id !== entry.id; });
      saveDict(d);
      closeOverlay(); build(); api.toast(api.T('screen.photo.deleted'));
    }
  }

  /* ---- 作成/本人使用モードの切替に追従(せっていナビの表示変化を監視して描き直す) ---- */
  function ensureObserver(){
    if(_observer) return;
    var ns = document.getElementById('nav-set');
    if(!ns || typeof MutationObserver === 'undefined') return;
    _observer = new MutationObserver(function(){
      if(sectionVisible() && !_overlay) build();   // オーバーレイ表示中は描き直さない(操作を壊さない)
    });
    try{ _observer.observe(ns, { attributes: true, attributeFilter: ['class'] }); }catch(_){}
  }

  window.KAIWA_SCREENS.register('photo', {
    render: function(container, api){
      _container = container; _api = api;
      injectCss();
      stopSpeak(); _overlay = null;   // 共有シェルが container を空にして呼ぶ=前回のオーバーレイDOMは既に無い
      build();
      ensureObserver();
    }
  });

})();
