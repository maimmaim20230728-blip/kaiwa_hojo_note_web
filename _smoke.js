'use strict';
/* 会話補助ノート・そよぎ 起動スモークテスト(疑似DOM)。そよぎ式スケジューラーの _smoke.js を踏襲
   実在idだけ返す疑似DOMで audio.js + tap.js + i18n.js + screens/router.js + screens/*.js + app.js を起動し検証する。
   ・起動→ホーム表示・ja文言・5カテゴリのナビが常に見える
   ・ナビタップで各カテゴリ画面へ遷移(v0.1はタイトル+じゅんびちゅう表示のみ)
   ・ヘッダーの名前タップでホームに戻る
   ・作成モードの鍵(既定施錠・連打解錠・せっていの「本人使用モードに もどす」で再施錠)
   ・せってい(文字サイズ/カードの文字/よみあげ(既定OFF)/見えにくい側/いろ/おとのおおきさ/言語en)
   ・機種変更(かきだす/よみこむ)
   ・データ整合(i18n の ja/en キー構造)
   使い方: node _smoke.js  */
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));

/* ---- 疑似DOM要素 ---- */
function makeEl(tag){
  const node = {
    tagName:(tag || 'div').toUpperCase(),
    children:[], style:{}, dataset:{}, _ev:{}, _attr:{},
    className:'', value:'', placeholder:'', src:'', href:'', download:'', alt:'',
    type:'', hidden:false, disabled:false, lang:'', dir:'',
    appendChild(c){ this.children.push(c); return c; },
    setAttribute(k, v){ this._attr[k] = v; },
    getAttribute(k){ return (k in this._attr) ? this._attr[k] : null; },
    addEventListener(t, h){ (this._ev[t] = this._ev[t] || []).push(h); },
    removeEventListener(){},
    focus(){}, click(){}, remove(){},
    classList:{
      _s:new Set(),
      add(...c){ c.forEach(x => this._s.add(x)); },
      remove(...c){ c.forEach(x => this._s.delete(x)); },
      toggle(c, f){ if(f === undefined) f = !this._s.has(c); if(f) this._s.add(c); else this._s.delete(c); return f; },
      contains(c){ return this._s.has(c); }
    },
    querySelector(){ return makeEl(); },
    querySelectorAll(){ return []; }
  };
  let _text = '';
  Object.defineProperty(node, 'textContent', {
    get(){ return _text; },
    set(v){ _text = (v == null ? '' : String(v)); node.children.length = 0; }
  });
  return node;
}

const created = {};
function byId(id){
  if(!ids.has(id)) return null;
  if(!created[id]) created[id] = makeEl();
  return created[id];
}

/* ---- ツリー探索・イベント発火 ---- */
function tapEl(elm){
  if(!elm) return;
  const d = { pointerId:1, isPrimary:true, clientX:0, clientY:0, preventDefault(){} };
  (elm._ev.pointerdown || []).forEach(h => h(d));
  (elm._ev.pointerup   || []).forEach(h => h({ pointerId:1, clientX:0, clientY:0 }));
}
function fire(elm, type, ev){ (elm._ev[type] || []).forEach(h => h(ev || {})); }
function allText(node){
  let s = node.textContent || '';
  for(const c of node.children) s += ' ' + allText(c);
  return s;
}

/* ---- sandbox ---- */
const lsData = {};
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  Date, Math, JSON, String, parseInt, parseFloat, Object,
  localStorage: {
    getItem: k => (k in lsData) ? lsData[k] : null,
    setItem: (k, v) => { lsData[k] = String(v); },
    removeItem: k => { delete lsData[k]; }
  },
  navigator: {},
  location: { protocol: 'file:' },
  document: {
    getElementById: byId,
    createElement: makeEl,
    documentElement: makeEl('html'),
    body: makeEl('body'),
    addEventListener(){},
    querySelector(){ return null; },
    querySelectorAll(){ return []; },
    visibilityState: 'visible'
  },
  URL: { createObjectURL(){ return 'blob:mock'; }, revokeObjectURL(){} },
  FileReader: function(){
    this.readAsText = function(f){ this.result = f._text; if(this.onload) this.onload(); };
  }
};
sandbox.Blob = function(parts, opts){ this.parts = parts; this.opts = opts; sandbox.__lastBlob = this; };
sandbox.window = sandbox;
vm.createContext(sandbox);

for(const f of ['audio.js','tap.js','i18n.js','screens/router.js','screens/yesno.js','screens/health.js','screens/photo.js','screens/number.js','screens/kana.js','app.js']){
  vm.runInContext(fs.readFileSync(__dirname + '/' + f, 'utf8'), sandbox, { filename: f });
}
const evalCtx = code => vm.runInContext(code, sandbox);

/* ---- 検証 ---- */
let ok = 0, ng = 0;
function check(name, cond){
  if(cond){ ok++; console.log('  OK ' + name); }
  else { ng++; console.error('  NG ' + name); }
}

console.log('[1] 起動・ホーム表示・ja文言・5カテゴリのナビ');
check('ホームが表示されている', !created['scr-home'].classList.contains('hidden'));
check('はい・いいえ画面は隠れている', created['scr-yesno'].classList.contains('hidden'));
check('アプリ名がjaで出る', created['hd-title'].textContent === '会話補助ノート・そよぎ');
check('ホームの見出しがjaで出る', created['home-name'].textContent === '会話補助ノート・そよぎ');
check('ホームの案内文が出る', created['home-welcome'].textContent === 'したの ボタンから えらんでください');
check('ナビ5カテゴリがjaラベルで出る(はい・いいえ)', created['nav-yesno'].textContent === 'はい・いいえ');
check('ナビ5カテゴリがjaラベルで出る(ことば)', created['nav-kana'].textContent === 'ことば');
check('本人使用モードでも5カテゴリのナビは隠れない', !created['nav-yesno'].classList.contains('hidden'));
check('せっていナビは本人使用モードで隠れている', created['nav-set'].classList.contains('hidden'));

console.log('[1b] ホームの大ボタン(5カテゴリ・フッターと同じ行き先)');
check('ホームに大ボタンが5つある', created['home-cats'].children.length === 5);
check('大ボタンにナビと同じjaラベルが入る(はい・いいえ)', allText(created['home-cats']).indexOf('はい・いいえ') >= 0);
check('大ボタンにナビと同じjaラベルが入る(ことば)', allText(created['home-cats']).indexOf('ことば') >= 0);
tapEl(created['home-cats'].children[2]);   // 3つ目=ひと・しゃしん(photo)
check('ホーム大ボタンでカテゴリへ遷移(ひと・しゃしん)', !created['scr-photo'].classList.contains('hidden'));
check('大ボタン遷移でホームは隠れる', created['scr-home'].classList.contains('hidden'));
check('大ボタン遷移でナビのactiveが付く', created['nav-photo'].classList.contains('active'));
tapEl(created['hd-title']);                // ホームに戻して後続テストの前提を保つ
check('ヘッダー名前タップでホームに戻る', !created['scr-home'].classList.contains('hidden'));

console.log('[2] カテゴリ画面遷移(プレースホルダー描画)');
tapEl(created['nav-yesno']);
check('はい・いいえ画面へ遷移', !created['scr-yesno'].classList.contains('hidden'));
check('ホームは隠れる', created['scr-home'].classList.contains('hidden'));
check('タイトルが描画される', allText(created['scr-yesno']).indexOf('はい・いいえ') >= 0);
check('えらぶ3択(はい・いいえ・わからない)が描画される', ['はい','いいえ','わからない'].every(w => allText(created['scr-yesno']).indexOf(w) >= 0));
check('ナビのactiveがyesnoに付く', created['nav-yesno'].classList.contains('active'));

tapEl(created['nav-health']);
check('たいちょう・いたみ画面へ遷移', !created['scr-health'].classList.contains('hidden'));
check('はい・いいえ画面は隠れる', created['scr-yesno'].classList.contains('hidden'));
check('たいちょう・いたみのタイトルが描画される', allText(created['scr-health']).indexOf('たいちょう・いたみ') >= 0);

tapEl(created['nav-photo']);
check('ひと・しゃしん画面へ遷移', allText(created['scr-photo']).indexOf('ひと・しゃしん') >= 0);
tapEl(created['nav-number']);
check('すうじ・じかん画面へ遷移', allText(created['scr-number']).indexOf('すうじ・じかん') >= 0);
tapEl(created['nav-kana']);
check('ことば画面へ遷移', allText(created['scr-kana']).indexOf('ことば') >= 0);

console.log('[3] ヘッダー名前タップ = いつでもホームへ');
tapEl(created['hd-title']);
check('ホームに戻る', !created['scr-home'].classList.contains('hidden'));
check('ことば画面は隠れる', created['scr-kana'].classList.contains('hidden'));
check('カテゴリのactiveも外れる', !created['nav-kana'].classList.contains('active'));

console.log('[4] 作成モードの鍵(既定施錠・連打解錠)');
check('既定は施錠(せっていナビが隠れる)', created['nav-set'].classList.contains('hidden'));
check('ロックアイコンは🔒', byId('hd-lock').textContent === '🔒');
check('回数ボタンの既定は「5かい」(せってい未表示でも文言は反映済み)', byId('btn-tapn').textContent === '5かい');
for(let i = 0; i < 5; i++) tapEl(byId('hd-lock'));   // 5連打
check('5連打で解錠→せっていナビが出る', !created['nav-set'].classList.contains('hidden'));
check('ロックアイコンが🔓に', byId('hd-lock').textContent === '🔓');
tapEl(byId('hd-lock'));   // 解錠中に誤ってもう一度タップ
check('解錠中はヘッダータップでは施錠されない(誤タップ防止)', byId('hd-lock').textContent === '🔓' && !created['nav-set'].classList.contains('hidden'));

console.log('[5] せってい画面(文字サイズ/カードの文字/よみあげ/見えにくい側/いろ/おとのおおきさ/言語)');
tapEl(created['nav-set']);
check('せってい画面へ遷移', !created['scr-set'].classList.contains('hidden'));
check('回数ボタンの既定は「5かい」', byId('btn-tapn').textContent === '5かい');
check('よみあげの既定はOFF(SPEC_V1確定)', byId('btn-tts').textContent === 'OFF');
tapEl(byId('btn-tts'));
check('よみあげをONにできる', byId('btn-tts').textContent === 'ON');
tapEl(byId('btn-tts'));
check('もう一度でOFFに戻せる', byId('btn-tts').textContent === 'OFF');

tapEl(byId('btn-fs'));
check('body classにfs1が入る(文字サイズ)', sandbox.document.body.className.indexOf('fs1') >= 0);
check('もじの大きさボタン表示も更新', byId('btn-fs').textContent === '大きい');

tapEl(byId('btn-showtext'));
check('カードの文字をOFFにできる', byId('btn-showtext').textContent === 'OFF');
tapEl(byId('btn-showtext'));
check('もう一度でONに戻る', byId('btn-showtext').textContent === 'ON');

check('見えにくい側の既定は「なし」', byId('btn-weakside').textContent === 'なし');
tapEl(byId('btn-weakside'));
check('見えにくい側が「ひだり」に切り替わる', byId('btn-weakside').textContent === 'ひだり');
tapEl(byId('btn-weakside'));
check('見えにくい側が「みぎ」に切り替わる', byId('btn-weakside').textContent === 'みぎ');

tapEl(byId('btn-theme'));
check('テーマがみずいろに', sandbox.document.body.getAttribute('data-theme') === 'aqua');
check('いろボタン表示も更新', byId('btn-theme').textContent === 'みずいろ');

check('BGMの既定は「1」(音1・小さい音で流れる)', byId('btn-bgm').textContent === '1');
check('SoundのBGMは既定で有効', evalCtx('Sound.bgmEnabled') === true);
tapEl(byId('btn-bgm'));
check('BGMボタンが「2」に切り替わる', byId('btn-bgm').textContent === '2');
check('SoundのBGMは有効のまま', evalCtx('Sound.bgmEnabled') === true);
tapEl(byId('btn-bgm'));
check('BGMボタンが「なし」に切り替わる', byId('btn-bgm').textContent === 'なし');
check('SoundのBGMが無効化される', evalCtx('Sound.bgmEnabled') === false);
tapEl(byId('btn-bgm'));
check('BGMボタンが「1」に戻る', byId('btn-bgm').textContent === '1');
check('SoundのBGMが再び有効になる', evalCtx('Sound.bgmEnabled') === true);

tapEl(byId('btn-vol'));
check('おとのおおきさが「おおきい」に', byId('btn-vol').textContent === 'おおきい');
check('Soundの音量にも反映(vol=2)', evalCtx('Sound.vol') === 2);

created['set-lang'].value = 'en';
fire(created['set-lang'], 'change');
check('ナビが英語(Yes / No)に', created['nav-yesno'].textContent === 'Yes / No');
check('html langがenに', sandbox.document.documentElement.lang === 'en');
tapEl(created['nav-yesno']);
check('遷移先のカテゴリ画面も英語で描画される', allText(created['scr-yesno']).indexOf('Not sure') >= 0);
tapEl(created['nav-set']);
created['set-lang'].value = 'ja';
fire(created['set-lang'], 'change');
check('jaに戻せる', created['nav-yesno'].textContent === 'はい・いいえ');

console.log('[6] せってい→「本人使用モードに もどす」で再施錠');
tapEl(byId('btn-lock'));
check('再施錠でせっていナビが隠れる', created['nav-set'].classList.contains('hidden'));
check('ロックアイコンが🔒に戻る', byId('hd-lock').textContent === '🔒');
check('ホームに戻る', !created['scr-home'].classList.contains('hidden'));

console.log('[7] 機種変更: かきだす / よみこむ(v0.1はせってい値のみ)');
for(let i = 0; i < 5; i++) tapEl(byId('hd-lock'));   // 再度解錠
tapEl(created['nav-set']);
tapEl(byId('bk-export'));
const blobJson = sandbox.__lastBlob ? JSON.parse(sandbox.__lastBlob.parts.join('')) : null;
check('Blobにアプリ名が入る', !!blobJson && blobJson.app === 'kaiwa_hojo_note');
check('Blobにせってい値が入る', !!blobJson && blobJson.prefs && blobJson.prefs.lang === 'ja');
const good = JSON.stringify({ app:'kaiwa_hojo_note', ver:1,
  prefs:{ lang:'ja', fs:0, showText:true, tts:true, weakSide:'left', theme:'dark', vol:1, tapUnlock:5 } });
fire(created['bk-file'], 'change', { target:{ files:[{ _text: good }], value:'' } });
check('せってい値が差し替わる(テーマ=くろ)', sandbox.document.body.getAttribute('data-theme') === 'dark');
check('よみあげ設定も反映(ON)', byId('btn-tts').textContent === 'ON');
fire(created['bk-file'], 'change', { target:{ files:[{ _text: JSON.stringify({ app:'other_app' }) }], value:'' } });
check('別アプリのファイルは拒否', created['toast'].textContent.indexOf('よみこめませんでした') >= 0);

console.log('[8] データ整合(i18n の ja/en キー構造)');
const I18 = evalCtx('window.KAIWA_I18N');
check('ja/enテーブルが両方読める', !!I18.ja && !!I18.en);
check('5カテゴリぶん screen.* が両言語にある', ['yesno','health','photo','number','kana'].every(id => I18.ja.screen[id] && I18.en.screen[id]));
check('KAIWA_SCREENSに5画面すべて登録されている', evalCtx('window.KAIWA_SCREENS.ids()').length === 5);

/* ---- [v0.1.4] ステータスバー/ナビゲーションバーに食い込まない(セーフエリア対応) ----
   targetSdk36(Android15+)はエッジtoエッジ強制で、WebViewが端末のステータスバーの下・
   ナビゲーションバーの下まで描かれる。固定pxのままだとヘッダーが時計と重なり、
   トーストはナビバーぶんだけ本来より下寄りに出る。index.html に viewport-fit=cover があるので
   env(safe-area-inset-*) で足りない分を補う。 */
console.log('[セーフエリア] 端末のバーに食い込まない');
const cssTxt = fs.readFileSync(__dirname + '/style.css', 'utf8').replace(/\s+/g, '');
check('viewport に viewport-fit=cover がある(env()が効く前提)', /viewport-fit=cover/.test(html));
check('ヘッダーの上余白に env(safe-area-inset-top)(時計と重ならない)',
  /header#hd\{[^}]*padding:calc\(12px\+env\(safe-area-inset-top\)\)16px12px/.test(cssTxt));
check('トーストの bottom に env(safe-area-inset-bottom)',
  /\.toast\{[^}]*bottom:calc\(96px\+env\(safe-area-inset-bottom\)\)/.test(cssTxt));
check('下ナビの下余白に env(safe-area-inset-bottom)',
  /#navbar\{[^}]*padding-bottom:env\(safe-area-inset-bottom\)/.test(cssTxt));
const photoTxt = fs.readFileSync(__dirname + '/screens/photo.js', 'utf8').replace(/\s+/g, '');
check('しゃしんの全画面オーバーレイが上下ともセーフエリア対応(注入CSSは行分割のため padding 行を見る)',
  /\.photo-ov\{position:fixed;inset:0;/.test(photoTxt) &&
  /'padding:calc\(20px\+env\(safe-area-inset-top\)\)16pxcalc\(24px\+env\(safe-area-inset-bottom\)\);\}'/.test(photoTxt));
/* 版数の取り違え防止(build.gradle=正・アプリ内表示の据え置きを機械で弾く。
   Web版のフォルダには android/ が無いのでその時だけ飛ばす) */
const gradlePath = __dirname + '/android/app/build.gradle';
if(fs.existsSync(gradlePath)){
  const gradleVer = (fs.readFileSync(gradlePath, 'utf8').match(/versionName\s+"([^"]+)"/) || [])[1];
  check('build.gradle の versionName とせっていの版表示が一致', byId('about-ver').textContent === 'v' + gradleVer);
  check('package.json の version も一致',
    JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8')).version === gradleVer);
}

console.log('');
if(ng){ console.error('SMOKE NG: ' + ng + '件 失敗 / OK ' + ok + '件'); process.exit(1); }
console.log('SMOKE OK: 全' + ok + '件 合格');
