'use strict';
/* 画面: すうじ・じかん (v0.1 本実装)
   担当者向けメモ:
   ・ここは「すうじ・じかん」画面の専用ファイル。中身の実装はこのファイルの中だけで完結させる。
     app.js / router.js / i18n.js / style.css / tap.js / audio.js / 他画面ファイルは一切書き換えない。
   ・SPEC_V1 / リサーチ直結の考え方:
       - アラビア数字の“記号”を大きく主役に。失語でも数字は言語(数詞)より保たれやすいため、
         「1・2・3…」という記号そのものを見せて指して伝える。数詞(いち/に/さん)には頼らない。
       - 0〜9の すうじ盤で えらんだ数字を、上部に大きく並べて相手に「見せる」。
         訂正は「ひとつ けす(⌫)」と「ぜんぶ けす(🗑)」の2つだけ(誤タップを恥じさせない)。
       - 今の時刻を大きなデジタルで既定表示(24時間・記号のみ。AM/PM等の“語”に頼らない)。
       - 数量は 数字＋同じ数のドット を併記(小さな数の理解を助ける。5個ずつまとめて数えやすく)。
   ・医療機器には該当しない。医療をあつかう語は避け、日常の会話を助ける道具として作る。
   ・click禁止。タップは Tap.bind(tap.js の共通部品)を使う。全ボタンは44px以上・単純タップのみ。
   ・せってい(api.pref)を尊重する:
       fs(文字サイズ)   … 画面は em 指定なので body.fsN に自動追従
       showText          … OFF のときは“語”を隠して 記号(数字/アイコン/ドット)だけで機能させる
       weakSide          … 重要ボタンは中央そろえ(左右どちらの端にも寄せない=半盲配慮)
       tts(既定OFF)     … ON のときだけ「よむ(🔊)」ボタンを出す
       lang              … 日付の並びと よみあげの言語に使う
   ・自分の文言は i18n の screen.number.* だけを使う(訳文は成果物として別途返却。i18n.js は触らない)。
   ・データは端末に保存しない: 並べた数字は このセッション内だけ持つ一時値(module変数)。localStorageキーは持たない。 */
(function(){

  /* えらんだ数字(一時値)。画面を離れて戻っても、せっていの再描画が起きても消えないよう module 変数で保持する。
     消したいときは ⌫ / 🗑 で本人が消す(勝手にリセットしない)。 */
  var digits = '';

  var clockTimer = 0;       // デジタル時計の更新タイマ(再描画のたびに張り替える)
  var styleInjected = false;

  var DOT_CAP = 20;         // ドット併記は 1〜20 まで(それ以上は数字だけで十分・ドットは出さない)
  var MAX_DIGITS = 12;      // 並べられる桁数の上限(電話番号なども想定しつつ暴走を防ぐ)
  var MAX_DISP_EM = 3.2;    // 見せる数字の最大サイズ(桁が増えたら自動で縮めて画面に収める)
  var MIN_DISP_EM = 1.4;

  var LOCALE = {   // よみあげの言語タグ(12言語。数詞はこの言語で読まれる)
    ja:'ja-JP', en:'en-US', de:'de-DE', fr:'fr-FR', es:'es-ES', it:'it-IT',
    pt:'pt-PT', nl:'nl-NL', sv:'sv-SE', ko:'ko-KR', zh:'zh-CN', ar:'ar-SA'
  };

  /* いまが あさ/ひる/ゆうがた/よる のどれか(記号=絵文字は showText に関わらず常に出す。“語”は showText 尊重)。
     区切りは監修で調整可(needsReview)。 */
  function todOf(h){
    if(h >= 5 && h <= 10)  return { icon:'🌅', key:'dawn'  };
    if(h >= 11 && h <= 16) return { icon:'☀️', key:'day'   };
    if(h >= 17 && h <= 18) return { icon:'🌇', key:'eve'   };
    return { icon:'🌙', key:'night' };
  }

  /* スコープ付きCSSを1回だけ注入(クラスは number- 接頭辞＋#scr-number 配下に限定して衝突回避。
     色/フォント/押下フィードバックは style.css の既存CSS変数・.pressing を再利用して見た目を揃える) */
  function injectStyle(){
    if(styleInjected) return;
    styleInjected = true;
    var css =
      '#scr-number .number-wrap{ display:flex; flex-direction:column; gap:18px; width:100%; }' +

      /* いまの じかん(デジタル・既定) */
      '#scr-number .number-clock{ background:var(--card); border:2px solid var(--line);' +
        ' border-radius:16px; padding:16px; text-align:center; }' +
      '#scr-number .number-clock-time{ font-weight:700; line-height:1.05; letter-spacing:.02em;' +
        ' font-size:3.4em; font-variant-numeric:tabular-nums; direction:ltr; unicode-bidi:isolate; }' +
      '#scr-number .number-clock-sub{ display:flex; align-items:center; justify-content:center;' +
        ' gap:14px; margin-top:6px; color:var(--sub); flex-wrap:wrap; }' +
      '#scr-number .number-tod{ display:inline-flex; align-items:center; gap:6px; }' +
      '#scr-number .number-tod-icon{ font-size:1.5em; line-height:1; }' +
      '#scr-number .number-date{ font-variant-numeric:tabular-nums; direction:ltr; unicode-bidi:isolate; }' +

      /* すうじ(えらんで 見せる) */
      '#scr-number .number-card{ background:var(--card); border:2px solid var(--line);' +
        ' border-radius:16px; padding:14px; }' +
      '#scr-number .number-display{ min-height:1.5em; text-align:center; font-weight:700;' +
        ' line-height:1.1; font-size:3.2em; font-variant-numeric:tabular-nums;' +
        ' direction:ltr; unicode-bidi:isolate; white-space:nowrap; overflow-x:auto;' +
        ' padding:6px 4px; color:var(--ink); }' +
      '#scr-number .number-display.empty{ font-size:1em; font-weight:400; color:var(--sub); }' +

      /* かず(ドット併記) */
      '#scr-number .number-count-lbl{ text-align:center; color:var(--sub);' +
        ' font-size:.9em; margin-top:6px; }' +
      '#scr-number .number-dots{ display:flex; flex-wrap:wrap; justify-content:center;' +
        ' gap:12px; margin-top:6px; }' +
      '#scr-number .number-dotgroup{ display:flex; gap:6px; }' +
      '#scr-number .number-dot{ width:.7em; height:.7em; border-radius:50%;' +
        ' background:var(--brand); display:inline-block; }' +

      /* ていせい(けす)＋よむ。中央そろえで左右どちらの端にも寄せない(見えにくい側=weakSide 配慮) */
      '#scr-number .number-ctrl{ display:flex; justify-content:center; gap:12px;' +
        ' flex-wrap:wrap; margin:16px 0 4px; }' +
      '#scr-number .number-ctrl-btn{ min-height:52px; min-width:96px; padding:0 16px;' +
        ' border:2px solid var(--line); background:var(--card); color:var(--ink);' +
        ' border-radius:14px; font-size:1em; font-weight:700; font-family:inherit;' +
        ' display:inline-flex; align-items:center; justify-content:center; gap:8px; }' +
      '#scr-number .number-ctrl-btn .ic{ font-size:1.25em; line-height:1; }' +
      '#scr-number .number-ctrl-btn.is-off{ opacity:.4; }' +

      /* すうじ盤(6列グリッド。数字は2列ぶん=3個/行。最下段は 0 と 00 を各3列ぶん=横1.5倍で2つ並べて行を有効活用。中央そろえで weakSide 配慮) */
      '#scr-number .number-pad{ display:grid; grid-template-columns:repeat(6, 1fr);' +
        ' gap:10px; max-width:360px; margin:12px auto 0; direction:ltr; }' +
      '#scr-number .number-key{ grid-column:span 2; min-height:64px; min-width:44px; border:2px solid var(--brand);' +
        ' background:var(--card); color:var(--ink); border-radius:14px; font-size:1.9em;' +
        ' font-weight:700; font-family:inherit; font-variant-numeric:tabular-nums; }' +
      '#scr-number .number-key.wide{ grid-column:span 3; }';

    var st = document.createElement('style');
    st.id = 'css-number';
    st.textContent = css;
    var head = document.head || document.documentElement || document.body;
    if(head && head.appendChild) head.appendChild(st);
  }

  /* ⌫ / 🗑 / 🔊 用の小さなボタン生成(アイコン=記号は常に出し、“語”は showText のときだけ添える) */
  function makeCtrlBtn(el, icon, word){
    var b = el('button', 'number-ctrl-btn');
    b.setAttribute('type', 'button');
    b.appendChild(el('span', 'ic', icon));
    if(word){
      b.appendChild(el('span', 'tx', word));
      b.setAttribute('aria-label', word);
    } else {
      b.setAttribute('aria-label', icon);
    }
    return b;
  }

  window.KAIWA_SCREENS.register('number', {
    render: function(container, api){
      injectStyle();

      var T = api.T, el = api.el, pref = api.pref;
      var showText = pref.showText;

      /* 前回のデジタル時計タイマを止める(言語変更などで再描画されたときの二重起動を防ぐ) */
      if(clockTimer){ clearInterval(clockTimer); clockTimer = 0; }

      var wrap = el('div', 'number-wrap');

      /* 画面タイトル(他画面と同じ作法。中身の目印にもなる) */
      wrap.appendChild(el('h2', 'scr-title', T('screen.number.title')));

      /* ---- いまの じかん(デジタル・既定表示) ---- */
      var clock   = el('div', 'number-clock');
      var timeNode = el('div', 'number-clock-time', '');
      clock.appendChild(timeNode);
      var sub = el('div', 'number-clock-sub');
      var tod = el('span', 'number-tod');
      var todIcon = el('span', 'number-tod-icon', '');
      tod.appendChild(todIcon);
      var todWord = null;
      if(showText){ todWord = el('span', 'number-tod-word', ''); tod.appendChild(todWord); }
      sub.appendChild(tod);
      var dateNode = el('span', 'number-date', '');
      sub.appendChild(dateNode);
      clock.appendChild(sub);
      wrap.appendChild(clock);

      /* ---- すうじ(えらんで 見せる) ---- */
      var card = el('div', 'number-card');

      var dispNode = el('div', 'number-display empty', '');   // 見せる面(大きな数字)
      card.appendChild(dispNode);

      var countLbl = null;
      if(showText){
        countLbl = el('div', 'number-count-lbl hidden', T('screen.number.count'));
        card.appendChild(countLbl);
      }
      var dotsWrap = el('div', 'number-dots hidden');          // 数量ドット
      card.appendChild(dotsWrap);

      /* ていせい(けす)＋よむ */
      var ctrl = el('div', 'number-ctrl');
      var delOneBtn = makeCtrlBtn(el, '⌫', showText ? T('screen.number.delOne') : null);
      var delAllBtn = makeCtrlBtn(el, '🗑', showText ? T('screen.number.delAll') : null);
      ctrl.appendChild(delOneBtn);
      ctrl.appendChild(delAllBtn);
      var readBtn = null;
      if(pref.tts){   // よみあげは既定OFF。ONのときだけ「よむ」を出す
        readBtn = makeCtrlBtn(el, '🔊', showText ? T('screen.number.read') : null);
        ctrl.appendChild(readBtn);
      }
      card.appendChild(ctrl);

      /* すうじ盤(1〜9＋最下段は 0 と 00 を横1.5倍で2つ) */
      var pad = el('div', 'number-pad');
      ['1','2','3','4','5','6','7','8','9','0','00'].forEach(function(d){
        var k = el('button', 'number-key' + (d === '0' || d === '00' ? ' wide' : ''), d);
        k.setAttribute('type', 'button');
        k.setAttribute('aria-label', d);
        Tap.bind(k, function(){ addDigit(d); });
        pad.appendChild(k);
      });
      card.appendChild(pad);
      wrap.appendChild(card);

      container.appendChild(wrap);

      /* ---- 表示更新(closure。上で作った node 参照と digits/pref を使う) ---- */
      function fitDisplay(node){
        node.style.fontSize = MAX_DISP_EM + 'em';
        var avail = node.clientWidth;
        if(typeof avail !== 'number' || avail <= 0) return;   // 疑似DOM等では採寸不可→そのまま
        var need = node.scrollWidth;
        if(typeof need === 'number' && need > avail){
          var size = MAX_DISP_EM * (avail / need) * 0.96;     // 幅に収まるよう1発で縮小(単一行なので線形)
          if(size < MIN_DISP_EM) size = MIN_DISP_EM;          // 収まらない極端な桁数は overflow-x でスクロール
          node.style.fontSize = size.toFixed(3) + 'em';
        }
      }

      function buildDots(host, n){
        host.textContent = '';
        var made = 0;
        var groups = Math.ceil(n / 5);
        for(var g = 0; g < groups; g++){
          var grp = el('div', 'number-dotgroup');
          var inThis = Math.min(5, n - made);
          for(var i = 0; i < inThis; i++){ grp.appendChild(el('span', 'number-dot')); made++; }
          host.appendChild(grp);
        }
      }

      function updateDisplay(){
        if(!digits){
          dispNode.classList.add('empty');
          dispNode.style.fontSize = '';
          dispNode.textContent = showText ? T('screen.number.numHint') : '';
          return;
        }
        dispNode.classList.remove('empty');
        dispNode.textContent = digits;
        fitDisplay(dispNode);
      }

      function updateDots(){
        var v = digits ? parseInt(digits, 10) : 0;
        var show = (v >= 1 && v <= DOT_CAP);
        if(countLbl) countLbl.classList.toggle('hidden', !show);
        dotsWrap.classList.toggle('hidden', !show);
        if(show) buildDots(dotsWrap, v);
        else dotsWrap.textContent = '';
      }

      function updateCtrl(){
        var empty = !digits;
        delOneBtn.classList.toggle('is-off', empty);
        delAllBtn.classList.toggle('is-off', empty);
        if(readBtn) readBtn.classList.toggle('is-off', empty);
      }

      function updateAll(){ updateDisplay(); updateDots(); updateCtrl(); }

      function addDigit(d){
        if(digits.length + d.length > MAX_DIGITS) return;   // 上限は静かに無視(急かさない・叱らない。00は2桁ぶん)
        digits += d;
        updateAll();
      }

      /* よみあげ: 桁を1つずつ読む(例「1 2 3」→ いち に さん)。
         まとまりの数(百二十三)ではなく桁読みにするのは、電話番号など桁が意味を持つ場面でも正しく、
         数詞のまとまりに依存しないため。ONのときだけ。相手に声で伝えるための補助であり、
         画面には常に数字“記号”が出ているので、よみあげが無くても機能は成立する。 */
      /* Play版(Capacitor)のWebViewはWeb Speech API非対応の端末が多い→端末内蔵TTSへ橋渡し */
      var NATIVE_TTS = (function(){
        try{
          var c = window.Capacitor;
          if(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform() &&
             typeof c.registerPlugin === 'function'){ return c.registerPlugin('TextToSpeech'); }
        }catch(_){}
        return null;
      })();
      function speakDigits(){
        if(!pref.tts || !digits) return;
        var tag2 = LOCALE[pref.lang] || 'en-US';
        var txt2 = digits.split('').join(' ');
        if(NATIVE_TTS){
          try{
            NATIVE_TTS.stop().catch(function(){}).then(function(){
              NATIVE_TTS.speak({ text: txt2, lang: tag2, rate: 0.85, pitch: 1.0, volume: 1.0 }).catch(function(){});
            });
          }catch(_){}
          return;
        }
        try{
          if(!('speechSynthesis' in window)) return;
          var synth = window.speechSynthesis;
          synth.cancel();
          var u = new SpeechSynthesisUtterance(txt2);
          var tag = tag2;
          u.lang = tag;
          /* 🔴端末の既定音声(例:日本語)のままだと英数字が英語で読まれない対策=対象言語に合う音声を明示選択 */
          try{
            var vs = synth.getVoices() || [];
            var pre = tag.split('-')[0].toLowerCase();
            var v = vs.filter(function(x){ return x.lang && x.lang.toLowerCase() === tag.toLowerCase(); })[0]
                 || vs.filter(function(x){ return x.lang && x.lang.toLowerCase().indexOf(pre) === 0; })[0];
            if(v) u.voice = v;
          }catch(_){}
          u.rate = 0.85;
          synth.speak(u);
        }catch(_){}
      }

      Tap.bind(delOneBtn, function(){ if(!digits) return; digits = digits.slice(0, -1); updateAll(); });
      Tap.bind(delAllBtn, function(){ if(!digits) return; digits = ''; updateAll(); });
      if(readBtn) Tap.bind(readBtn, speakDigits);

      /* ---- デジタル時計(24時間・記号のみ) ---- */
      function updateClock(){
        var now = new Date();
        var hh = String(now.getHours()).padStart(2, '0');
        var mm = String(now.getMinutes()).padStart(2, '0');
        timeNode.textContent = hh + ':' + mm;         // 秒は出さない(急かすUIを避ける)

        var t = todOf(now.getHours());
        todIcon.textContent = t.icon;
        if(todWord) todWord.textContent = T('screen.number.' + t.key);

        try{
          dateNode.textContent = now.toLocaleDateString(LOCALE[pref.lang] || 'en-US',
            { year:'numeric', month:'numeric', day:'numeric' });
        }catch(_){
          dateNode.textContent = (now.getMonth() + 1) + '/' + now.getDate();
        }
      }

      updateClock();
      updateAll();

      clockTimer = setInterval(function(){
        /* この画面が作り直された(=時計要素が文書から外れた)ら自分で止まる。二重起動と無駄更新を防ぐ */
        if(timeNode && typeof document.contains === 'function' && !document.contains(timeNode)){
          clearInterval(clockTimer); clockTimer = 0; return;
        }
        updateClock();
      }, 1000);
      /* Node(スモークテスト)ではタイマがプロセスを生かし続けて終了しなくなるため unref。
         ブラウザでは setInterval の戻り値は数値で unref を持たないので何もしない。 */
      if(clockTimer && typeof clockTimer.unref === 'function') clockTimer.unref();
    }
  });
})();
