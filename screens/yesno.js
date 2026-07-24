'use strict';
/* 画面: はい・いいえ (v0.1 本実装)
   担当ファイル。中身はこのファイルだけで完結させる(app.js/router.js/i18n.js/style.css/tap.js/audio.jsは触らない)。

   設計の要点(SPEC_V1 / research 直結):
   ・👍みどり=はい / 👎あか=いいえ の大きな視覚ペア＋第3択「わからない」🤷(ニュートラルなはい)。
   ・反転現象(かいふく初期は「はい」と言おうとして「いいえ」が出る)前提:
       - 単一トグルにしない。色＋アイコンで対極を二重化する(位置ではなく色・絵で読み取れる)。
       - 押した直後に大きく「これを えらんでいます」と提示し、すぐ隣に「とりけす」で即座に取り消せる
         (誤タップを恥じさせない。別の選択肢を押しても即座に切り替わる=ロックしない)。
   ・文字は補助。せっていの「カードの文字」OFF(pref.showText=false)で文字を隠し、絵だけで成立する。
   ・見えにくい側(pref.weakSide)配慮: 重要ボタンを片方の端に寄せない。3つの選択肢は横いっぱいの縦積み、
     取消・案内は中央そろえ=どちらの端が見えにくくても届く配置にする。
   ・よみあげ(pref.tts。既定OFF)がONのときだけ、選んだ語を読み上げる(声を出せない方の「声」)。
   ・急かすUI・時間制限・カウントダウンは入れない。医学的な判断はしない(日常の会話をたすける道具)。
   ・タップは全て Tap.bind(clickは使わない)。タップ対象は44px以上・単純タップのみ。 */
(function(){

  /* ---- スコープ付きCSS(1回だけ注入。クラス名は yesno- 接頭辞で衝突回避。
          色/フォント/沈み込み(.pressing)は style.css の既存CSS変数・規約に合わせる。
          はい=みどり / いいえ=あか は「意味を持つ機能色」なのでテーマに依存させず固定する
          (色覚に配慮し、色だけに頼らず 👍/👎/🤷 の絵と併記=二重化)) ---- */
  var CSS =
    '#scr-yesno .yesno-root{ display:flex; flex-direction:column; gap:16px; padding-top:4px; }' +
    '#scr-yesno .yesno-title{ margin:0; font-size:1.15em; font-weight:700; color:var(--sub); text-align:center; }' +

    /* うえの帯: えらぶ前は案内、えらんだ後は「いま えらんでいる もの」＋とりけす */
    '#scr-yesno .yesno-panel{ min-height:6.4em; display:flex; align-items:center; justify-content:center;' +
    ' background:var(--card); border:2px solid var(--line); border-radius:16px; padding:14px; }' +
    '#scr-yesno .yesno-prompt{ display:flex; align-items:center; justify-content:center; gap:.5em;' +
    ' color:var(--sub); text-align:center; }' +
    '#scr-yesno .yesno-prompt-ic{ font-size:1.9em; line-height:1; }' +
    '#scr-yesno .yesno-sel{ display:flex; flex-direction:column; align-items:center; gap:10px; width:100%; }' +
    '#scr-yesno .yesno-sel-main{ display:flex; align-items:center; justify-content:center; gap:.35em; }' +
    '#scr-yesno .yesno-sel-emoji{ font-size:3em; line-height:1; }' +
    '#scr-yesno .yesno-sel-label{ font-size:1.6em; font-weight:800; }' +
    '#scr-yesno .yesno-caption{ color:var(--sub); font-size:.95em; text-align:center; }' +
    '#scr-yesno .yesno-cancel{ min-height:56px; min-width:60%; margin-top:2px; padding:8px 20px;' +
    ' display:flex; align-items:center; justify-content:center; gap:.4em;' +
    ' background:var(--card); color:var(--ink); border:2.5px solid var(--sub); border-radius:14px;' +
    ' font-family:inherit; font-size:1.1em; font-weight:700; cursor:pointer; }' +
    '#scr-yesno .yesno-cancel-ic{ font-size:1.3em; line-height:1; }' +

    /* えらぶ 3つ(縦いっぱい。位置ではなく色＋絵で対極を読み取る) */
    '#scr-yesno .yesno-choices{ display:flex; flex-direction:column; gap:14px; }' +
    '#scr-yesno .yesno-btn{ width:100%; min-height:5em; padding:10px 16px;' +
    ' display:flex; align-items:center; justify-content:center; gap:.5em;' +
    ' border:none; border-radius:18px; color:#fff; font-family:inherit; cursor:pointer; }' +
    '#scr-yesno .yesno-emoji{ font-size:2.4em; line-height:1; }' +
    '#scr-yesno .yesno-label{ font-size:1.3em; font-weight:800; letter-spacing:.02em; }' +
    '#scr-yesno .yesno-yes{ background:#1f8a4c; }' +      /* はい=みどり(固定・機能色) */
    '#scr-yesno .yesno-no{ background:#c62f2f; }' +       /* いいえ=あか(固定・機能色) */
    '#scr-yesno .yesno-unknown{ background:#5f6b66; }' +  /* わからない=ニュートラルなはい */
    /* えらんでいる ボタンに はっきりした リング(どのテーマでも見えるよう --bg で すき間 → --ink) */
    '#scr-yesno .yesno-active{ box-shadow:0 0 0 4px var(--bg), 0 0 0 8px var(--ink); }' +

    /* .hidden(詳細度0,1,0)は ID付きの display:flex(1,1,0)に負けるので、ID+クラスで確実に消す(prompt/selがhiddenでも消えなかった不具合対策) */
    '#scr-yesno .yesno-prompt.hidden, #scr-yesno .yesno-sel.hidden{ display:none; }' +

    /* 文字なし表示(絵だけでも成立): ラベル・キャプション・タイトルを隠し、絵と色だけ残す */
    '#scr-yesno .yesno-notext .yesno-label,' +
    '#scr-yesno .yesno-notext .yesno-caption,' +
    '#scr-yesno .yesno-notext .yesno-title{ display:none; }';

  function injectCss(){
    if(document.getElementById('css-yesno')) return;
    var s = document.createElement('style');
    s.id = 'css-yesno';
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  /* ---- よみあげ(自前・最小)。soyogi_aac方式を持ち込みつつ、この画面の中だけで完結。
          pref.tts が ON のときだけ呼ぶ。今は ja/en のみ(将来12言語はロケール表を増やす) ---- */
  var TTS_LANG = {
    ja:'ja-JP', en:'en-US', de:'de-DE', fr:'fr-FR', es:'es-ES', it:'it-IT',
    pt:'pt-PT', nl:'nl-NL', sv:'sv-SE', ko:'ko-KR', zh:'zh-CN', ar:'ar-SA'
  };
  function speak(text, lang){
    try{
      if(!('speechSynthesis' in window) || !text) return;
      var synth = window.speechSynthesis;
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var tag = TTS_LANG[lang] || 'en-US';
      u.lang = tag;
      try{                              // 端末既定音声のままだと対象言語で読まれない対策=合う音声を明示選択
        var vs = synth.getVoices() || [];
        var pre = tag.split('-')[0].toLowerCase();
        var v = vs.filter(function(x){ return x.lang && x.lang.toLowerCase() === tag.toLowerCase(); })[0]
             || vs.filter(function(x){ return x.lang && x.lang.toLowerCase().indexOf(pre) === 0; })[0];
        if(v) u.voice = v;
      }catch(_){}
      u.rate = 1;                       // 急かさない・ふつうの速さ
      synth.speak(u);
    }catch(_){}
  }
  function stopSpeak(){
    try{ if('speechSynthesis' in window) window.speechSynthesis.cancel(); }catch(_){}
  }

  window.KAIWA_SCREENS.register('yesno', {
    render: function(container, api){
      injectCss();

      var pref     = api.pref || {};
      var showText = pref.showText !== false;   // 既定はON
      var tts      = !!pref.tts;                // 既定OFF
      var lang     = pref.lang || 'ja';

      var root = api.el('div', 'yesno-root');
      if(!showText) root.classList.add('yesno-notext');
      /* 見えにくい側は「端に寄せない中央/横いっぱい」配置で吸収する(値そのものでの分岐は不要)。
         記録として属性に残す(将来ここを起点に微調整できる) */
      root.setAttribute('data-weakside', pref.weakSide || 'none');

      /* みだし(向き合わせのための小さなラベル。文字なし表示では隠れる) */
      root.appendChild(api.el('h2', 'yesno-title', api.T('screen.yesno.title')));

      /* ===== うえの帯: 案内 or えらんでいるもの ＋ とりけす ===== */
      var panel = api.el('div', 'yesno-panel');

      // 案内(まだ選んでいないとき)
      var prompt = api.el('div', 'yesno-prompt');
      var promptIc = api.el('span', 'yesno-prompt-ic', '👇');   // 👇
      promptIc.setAttribute('aria-hidden', 'true');
      prompt.appendChild(promptIc);
      prompt.appendChild(api.el('span', 'yesno-label', api.T('screen.yesno.prompt')));

      // 選択の表示(選んだとき。反転現象の取消導線=大きな表示＋すぐ隣のとりけす)
      var sel = api.el('div', 'yesno-sel hidden');
      var selMain = api.el('div', 'yesno-sel-main');
      var selEmoji = api.el('span', 'yesno-sel-emoji');
      selEmoji.setAttribute('aria-hidden', 'true');
      var selLabel = api.el('span', 'yesno-sel-label yesno-label');
      selMain.appendChild(selEmoji);
      selMain.appendChild(selLabel);
      var caption = api.el('div', 'yesno-caption', api.T('screen.yesno.selecting'));
      var cancelBtn = api.el('button', 'yesno-cancel');
      cancelBtn.type = 'button';
      cancelBtn.setAttribute('aria-label', api.T('screen.yesno.cancel'));
      var cancelIc = api.el('span', 'yesno-cancel-ic', '↩️');   // ↩️
      cancelIc.setAttribute('aria-hidden', 'true');
      cancelBtn.appendChild(cancelIc);
      cancelBtn.appendChild(api.el('span', 'yesno-label', api.T('screen.yesno.cancel')));
      sel.appendChild(selMain);
      sel.appendChild(caption);
      sel.appendChild(cancelBtn);

      panel.appendChild(prompt);
      panel.appendChild(sel);
      root.appendChild(panel);

      /* ===== えらぶ 3つ(縦いっぱい・大ボタン) ===== */
      var CHOICES = [
        { key:'yes',     emoji:'👍', cls:'yes' },      // 👍 はい
        { key:'no',      emoji:'👎', cls:'no' },       // 👎 いいえ
        { key:'unknown', emoji:'🤷', cls:'unknown' }   // 🤷 わからない
      ];
      var btns = {};
      var choiceWrap = api.el('div', 'yesno-choices');
      CHOICES.forEach(function(c){
        var word = api.T('screen.yesno.' + c.key);
        var b = api.el('button', 'yesno-btn yesno-' + c.cls);
        b.type = 'button';
        b.setAttribute('aria-label', word);   // 文字なし表示でも読み上げ機器に語が伝わる
        var e = api.el('span', 'yesno-emoji', c.emoji);
        e.setAttribute('aria-hidden', 'true');
        b.appendChild(e);
        b.appendChild(api.el('span', 'yesno-label', word));
        Tap.bind(b, function(){ select(c); });
        btns[c.key] = b;
        choiceWrap.appendChild(b);
      });
      root.appendChild(choiceWrap);

      /* ===== 状態と操作 ===== */
      function clearActive(){
        CHOICES.forEach(function(c){ btns[c.key].classList.remove('yesno-active'); });
      }
      function select(c){
        var word = api.T('screen.yesno.' + c.key);
        clearActive();
        btns[c.key].classList.add('yesno-active');
        selEmoji.textContent = c.emoji;
        selLabel.textContent = word;
        prompt.classList.add('hidden');
        sel.classList.remove('hidden');
        if(tts) speak(word, lang);   // 既定OFF。ONのときだけ「声」を出す
      }
      function clearSel(){
        clearActive();
        sel.classList.add('hidden');
        prompt.classList.remove('hidden');
        stopSpeak();
        api.toast(api.T('screen.yesno.cleared'));   // すぐ取り消せたことを そっと知らせる
      }
      Tap.bind(cancelBtn, clearSel);

      container.appendChild(root);
    }
  });

})();
