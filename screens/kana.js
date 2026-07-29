'use strict';
/* 画面: ことば(50音) (v0.1 本実装)
   担当者向けメモ:
   ・ここは「ことば(50音)」画面の専用ファイル。中身の実装はこのファイルの中だけで完結させる。
     app.js / router.js / i18n.js / style.css / tap.js / audio.js / index.html は一切書き換えない。
   ・SPEC_V1: 五十音板(濁点・半濁点・小書き含む)。全文字を大きめタップ。選んだ字を上部に
     ならべて「見せる」表示。文字が残っている方の生命線(絵・写真中心の他画面との役割分担)。
     日常のなかで「見せて つたえる」ための道具として作る(医療機器には該当しない)。
   ・文言はすべて api.T('screen.kana.*') 経由(生文字列を画面に直書きしない)。訳文(ja/en)は
     成果物として構造化返却し、後段が i18n.js に統合する(このファイルからは i18n.js を触らない)。
   ・タップは Tap.bind のみ(click禁止)。タップ対象は44px以上。単純タップだけ(ピンチ/スワイプ/
     長押しを要求しない=片麻痺前提)。ズーム等の複雑ジェスチャは使わない。
   ・CSSは #scr-kana スコープ内・class接頭辞 kana- で完結(<style id="css-kana"> を1回だけ注入)。
     色/フォント/タップ規約は style.css の既存CSS変数(--brand/--bg/--ink/--card/--line/--sub)を再利用。
   ・api.pref を尊重: fs(本体bodyのfsクラスで自動拡大→emで組む) / showText(補助テキストの出し分け) /
     weakSide(重要ボタンを端一方に寄せない) / tts(既定OFF・ONのときだけ よみあげボタン) / lang。 */
(function(){

  /* ===== 状態(モジュール内メモリ・端末には保存しない一時表示) =====
     再描画(文字サイズ変更・言語切替など app.js が renderCategory を呼ぶ)で消えないよう、
     選んだ字は render の外(このスコープ)に保持する。アプリ再起動では消える(履歴を残さない設計)。 */
  var stripText = '';       // いま「見せている」文字の並び
  var clearedBuffer = null; // 「ぜんぶ けす」の直前内容(押下直後に「もどす」で取消可)

  /* ===== 五十音図(行=清音の並び。空文字は表のすき間=タップ不可のプレースホルダ) =====
     文字そのものは翻訳対象ではない言語固有の内容なので、コード側に持つ(i18nには置かない)。 */
  var GOJUON = [
    ['あ','い','う','え','お'],
    ['か','き','く','け','こ'],
    ['さ','し','す','せ','そ'],
    ['た','ち','つ','て','と'],
    ['な','に','ぬ','ね','の'],
    ['は','ひ','ふ','へ','ほ'],
    ['ま','み','む','め','も'],
    ['や','',  'ゆ','',  'よ'],
    ['ら','り','る','れ','ろ'],
    ['わ','',  'ん','',  'を']
  ];

  /* 濁点・半濁点・小書きは「直前の字」を切り替えて出す(そよぎAACと同じ方式=姉妹作で操作を揃える。
     伝統的な文字盤で「基本の字＋濁点マーク」を指す動作に対応)。もう一度押すと元に戻る(トグル)。 */
  var DAKU = {
    'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご',
    'さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ',
    'た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど',
    'は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ','う':'ゔ'
  };
  var HANDAKU = { 'は':'ぱ','ひ':'ぴ','ふ':'ぷ','へ':'ぺ','ほ':'ぽ' };
  var SMALL = {
    'あ':'ぁ','い':'ぃ','う':'ぅ','え':'ぇ','お':'ぉ',
    'つ':'っ','や':'ゃ','ゆ':'ゅ','よ':'ょ','わ':'ゎ'
  };
  var MOD = { '゛':DAKU, '゜':HANDAKU, '小':SMALL };
  /* 機能キーは2段。上段=句読点・長音(並べて見やすく)。下段=濁点/半濁点/小＋この右に「空白」(ヒロ指定2026-07-25) */
  var JA_FNS_TOP = ['、','。','？','！','ー'];
  var JA_FNS_BOT = ['゛','゜','小'];

  /* ラテン文字言語(en/de/fr/es/it/pt/nl/sv)は ABC 盤にフォールバック。zh もここに合流(下記 scriptOf 参照)。 */
  var LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  var LATIN_FNS_TOP = ['-', "'", '.', ',', '?', '!'];   // 上段=記号
  var LATIN_FNS_BOT = [];                               // 下段は「空白」のみ

  /* ===== ハングル字母(자모)盤(ko) =====
     子音14 + 母音10 = 24字を1字ずつ選んで上に見せる。合成(초성+중성+종성の組み立て)は
     求めない=日本語の五十音盤と同じ「見せて つたえる」思想(入力メソッドではない)。auto-fill盤で折返し。
     機能キーは最小(現代ハングルは横書き・約物はラテンと共通なので上段のみ・下段は空白キーだけ)。 */
  var HANGUL = [
    'ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
    'ㅏ','ㅑ','ㅓ','ㅕ','ㅗ','ㅛ','ㅜ','ㅠ','ㅡ','ㅣ'
  ];
  var KO_FNS_TOP = ['.', ',', '?', '!'];
  var KO_FNS_BOT = [];

  /* ===== アラビア文字盤(ar・RTL) =====
     基本28字。RTL(右→左)で並べ、選んだ字も右→左に見せる(render 側で dir="rtl" を最小限付与)。
     連結整形(語中形など)は行わず1字ずつ提示=他盤と同じ「見せて つたえる」思想。
     機能キーは現地の約物: ، (読点) / ؟ (疑問符) / ؛ (セミコロン) ＋ . ! 。下段は空白キーだけ。 */
  var ARABIC = [
    'ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط',
    'ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'
  ];
  var AR_FNS_TOP = ['،','؟','؛','.','!'];
  var AR_FNS_BOT = [];

  /* 台本(スクリプト)判定: 文字盤・機能キー・並び方向をこの1値で切り替える。
     ja=五十音 / ko=ハングル字母 / ar=アラビア(RTL) / それ以外(en/de/fr/es/it/pt/nl/sv/zh)=ラテンABC。
     ※ zh に専用の漢字盤は持たずラテンABC盤へフォールバックする(実務的既定)。理由=失語症支援では
       写真/はい・いいえ画面が主で、ことば画面は zh でもピンイン(ラテン字)入力を想定するため。 */
  function scriptOf(lang){
    if(lang === 'ja') return 'ja';
    if(lang === 'ko') return 'ko';
    if(lang === 'ar') return 'ar';
    return 'latin';                                     // en/de/fr/es/it/pt/nl/sv/zh
  }
  var BOARD_OF   = { ko: HANGUL,     ar: ARABIC,     latin: LATIN };            // ja は GOJUON を別処理(2次元)
  var FNS_TOP_OF = { ja: JA_FNS_TOP, ko: KO_FNS_TOP, ar: AR_FNS_TOP, latin: LATIN_FNS_TOP };
  var FNS_BOT_OF = { ja: JA_FNS_BOT, ko: KO_FNS_BOT, ar: AR_FNS_BOT, latin: LATIN_FNS_BOT };

  /* よみあげ(TTS)の言語タグ。将来12言語ぶんを用意(いまは ja/en のみ i18n に存在) */
  var TTS_LANG = {
    ja:'ja-JP', en:'en-US', de:'de-DE', fr:'fr-FR', es:'es-ES', it:'it-IT',
    pt:'pt-PT', nl:'nl-NL', sv:'sv-SE', ko:'ko-KR', zh:'zh-CN', ar:'ar-SA'
  };

  /* ===== スコープCSS(1回だけ注入・#scr-kana配下・接頭辞 kana-) ===== */
  function injectCSS(){
    if(typeof document === 'undefined') return;
    if(document.getElementById('css-kana')) return;
    var s = document.createElement('style');
    s.id = 'css-kana';
    s.textContent =
      '#scr-kana .kana-wrap{ display:flex; flex-direction:column; gap:12px; width:100%; }' +
      '#scr-kana .kana-guide{ display:flex; align-items:center; gap:8px; color:var(--sub); font-size:.95em; }' +
      '#scr-kana .kana-guide-ic{ font-size:1.2em; line-height:1; }' +
      /* 見せる欄(選んだ字の並び)。ここは表示そのものが機能なので showText によらず常に文字を出す */
      '#scr-kana .kana-strip{ min-height:2.4em; padding:14px 16px; border:2px solid var(--brand);' +
        ' border-radius:14px; background:var(--card); color:var(--ink); font-size:1.9em; line-height:1.4;' +
        ' font-weight:700; text-align:center; word-break:break-word; overflow-wrap:anywhere; unicode-bidi:plaintext; }' +
      '#scr-kana .kana-strip--empty{ color:var(--sub); font-weight:400; font-size:1.1em; }' +
      /* 操作ボタン(もどす/1もじけす/ぜんぶけす/よみあげ)。weakSide で寄せる向きを変える(端一方に固定しない) */
      '#scr-kana .kana-actions{ display:flex; flex-wrap:wrap; gap:10px; }' +
      '#scr-kana .kana-act{ display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;' +
        ' min-height:56px; min-width:76px; padding:6px 12px; border:2px solid var(--brand); border-radius:12px;' +
        ' background:var(--card); color:var(--ink); font-family:inherit; font-size:1em; }' +
      '#scr-kana .kana-act--sub{ border-color:var(--line); color:var(--sub); }' +
      '#scr-kana .kana-act.is-off{ opacity:.4; }' +
      '#scr-kana .kana-icon{ font-size:1.35em; line-height:1; }' +
      '#scr-kana .kana-label{ font-size:.72em; line-height:1.15; }' +
      /* 五十音の盤(5列=あ段〜お段が縦にそろう五十音図)。ラテン語は自動折返し */
      '#scr-kana .kana-grid{ display:grid; grid-template-columns:repeat(5,1fr); gap:8px; }' +
      '#scr-kana .kana-grid--auto{ grid-template-columns:repeat(auto-fill,minmax(52px,1fr)); }' +
      '#scr-kana .kana-key{ min-height:56px; display:flex; align-items:center; justify-content:center;' +
        ' border:1.5px solid var(--line); border-radius:12px; background:var(--card); color:var(--ink);' +
        ' font-family:inherit; font-size:1.55em; font-weight:600; padding:4px; }' +
      '#scr-kana .kana-empty{ border:none; background:transparent; visibility:hidden; }' +
      '#scr-kana .kana-fns{ display:flex; flex-wrap:wrap; gap:8px; margin-top:2px; }' +
      '#scr-kana .kana-fn{ min-height:48px; min-width:48px; padding:4px 10px; border:1.5px solid var(--line);' +
        ' border-radius:10px; background:var(--card); color:var(--ink); font-family:inherit; font-size:1.25em; font-weight:600; }' +
      '#scr-kana .kana-fn--mod{ border-color:var(--brand); color:var(--brand); }' +
      /* 「小」と「空白」は下段を伸びて埋める(ぴったり揃える・ヒロ指定2026-07-25)。゛゜は最小幅のまま */
      '#scr-kana .kana-space{ flex:1 1 0; min-width:84px; }' +
      '#scr-kana .kana-fn--wide{ flex:1 1 0; min-width:84px; }' +
      '#scr-kana .kana-act--say{ border-color:var(--brand); color:var(--brand); }';
    (document.head || document.documentElement).appendChild(s);
  }

  /* ===== よみあげ(TTS)。api.pref.tts が ON のときだけ使う ===== */
  /* Play版(Capacitor)のWebViewはWeb Speech API非対応の端末が多い→端末内蔵TTSへ橋渡し */
  var NATIVE_TTS = (function(){
    try{
      var c = window.Capacitor;
      if(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform() &&
         typeof c.registerPlugin === 'function'){ return c.registerPlugin('TextToSpeech'); }
    }catch(_){}
    return null;
  })();
  function ttsSpeak(text, lang, vol){
    if(!text) return;
    var tag = TTS_LANG[lang] || 'en-US';
    if(NATIVE_TTS){
      try{
        NATIVE_TTS.stop().catch(function(){}).then(function(){
          NATIVE_TTS.speak({ text: String(text), lang: tag, rate: 1, pitch: 1.0,
                             volume: (vol === 0) ? 0.6 : 1.0 }).catch(function(){});
        });
      }catch(_){}
      return;
    }
    if(!('speechSynthesis' in window)) return;
    try{
      var synth = window.speechSynthesis;
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = tag;
      /* 🔴端末の既定音声(例:日本語)のままだと対象言語で読まれない対策=対象言語に合う音声を明示選択。
         getVoices()が空(未ロード)の時は従来どおり u.lang のみで読む(例外は出さない)。 */
      try{
        var vs = synth.getVoices() || [];
        var pre = tag.split('-')[0].toLowerCase();
        var v = vs.filter(function(x){ return x.lang && x.lang.toLowerCase() === tag.toLowerCase(); })[0]
             || vs.filter(function(x){ return x.lang && x.lang.toLowerCase().indexOf(pre) === 0; })[0];
        if(v) u.voice = v;
      }catch(_){}
      u.rate = 1; u.pitch = 1;
      u.volume = (vol === 0) ? 0.6 : 1;   // せっての「おとのおおきさ」に軽く連動
      synth.speak(u);
    }catch(_){}
  }

  function dropLast(str){ var a = Array.from(str); a.pop(); return a.join(''); }
  function toggleLast(map){
    if(!map || !stripText) return;
    var a = Array.from(stripText), last = a[a.length - 1];
    if(map[last]){ a[a.length - 1] = map[last]; stripText = a.join(''); return; }
    var ks = Object.keys(map);                       // すでに変換済みなら元に戻す(トグル)
    for(var i = 0; i < ks.length; i++){
      if(map[ks[i]] === last){ a[a.length - 1] = ks[i]; stripText = a.join(''); return; }
    }
  }

  window.KAIWA_SCREENS.register('kana', {
    render: function(container, api){
      injectCSS();

      var pref     = api.pref;
      var lang     = pref.lang || 'ja';
      var script   = scriptOf(lang);                                   // 'ja' | 'ko' | 'ar' | 'latin'
      var ja       = (script === 'ja');                               // ja だけ 2次元(五十音図)＋濁点等の特別扱い
      var rtl      = (script === 'ar');                               // ar は盤・見せる欄を右→左に
      var showText = (pref.showText !== false);                        // 文字なし表示のとき補助テキストを隠す
      var ttsOK    = !!pref.tts && (!!NATIVE_TTS || ('speechSynthesis' in window)); // 既定OFF。ONのときだけ よみあげ

      function L(k){ var v = api.T('screen.kana.' + k); return (v == null) ? '' : v; }

      /* --- 表示更新 --- */
      var stripEl, undoBtn, delBtn, clrBtn, sayBtn;
      function updateStrip(){
        if(stripText){ stripEl.textContent = stripText; stripEl.classList.remove('kana-strip--empty'); }
        else { stripEl.textContent = L('stripEmpty'); stripEl.classList.add('kana-strip--empty'); }
      }
      function updateActions(){
        var empty = !stripText;
        if(delBtn) delBtn.classList.toggle('is-off', empty);
        if(clrBtn) clrBtn.classList.toggle('is-off', empty);
        if(sayBtn) sayBtn.classList.toggle('is-off', empty);
        if(undoBtn) undoBtn.classList.toggle('hidden', clearedBuffer == null);
      }
      function commit(){ updateStrip(); updateActions(); }

      /* --- 変更操作 --- */
      function typeChar(ch){ stripText += ch; clearedBuffer = null; commit(); }
      function applyMod(sym){ toggleLast(MOD[sym]); clearedBuffer = null; commit(); }
      function delOne(){ if(!stripText) return; stripText = dropLast(stripText); clearedBuffer = null; commit(); }
      function clearAll(){
        if(!stripText) return;
        clearedBuffer = stripText; stripText = ''; commit();
        var m = L('cleared'); if(m) api.toast(m);   // 直後に「もどす」で取消できると伝える
      }
      function undo(){
        if(clearedBuffer == null) return;
        stripText = clearedBuffer; clearedBuffer = null; commit();
        var m = L('restored'); if(m) api.toast(m);
      }
      function say(){ if(stripText) ttsSpeak(stripText, lang, pref.vol); }

      /* --- 部品ビルダー(すべて Tap.bind・click禁止) --- */
      function actBtn(icon, key, onTap, extraCls){
        var b = api.el('button', 'kana-act' + (extraCls ? ' ' + extraCls : ''));
        b.type = 'button';
        var ic = api.el('span', 'kana-icon', icon); ic.setAttribute('aria-hidden', 'true');
        b.appendChild(ic);
        var lbl = L(key);
        if(lbl) b.setAttribute('aria-label', lbl);                     // よみあげ支援には常にラベルを持たせる
        if(showText) b.appendChild(api.el('span', 'kana-label', lbl)); // 文字なし表示のときはアイコンだけ
        Tap.bind(b, onTap);
        return b;
      }
      function letterKey(ch){
        if(!ch) return api.el('span', 'kana-key kana-empty');          // 表のすき間(タップ不可)
        var b = api.el('button', 'kana-key', ch);
        b.type = 'button';
        Tap.bind(b, function(){ typeChar(ch); });
        return b;
      }
      function fnKey(ch){
        var isMod = (MOD[ch] !== undefined);
        var cls = 'kana-fn' + (isMod ? ' kana-fn--mod' : '') + (ch === '小' ? ' kana-fn--wide' : '');
        var b = api.el('button', cls, ch);
        b.type = 'button';
        Tap.bind(b, function(){ if(isMod) applyMod(ch); else typeChar(ch); });
        return b;
      }
      function spaceKey(){
        var typed = ja ? '　' : ' ';
        var lbl = L('space') || '␣';                    // 「␣」記号でなく「空白」の文字を出す(ヒロ指定)
        var b = api.el('button', 'kana-fn kana-space', lbl);
        b.type = 'button';
        b.setAttribute('aria-label', lbl);
        Tap.bind(b, function(){ typeChar(typed); });
        return b;
      }

      /* --- 組み立て --- */
      var wrap = api.el('div', 'kana-wrap');
      wrap.appendChild(api.el('h2', 'scr-title', L('title')));

      if(showText){                                                    // 指示文は極短＋絵を同時提示。文字なし表示なら丸ごと省く
        var g = api.el('div', 'kana-guide');
        var gi = api.el('span', 'kana-guide-ic', '✍️'); gi.setAttribute('aria-hidden', 'true');
        g.appendChild(gi);
        g.appendChild(api.el('span', 'kana-guide-tx', L('guide')));
        wrap.appendChild(g);
      }

      stripEl = api.el('div', 'kana-strip');
      stripEl.setAttribute('aria-live', 'polite');                     // 選んだ字を読み上げ支援へ随時通知
      if(rtl) stripEl.setAttribute('dir', 'rtl');                      // ar: 見せる欄を右→左に(unicode-bidi:plaintext と併用)
      wrap.appendChild(stripEl);

      var actions = api.el('div', 'kana-actions');
      /* 半盲配慮: 重要ボタンを端一方に固定しない。見えにくい側の反対(見える側)へ寄せる。なし=中央 */
      actions.style.justifyContent =
        (pref.weakSide === 'left') ? 'flex-end' :
        (pref.weakSide === 'right') ? 'flex-start' : 'center';
      undoBtn = actBtn('↩', 'undo', undo, 'kana-act--undo');
      undoBtn.classList.add('hidden');                                 // 「ぜんぶ けす」の直後だけ現れる
      delBtn = actBtn('⌫', 'delOne', delOne, 'kana-act--sub');
      clrBtn = actBtn('✕', 'clearAll', clearAll, 'kana-act--sub');
      actions.appendChild(undoBtn);
      actions.appendChild(delBtn);
      actions.appendChild(clrBtn);
      if(ttsOK){ sayBtn = actBtn('🔊', 'say', say, 'kana-act--say'); actions.appendChild(sayBtn); }
      wrap.appendChild(actions);

      var grid = api.el('div', 'kana-grid' + (ja ? '' : ' kana-grid--auto'));
      if(rtl) grid.setAttribute('dir', 'rtl');                         // ar: 盤も右→左(先頭字が右上・右から左へ充填)
      if(ja){
        GOJUON.forEach(function(row){ row.forEach(function(ch){ grid.appendChild(letterKey(ch)); }); });
      } else {
        (BOARD_OF[script] || LATIN).forEach(function(ch){ grid.appendChild(letterKey(ch)); });
      }
      wrap.appendChild(grid);

      /* 上段: 句読点・長音など(ja=、。？！ー / latin=記号 / ar=現地約物 / ko=最小) */
      var fnsTop = api.el('div', 'kana-fns');
      if(rtl) fnsTop.setAttribute('dir', 'rtl');
      (FNS_TOP_OF[script] || LATIN_FNS_TOP).forEach(function(ch){ fnsTop.appendChild(fnKey(ch)); });
      wrap.appendChild(fnsTop);
      /* 下段: ja=濁点/半濁点/小 ＋「空白」。他の台本は下段=「空白」のみ */
      var fnsBot = api.el('div', 'kana-fns');
      if(rtl) fnsBot.setAttribute('dir', 'rtl');
      (FNS_BOT_OF[script] || LATIN_FNS_BOT).forEach(function(ch){ fnsBot.appendChild(fnKey(ch)); });
      fnsBot.appendChild(spaceKey());
      wrap.appendChild(fnsBot);

      container.appendChild(wrap);
      commit();                                                        // 保持中の並びを反映して初期表示
    }
  });
})();
