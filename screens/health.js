'use strict';
/* 画面: たいちょう・いたみ (v0.1 本実装)
   ・ここは「たいちょう・いたみ」画面の専用ファイル。中身はこのファイルの中だけで完結させる。
   ・SPEC_V1: 2段階。①からだの ず(まえ/うしろ)を さわって「どこ」→②かおの めやす6だんかい(まなざし〜しかめっつら)+すうじ0〜10で「どのくらい」。
     いまの ようすを かぞく・かいごの ひとに つたえる ための どうぐ。医療の はんだんは しない・きろくも のこさない
     (端末内にも いっさい ほぞんしない=これは きろくでは なく その ばで つたえる ための がめん)。
   ・自分の文言は i18n.js の screen.health.* のみ(他画面・app/nav/lock/set共有キーには触れない)。
     ※このファイルは i18n.js を書き換えない。訳文は成果物として構造化返却し、統合役が i18n.js に入れる。
   ・click禁止: すべて Tap.bind。タップ対象は44px以上・単純タップのみ(ピンチ/スワイプ/長押しなし=片麻痺前提)。
   ・app.js・router.js・style.css・他画面ファイルは変更しない。CSSは下の #css-health に1回だけ注入する。 */
(function(){

  /* かおの めやす6だんかい(まなざし〜しかめっつら)。
     なきわらい1つ顔(Wong-Baker単独)は つかわず、だいの おとなにふさわしい だんかい表現にする。
     すうじは FPS-R と おなじ 0/2/4/6/8/10(独自基準を作らず一般に知られた めやすに そろえる)。 */
  var FACES = [
    { e:'🙂', n:0 },
    { e:'😐', n:2 },
    { e:'😕', n:4 },
    { e:'😣', n:6 },
    { e:'😖', n:8 },
    { e:'😫', n:10 }
  ];

  /* からだの ず。だいたいの ぶい(こまかすぎない)。ひだり/みぎは おなじ ぶい名だが、
     さわった かたちを いろで つよく しめすので「どちらがわか」は ずが つたえる(文字は ぶい名だけ)。 */
  var FRONT = [
    { t:'ellipse', p:'head',  a:{ cx:100, cy:38,  rx:30, ry:32 } },
    { t:'rect',    p:'face',  a:{ x:80,  y:40,  width:40, height:30, rx:13 } },
    { t:'rect',    p:'neck',  a:{ x:85,  y:70,  width:30, height:18, rx:6 } },
    { t:'rect',    p:'chest', a:{ x:60,  y:88,  width:80, height:56, rx:16 } },
    { t:'rect',    p:'belly', a:{ x:62,  y:146, width:76, height:52, rx:16 } },
    { t:'rect',    p:'arm',   a:{ x:30,  y:92,  width:28, height:100, rx:13 } },
    { t:'rect',    p:'arm',   a:{ x:142, y:92,  width:28, height:100, rx:13 } },
    { t:'ellipse', p:'hand',  a:{ cx:44,  cy:200, rx:16, ry:17 } },
    { t:'ellipse', p:'hand',  a:{ cx:156, cy:200, rx:16, ry:17 } },
    { t:'rect',    p:'leg',   a:{ x:70,  y:198, width:28, height:96, rx:13 } },
    { t:'rect',    p:'leg',   a:{ x:102, y:198, width:28, height:96, rx:13 } },
    { t:'ellipse', p:'foot',  a:{ cx:84,  cy:305, rx:16, ry:14 } },
    { t:'ellipse', p:'foot',  a:{ cx:116, cy:305, rx:16, ry:14 } }
  ];
  var BACK = [
    { t:'ellipse', p:'head',  a:{ cx:100, cy:38,  rx:30, ry:32 } },
    { t:'rect',    p:'neck',  a:{ x:85,  y:70,  width:30, height:18, rx:6 } },
    { t:'rect',    p:'back',  a:{ x:60,  y:88,  width:80, height:62, rx:16 } },
    { t:'rect',    p:'waist', a:{ x:62,  y:152, width:76, height:46, rx:16 } },
    { t:'rect',    p:'arm',   a:{ x:30,  y:92,  width:28, height:100, rx:13 } },
    { t:'rect',    p:'arm',   a:{ x:142, y:92,  width:28, height:100, rx:13 } },
    { t:'ellipse', p:'hand',  a:{ cx:44,  cy:200, rx:16, ry:17 } },
    { t:'ellipse', p:'hand',  a:{ cx:156, cy:200, rx:16, ry:17 } },
    { t:'rect',    p:'leg',   a:{ x:70,  y:198, width:28, height:96, rx:13 } },
    { t:'rect',    p:'leg',   a:{ x:102, y:198, width:28, height:96, rx:13 } },
    { t:'ellipse', p:'foot',  a:{ cx:84,  cy:305, rx:16, ry:14 } },
    { t:'ellipse', p:'foot',  a:{ cx:116, cy:305, rx:16, ry:14 } }
  ];

  var CSS = [
    '.health-wrap{ width:100%; display:flex; flex-direction:column; align-items:center; gap:14px; padding-bottom:8px; }',
    '.health-intro{ margin:0; color:var(--sub); font-size:.95em; text-align:center; max-width:30em; }',
    '.health-stephead{ display:flex; align-items:center; justify-content:center; gap:8px; font-weight:700; font-size:1.05em; }',
    '.health-stepnum{ display:inline-flex; align-items:center; justify-content:center; width:1.7em; height:1.7em; border-radius:50%; background:var(--brand); color:#fff; font-weight:800; flex:none; }',
    '.health-stepicon{ font-size:1.2em; }',
    '.health-tabs{ display:flex; gap:12px; justify-content:center; width:100%; max-width:380px; }',
    '.health-tab{ flex:1 1 0; min-height:60px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; border:2px solid var(--line); background:var(--card); color:var(--ink); border-radius:14px; font-family:inherit; font-size:1em; font-weight:700; }',
    '.health-tab.sel{ border-color:var(--brand); background:var(--brand); color:#fff; }',
    '.health-tabicon{ width:26px; height:34px; display:block; color:inherit; }',
    '.health-bodywrap{ width:100%; display:flex; justify-content:center; }',
    '.health-body{ width:100%; max-width:320px; height:auto; display:block; }',
    '.health-body.hidden{ display:none; }',
    '.health-region{ fill:#cfe0d6; stroke:#7fae95; stroke-width:1.5; cursor:pointer; }',
    '.health-region.sel{ fill:var(--brand); stroke:var(--brand); stroke-width:3; }',
    '.health-region.pressing{ transform:none; filter:brightness(.9); }',
    'body[data-theme="dark"] .health-region{ fill:#3a4741; stroke:#6f867a; }',
    '.health-spine{ stroke:#7fae95; stroke-width:2; fill:none; opacity:.5; pointer-events:none; }',
    'body[data-theme="dark"] .health-spine{ stroke:#6f867a; }',
    '.health-after{ width:100%; display:flex; flex-direction:column; align-items:center; gap:14px; }',
    '.health-after.hidden{ display:none; }',
    '.health-summary{ display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:10px; min-height:1.6em; font-weight:700; }',
    '.health-summary.hidden{ display:none; }',
    '.health-sumpart{ font-size:1.25em; }',
    '.health-sumface{ font-size:1.7em; line-height:1; }',
    '.health-sumnum{ font-size:1.5em; font-weight:800; }',
    '.health-faces{ display:flex; flex-wrap:wrap; gap:10px; justify-content:center; width:100%; max-width:400px; }',
    '.health-face{ flex:0 0 auto; display:flex; flex-direction:column; align-items:center; gap:3px; min-width:60px; min-height:74px; padding:8px 6px; border:2px solid var(--line); background:var(--card); border-radius:14px; font-family:inherit; }',
    '.health-faceemoji{ font-size:2em; line-height:1; }',
    '.health-facenum{ font-size:1.2em; font-weight:800; color:var(--ink); }',
    '.health-face.sel{ border-color:var(--brand); border-width:3px; transform:translateY(-3px); box-shadow:0 4px 12px rgba(0,0,0,.18); }',
    '.health-actions{ display:flex; gap:12px; justify-content:center; flex-wrap:wrap; width:100%; }',
    '.health-actbtn{ min-height:52px; min-width:120px; padding:0 18px; display:inline-flex; align-items:center; justify-content:center; gap:8px; border:2px solid var(--line); background:var(--card); color:var(--sub); border-radius:14px; font-family:inherit; font-size:1em; font-weight:700; }',
    '.health-acticon{ font-size:1.2em; }'
  ].join('\n');

  /* スコープCSSは1回だけ head に注入。疑似DOMスモーク(document.head 無し)では何もしない(起動を止めない)。 */
  function ensureCss(){
    try{
      if(typeof document === 'undefined' || !document.head) return;
      if(document.getElementById('css-health')) return;
      var st = document.createElement('style');
      st.id = 'css-health';
      st.textContent = CSS;
      document.head.appendChild(st);
    }catch(_){ }
  }

  /* SVG要素。実ブラウザは名前空間つきで生成。疑似DOM(createElementNS 無し)では普通の要素に退避して起動を止めない。 */
  function svgEl(tag){
    try{
      if(typeof document !== 'undefined' && document.createElementNS){
        return document.createElementNS('http://www.w3.org/2000/svg', tag);
      }
    }catch(_){ }
    return document.createElement(tag);
  }
  function setAttrs(node, a){ for(var k in a){ if(a.hasOwnProperty(k)) node.setAttribute(k, a[k]); } }

  window.KAIWA_SCREENS.register('health', {
    render: function(container, api){
      ensureCss();

      var pref = api.pref || {};
      var showText = (pref.showText === undefined) ? true : !!pref.showText;

      /* ---- その場かぎりの状態(端末には いっさい ほぞんしない=きろくにしない) ---- */
      var view = 'front';        // まえ / うしろ
      var selEl = null;          // いま えらばれている ぶいの ずけい
      var selPart = null;        // ぶい名キー
      var selFaceEl = null;      // いま えらばれている かおボタン
      var faceIdx = null;        // つよさ(FACES の添字)

      /* ---- ちいさな ひとがた(タブの め印。文字が よめなくても まえ/うしろが わかる) ---- */
      function miniIcon(kind){
        var s = svgEl('svg');
        setAttrs(s, { viewBox:'0 0 26 34', 'class':'health-tabicon' });
        var head = svgEl('circle'); setAttrs(head, { cx:13, cy:7, r:5.4, fill:'none', stroke:'currentColor', 'stroke-width':1.6 });
        var body = svgEl('rect');   setAttrs(body, { x:6.4, y:12, width:13.2, height:19, rx:5, fill:'none', stroke:'currentColor', 'stroke-width':1.6 });
        s.appendChild(head); s.appendChild(body);
        if(kind === 'front'){
          var e1 = svgEl('circle'); setAttrs(e1, { cx:10.7, cy:6.6, r:1, fill:'currentColor' });
          var e2 = svgEl('circle'); setAttrs(e2, { cx:15.3, cy:6.6, r:1, fill:'currentColor' });
          s.appendChild(e1); s.appendChild(e2);
        } else {
          var sp = svgEl('line'); setAttrs(sp, { x1:13, y1:13, x2:13, y2:30, stroke:'currentColor', 'stroke-width':1.6 });
          s.appendChild(sp);
        }
        return s;
      }

      /* ---- からだの ず(まえ/うしろ) ---- */
      function buildBody(which, regions){
        var s = svgEl('svg');
        setAttrs(s, { viewBox:'0 0 200 330', 'class':'health-body' });
        s.setAttribute('role', 'group');
        regions.forEach(function(r){
          var node = svgEl(r.t);
          setAttrs(node, r.a);
          node.setAttribute('class', 'health-region');
          node.setAttribute('data-part', r.p);
          node.setAttribute('role', 'button');
          node.setAttribute('aria-label', api.T('screen.health.parts.' + r.p));
          Tap.bind(node, (function(n, part){ return function(){ selectPart(n, part); }; })(node, r.p));
          s.appendChild(node);
        });
        if(which === 'back'){
          var spine = svgEl('line');
          setAttrs(spine, { x1:100, y1:92, x2:100, y2:196 });
          spine.setAttribute('class', 'health-spine');
          s.appendChild(spine);
        }
        return s;
      }

      /* ---- ぶいを えらぶ(いつでも べつの ぶいに つけかえられる=誤タップの とりけし導線) ---- */
      function selectPart(node, part){
        if(selEl) selEl.classList.remove('sel');
        selEl = node; selPart = part;
        node.classList.add('sel');
        afterWrap.classList.remove('hidden');
        updateSummary();
      }

      /* ---- つよさを えらぶ(いつでも つけかえ可) ---- */
      function selectFace(idx, btn){
        if(selFaceEl) selFaceEl.classList.remove('sel');
        selFaceEl = btn; faceIdx = idx;
        btn.classList.add('sel');
        updateSummary();
      }

      /* ---- はじめから(えらんだ ものを ぜんぶ とりけす) ---- */
      function reset(){
        if(selEl){ selEl.classList.remove('sel'); selEl = null; }
        if(selFaceEl){ selFaceEl.classList.remove('sel'); selFaceEl = null; }
        selPart = null; faceIdx = null;
        afterWrap.classList.add('hidden');
        updateSummary();
      }

      /* ---- まえ/うしろ切替(えらんだ ぶいの ハイライトは そのまま のこす) ---- */
      function selectView(v){
        view = v;
        tabFront.classList.toggle('sel', v === 'front');
        tabBack.classList.toggle('sel', v === 'back');
        svgFront.classList.toggle('hidden', v !== 'front');
        svgBack.classList.toggle('hidden', v !== 'back');
      }

      /* ---- いま つたえている ようす(かいご/かぞくが ひとめで よめる まとめ) ----
         文字なし表示のときは ぶい名(文字)を ふせ、かお絵と すうじだけ しめす。すうじは のこす。 */
      function updateSummary(){
        summary.textContent = '';
        var has = false;
        if(showText && selPart){
          summary.appendChild(api.el('span', 'health-sumpart', api.T('screen.health.parts.' + selPart)));
          has = true;
        }
        if(faceIdx != null){
          var f = FACES[faceIdx];
          var fe = api.el('span', 'health-sumface', f.e); fe.setAttribute('aria-hidden', 'true');
          summary.appendChild(fe);
          summary.appendChild(api.el('span', 'health-sumnum', String(f.n)));
          has = true;
        }
        summary.classList.toggle('hidden', !has);
      }

      /* ---- よみあげ(せっていで ON のときだけ・声を だしにくい方の「声」) ----
         app.js は画面に TTS を渡さないため、この画面内で ブラウザ標準の音声合成を直接つかう(自己完結)。 */
      function speak(){
        try{
          if(!selPart) return;
          if(typeof window === 'undefined' || !window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
          var txt = api.T('screen.health.parts.' + selPart);
          if(faceIdx != null){ txt += ' ' + api.T('screen.health.level') + ' ' + FACES[faceIdx].n; }
          var u = new SpeechSynthesisUtterance(txt);
          var tag = (pref.lang === 'ja') ? 'ja-JP' : ((pref.lang === 'en') ? 'en-US' : (pref.lang || 'ja'));
          u.lang = tag;
          /* 🔴端末の既定音声(例:日本語)のままだと対象言語で読まれない対策=対象言語に合う音声を明示選択。
             getVoices()が空(未ロード)の時は従来どおり u.lang のみで読む(例外は出さない)。 */
          try{
            var vs = window.speechSynthesis.getVoices() || [];
            var pre = String(tag).split('-')[0].toLowerCase();
            var v = vs.filter(function(x){ return x.lang && x.lang.toLowerCase() === String(tag).toLowerCase(); })[0]
                 || vs.filter(function(x){ return x.lang && x.lang.toLowerCase().indexOf(pre) === 0; })[0];
            if(v) u.voice = v;
          }catch(_){}
          var vv = [0.6, 0.85, 1][pref.vol];
          u.volume = (vv == null) ? 1 : vv;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(u);
        }catch(_){ }
      }

      function stepHead(numChar, iconChar, wordKey){
        var h = api.el('div', 'health-stephead');
        h.appendChild(api.el('span', 'health-stepnum', numChar));
        if(iconChar){
          var ic = api.el('span', 'health-stepicon', iconChar);
          ic.setAttribute('aria-hidden', 'true');
          h.appendChild(ic);
        }
        if(showText) h.appendChild(api.el('span', 'health-stepword', api.T(wordKey)));
        return h;
      }

      function makeTab(v){
        var b = api.el('button', 'health-tab');
        b.setAttribute('type', 'button');
        var wordKey = 'screen.health.' + (v === 'front' ? 'front' : 'back');
        var icon = miniIcon(v); icon.setAttribute('aria-hidden', 'true');
        b.appendChild(icon);
        if(showText) b.appendChild(api.el('span', 'health-tabword', api.T(wordKey)));
        b.setAttribute('aria-label', api.T(wordKey));
        Tap.bind(b, function(){ selectView(v); });
        return b;
      }

      /* =============== くみたて =============== */
      var wrap = api.el('div', 'health-wrap');

      if(showText) wrap.appendChild(api.el('h2', 'scr-title', api.T('screen.health.title')));
      if(showText) wrap.appendChild(api.el('p', 'health-intro', api.T('screen.health.intro')));

      /* ① どこ */
      wrap.appendChild(stepHead('1', '📍', 'screen.health.step1'));

      var tabs = api.el('div', 'health-tabs');
      var tabFront = makeTab('front');
      var tabBack = makeTab('back');
      tabs.appendChild(tabFront); tabs.appendChild(tabBack);
      wrap.appendChild(tabs);

      var bodyWrap = api.el('div', 'health-bodywrap');
      var svgFront = buildBody('front', FRONT);
      var svgBack = buildBody('back', BACK);
      bodyWrap.appendChild(svgFront); bodyWrap.appendChild(svgBack);
      wrap.appendChild(bodyWrap);

      /* ② どのくらい(ぶいを えらぶまでは かくす=いちどに 出しすぎない) */
      var afterWrap = api.el('div', 'health-after');
      afterWrap.classList.add('hidden');

      var summary = api.el('div', 'health-summary');
      summary.classList.add('hidden');
      afterWrap.appendChild(summary);

      afterWrap.appendChild(stepHead('2', '', 'screen.health.step2'));

      var faces = api.el('div', 'health-faces');
      FACES.forEach(function(f, i){
        var b = api.el('button', 'health-face');
        b.setAttribute('type', 'button');
        var em = api.el('span', 'health-faceemoji', f.e); em.setAttribute('aria-hidden', 'true');
        var nu = api.el('span', 'health-facenum', String(f.n));
        b.appendChild(em); b.appendChild(nu);
        b.setAttribute('aria-label', String(f.n));
        Tap.bind(b, (function(idx, btn){ return function(){ selectFace(idx, btn); }; })(i, b));
        faces.appendChild(b);
      });
      afterWrap.appendChild(faces);

      var actions = api.el('div', 'health-actions');
      var resetBtn = api.el('button', 'health-actbtn');
      resetBtn.setAttribute('type', 'button');
      var ri = api.el('span', 'health-acticon', '↺'); ri.setAttribute('aria-hidden', 'true');
      resetBtn.appendChild(ri);
      if(showText) resetBtn.appendChild(api.el('span', null, api.T('screen.health.restart')));
      resetBtn.setAttribute('aria-label', api.T('screen.health.restart'));
      Tap.bind(resetBtn, reset);
      actions.appendChild(resetBtn);

      if(pref.tts){
        var spBtn = api.el('button', 'health-actbtn');
        spBtn.setAttribute('type', 'button');
        var si = api.el('span', 'health-acticon', '🔊'); si.setAttribute('aria-hidden', 'true');
        spBtn.appendChild(si);
        if(showText) spBtn.appendChild(api.el('span', null, api.T('screen.health.speak')));
        spBtn.setAttribute('aria-label', api.T('screen.health.speak'));
        Tap.bind(spBtn, speak);
        actions.appendChild(spBtn);
      }
      afterWrap.appendChild(actions);

      wrap.appendChild(afterWrap);
      container.appendChild(wrap);

      selectView('front');
      updateSummary();
    }
  });
})();
