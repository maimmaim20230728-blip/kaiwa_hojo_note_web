'use strict';
/* 会話補助ノート・そよぎ 本体(v0.1・起動する骨組みのみ)
   ・失語症の方の日常のコミュニケーションを助ける「見せる・指す・伝える」ノート(そよぎAAC姉妹作)。
     位置づけは一貫して日常のコミュニケーション支援。医療機器には該当しない(SPEC_V1参照)。
   ・端末内だけに保存(localStorage)・完全オフライン・匿名・広告なし
   ・click禁止: 操作は全て Tap.bind(tap.js)。select/file input だけはネイティブイベント
   ・v0.1はホーム+5カテゴリの画面遷移+せっていのシェルのみ。カテゴリ本文は screens/*.js が並行担当で実装する
     (このファイルは画面ルーターと共有シェルだけを持ち、カテゴリの中身には踏み込まない)
   ・作成/本人使用モード分離はそよぎ式スケジューラー(soyogi_scheduler)方式を踏襲:
     既定=本人使用(5カテゴリのナビは常に見える・せっていだけ隠す)。ヘッダー連打で作成モード。
     戻すは せっていの「本人使用モードに もどす」ボタンのみ。起動のたびに施錠から始める。 */
(function(){

const VER = '0.1.9';
const LS_PREF = 'kaiwa.pref.v1';

/* 12言語対応(ja/en + de/fr/es/it/pt/nl/sv/ko/zh/ar)。翻訳テーブルは i18n.js。
   RTL言語(ar など)は RTL_LANGS に足す = applyI18n が dir を rtl に切替える */
const LANGS = ['ja','en','de','fr','es','it','pt','nl','sv','ko','zh','ar'];
const RTL_LANGS = ['ar'];
const THEMES = ['green','aqua','white','dark'];
const BGMS = ['off','green','blue'];          // 生成BGM(2曲)。既定off。そよぎ式スケジューラー方式を移植
const WEAK_SIDES = ['none','left','right'];   // 見えにくい側(半盲配慮・SPEC_V1)

const $ = id => document.getElementById(id);
const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(txt != null) e.textContent = txt;
  return e;
};

function loadJSON(key){
  try{ const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; }
  catch(_){ return null; }
}
function saveJSON(key, val){
  try{ localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch(_){ return false; }
}

/* ---- 設定(ホワイトリスト経由) ---- */
function sanitizePref(p){
  p = p || {};
  return {
    lang:  LANGS.indexOf(p.lang) >= 0 ? p.lang : 'ja',
    fs:    [0,1,2].indexOf(p.fs) >= 0 ? p.fs : 0,
    showText: (p.showText === undefined) ? true : !!p.showText,   // カードの文字を出すか(文字なし表示にも対応)
    tts:   !!p.tts,                                                // よみあげ(TTS)。既定OFF(SPEC_V1確定事項)
    weakSide: WEAK_SIDES.indexOf(p.weakSide) >= 0 ? p.weakSide : 'none',
    theme: THEMES.indexOf(p.theme) >= 0 ? p.theme : 'green',
    bgm:   BGMS.indexOf(p.bgm) >= 0 ? p.bgm : 'green',   // 生成BGM(既定=音1 green・小さい音で流れる。設定でなし/2に変更可)
    vol:   [0,1,2].indexOf(p.vol) >= 0 ? p.vol : 1,
    tapUnlock: (p.tapUnlock >= 3 && p.tapUnlock <= 10) ? (p.tapUnlock | 0) : 5   // 作成モードに入る連打回数(3〜10)
  };
}
let pref = sanitizePref(loadJSON(LS_PREF));
function savePref(){ saveJSON(LS_PREF, pref); }
function next(list, cur){ return list[(list.indexOf(cur) + 1) % list.length]; }

/* ---- i18n ---- */
function walk(obj, key){
  return key.split('.').reduce((a, c) => (a && a[c] !== undefined) ? a[c] : undefined, obj);
}
function T(key){
  const tbl = window.KAIWA_I18N;
  const v = walk(tbl[pref.lang] || tbl.ja, key);
  return (v === undefined) ? walk(tbl.ja, key) : v;
}

/* 静的要素id → i18nキー(疑似DOMスモークで機械検証できるよう明示マップ方式。そよぎ式スケジューラーと同じ考え方) */
const I18N_MAP = {
  'hd-title':'app.name',
  'home-name':'app.name', 'home-tagline':'app.tagline', 'home-welcome':'home.welcome',
  'nav-yesno':'nav.yesno', 'nav-health':'nav.health', 'nav-photo':'nav.photo', 'nav-number':'nav.number', 'nav-kana':'nav.kana', 'nav-set':'nav.set',
  'hd-lock-hint':'lock.hdHint',
  'lock-note':'lock.setNote', 'btn-lock':'lock.toSelf', 'lbl-tapn':'lock.tapN',
  'set-h-normal':'set.hNormal', 'lbl-fs':'set.fs', 'lbl-showtext':'set.showText', 'lbl-tts':'set.tts',
  'lbl-weakside':'set.weakSide', 'lbl-theme':'set.theme', 'lbl-bgm':'set.bgm', 'lbl-vol':'set.vol',
  'set-h-backup':'set.hBackup', 'bk-hint':'set.bkHint', 'bk-export':'set.bkExport', 'bk-import':'set.bkImport',
  'link-privacy':'set.privacy', 'about-credit':'set.credit',
  'lbl-guide':'guide.title', 'btn-guide':'guide.again'   // はじめての つかいかた を もう一度(せっていの行・2026-09-30)
};

/* ---- 画面ルーター ----
   ホーム/せっていはこのファイルが直接描画する(共有シェル)。
   カテゴリ5画面(yesno/health/photo/number/kana)は screens/<id>.js が window.KAIWA_SCREENS に登録した
   モジュールの render(container, api) を呼ぶだけ(中身には踏み込まない・並行実装OK) */
const CATS = ['yesno','health','photo','number','kana'];
const SCR_IDS = { home:'scr-home', yesno:'scr-yesno', health:'scr-health', photo:'scr-photo', number:'scr-number', kana:'scr-kana', set:'scr-set' };
let currentScreen = 'home';

/* ホームの大ボタン用アイコン(各カテゴリ画面の主役の絵を流用=見た人が思い出せる目印。
   ラベルは nav.* を流用するので生文字列は持たない。医療をあつかう語は使わない) */
const HOME_CAT_ICON = { yesno:'👍', health:'🧍', photo:'📷', number:'🔢', kana:'✍️' };
const homeCatLabels = {};   // screen -> { label, btn } (applyI18nで訳し直す)

function screenApi(){
  return {
    T: T,
    el: el,
    pref: Object.assign({}, pref),   // 読み取り専用スナップショット(画面側で書き換えても保存されない)
    toast: toast,
    ask: askBox                      // 確かめの窓(2026-09-30)。ask(文, function(はい){...})。Play版はアプリの中の「いいえ / はい」・Web版は confirm
  };
}
function renderCategory(id){
  const container = $(SCR_IDS[id]);
  if(!container) return;
  container.textContent = '';
  const mod = window.KAIWA_SCREENS && window.KAIWA_SCREENS.get(id);
  if(mod){
    try{ mod.render(container, screenApi()); }
    catch(err){ console.error('screen render error:', id, err); }
  } else {
    container.appendChild(el('p', 'placeholder-note', '(未登録の画面: ' + id + ')'));
  }
}
function showScreen(id){
  currentScreen = id;
  for(const k in SCR_IDS){ const s = $(SCR_IDS[k]); if(s) s.classList.toggle('hidden', k !== id); }
  for(const c of CATS){ const b = $('nav-' + c); if(b) b.classList.toggle('active', c === id); }
  const setBtn = $('nav-set'); if(setBtn) setBtn.classList.toggle('active', id === 'set');
  if(CATS.indexOf(id) >= 0) renderCategory(id);
}

/* ホームの大ボタン(5カテゴリ)を作る。フッターナビと同じ showScreen(c) を呼ぶ=同じ行き先。
   作成/本人使用モードに関係なく常に見せる(本人を迷わせない)。ラベルは applyI18n で訳す。 */
function buildHomeCats(){
  const wrap = $('home-cats');
  if(!wrap) return;
  wrap.textContent = '';
  CATS.forEach(function(c){
    const b = el('button', 'home-cat-btn');
    b.type = 'button';
    b.setAttribute('data-screen', c);
    const ic = el('span', 'home-cat-ic', HOME_CAT_ICON[c]);
    ic.setAttribute('aria-hidden', 'true');
    const lb = el('span', 'home-cat-label', T('nav.' + c));
    b.appendChild(ic);
    b.appendChild(lb);
    Tap.bind(b, function(){ showScreen(c); });
    homeCatLabels[c] = { label: lb, btn: b };
    wrap.appendChild(b);
  });
}

/* ---- 作成モードの鍵(そよぎ式スケジューラー方式踏襲) ----
   既定=本人使用モード。5カテゴリの本人向けナビは常に見える(本人を迷わせない・隠さない)。
   「せってい」だけを隠し、ヘッダー🔒の連打(既定5回)で作成モードに入る。
   戻すは せっていの「本人使用モードに もどす」ボタンのみ。起動のたびに施錠から始める。 */
let locked = true;
function applyLock(){
  $('nav-set').classList.toggle('hidden', locked);
  $('hd-lock').textContent = locked ? '🔒' : '🔓';
  const hh = $('hd-lock-hint'); if(hh) hh.classList.toggle('hidden', !locked);
  if(locked && currentScreen === 'set') showScreen('home');
}
function unlock(){ if(!locked) return; locked = false; applyLock(); toast(T('lock.unlocked')); }
function lock(){ locked = true; showScreen('home'); applyLock(); toast(T('lock.locked')); }
let tapCount = 0, lastTap = 0;
const TAP_WINDOW = 1200;
function onLockTap(){
  if(!locked) return;   // 解錠中はヘッダータップで施錠しない(本人モードに戻すのは せってい のボタンだけ)
  const now = Date.now();
  if(now - lastTap > TAP_WINDOW) tapCount = 0;
  lastTap = now; tapCount++;
  if(tapCount >= pref.tapUnlock){ tapCount = 0; unlock(); }
  else { toast(T('lock.hint').replace('{n}', String(pref.tapUnlock - tapCount))); }
}
function cycleTapN(){
  pref.tapUnlock = pref.tapUnlock >= 10 ? 3 : pref.tapUnlock + 1;
  savePref(); applyI18n();
}

/* ---- 見た目/音 ---- */
function applyTheme(){ document.body.setAttribute('data-theme', pref.theme); }
function applyBodyClass(){ document.body.className = 'fs' + pref.fs; }
function applyBgm(){
  if(pref.bgm !== 'off') Sound.setBgmMode(pref.bgm);
  Sound.setBgmEnabled(pref.bgm !== 'off');
}

/* ---- i18n適用 ---- */
function applyI18n(){
  for(const id in I18N_MAP){ const e = $(id); if(e) e.textContent = T(I18N_MAP[id]); }
  for(const c of CATS){                                    // ホームの大ボタンも nav.* で訳し直す(言語切替に追従)
    const h = homeCatLabels[c];
    if(h){ h.label.textContent = T('nav.' + c); h.btn.setAttribute('aria-label', T('nav.' + c)); }
  }
  document.documentElement.lang = pref.lang;
  document.documentElement.dir = (RTL_LANGS.indexOf(pref.lang) >= 0) ? 'rtl' : 'ltr';
  $('btn-fs').textContent = T('set.fsSizes')[pref.fs];
  $('btn-showtext').textContent = pref.showText ? T('set.on') : T('set.off');
  $('btn-tts').textContent = pref.tts ? T('set.on') : T('set.off');
  $('btn-weakside').textContent = T('set.weakSides')[WEAK_SIDES.indexOf(pref.weakSide)];
  $('btn-theme').textContent = T('set.themes')[THEMES.indexOf(pref.theme)];
  $('btn-bgm').textContent = T('set.bgms')[BGMS.indexOf(pref.bgm)];
  $('btn-vol').textContent = T('set.vols')[pref.vol];
  $('btn-tapn').textContent = pref.tapUnlock + T('lock.times');
  $('about-ver').textContent = 'v' + VER;
  if(CATS.indexOf(currentScreen) >= 0) renderCategory(currentScreen);   // 表示中のカテゴリ画面も訳し直す
  if(guideOv) guideOv._draw();                                          // はじめての つかいかた も訳し直す(いまのページのまま)
}
function applyAll(){
  applyBodyClass();
  applyTheme();
  applyBgm();
  Sound.setVol(pref.vol);
  $('set-lang').value = pref.lang;
  applyI18n();
}

/* ---- Play版(Capacitor)だけで使う部品(2026-09-30・キットの templates/app.js と同じ考え方) ----
   🔴 プラグインはネイティブが入れる Capacitor.Plugins.X を使う(registerPlugin は @capacitor/core の関数で WebView には無い)。
   Web版(ブラウザ)では isNativeApp() が false なので、どれも動かない */
function isNativeApp(){
  try{ const c = window.Capacitor; return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform()); }catch(_){ return false; }
}
function nativePlugin(name, fn){
  try{
    const c = window.Capacitor;
    if(typeof c.isPluginAvailable === 'function' && !c.isPluginAvailable(name)) return null;
    const p = c.Plugins && c.Plugins[name];
    return (p && typeof p[fn] === 'function') ? p : null;
  }catch(_){ return null; }
}

/* ---- Play版のファイル保存(2026-09-30) ----
   Capacitor 8 の WebView には DownloadListener が無く、<a download> では何も保存されない(なのに「かきだしました」と出ていた)。
   端末の一時フォルダ(CACHE)に書いてから Android の共有の画面を出し、保存先は利用者が選ぶ。
   done('ok')=送り先を選べた / done('quiet')=共有の画面を閉じた(何も出さない) / done('fail')=書けない・共有できない・プラグインが無い
   機種変更のファイルに写真も入れた(2026-09-30 深夜)ので、写真が多いとファイルが大きくなる(1まい 数十KB)。まるごと1回で渡すと
   大きな文字列がネイティブとの橋渡しを通り、メモリが足りずに止まるおそれがある。音の箱庭の WAV と同じく、768KB(base64 で 1MB)ずつに分け、
   1つ目を writeFile・2つ目からを appendFile で同じファイルに足していく(バイトで分けるので、字の途中で切れても つなぐと元どおり)。
   書いている間にもう一度押されても、同じファイルに重ねて書かない(何もしない) */
function shareQuiet(err){
  const m = String((err && (err.message || err.errorMessage)) || err || '');
  return !!err && (err.name === 'AbortError' || /cancel|in progress/i.test(m));
}
const SAVE_CHUNK = 3 * 256 * 1024;
let nativeSaving = false;
function blobToBase64(blob, cb){
  try{
    const fr = new FileReader();
    fr.onload = () => { const s = String(fr.result || ''), i = s.indexOf(','); cb(i >= 0 ? s.slice(i + 1) : ''); };
    fr.onerror = () => cb('');
    fr.readAsDataURL(blob);
  }catch(_){ cb(''); }
}
function nativeSaveFile(name, data, label, done){
  const fsp = nativePlugin('Filesystem', 'writeFile'), shp = nativePlugin('Share', 'share');
  if(!fsp || !shp){ done('fail'); return; }
  if(nativeSaving) return;
  let blob;
  try{ blob = new Blob([data], { type:'application/json' }); }catch(_){ done('fail'); return; }
  const n = Math.max(1, Math.ceil(blob.size / SAVE_CHUNK));
  if(n > 1 && !nativePlugin('Filesystem', 'appendFile')){ done('fail'); return; }
  nativeSaving = true;
  let i = 0, uri = null;
  function fail(){ nativeSaving = false; done('fail'); }
  (function next(){
    if(i >= n){ nativeSaving = false; share(); return; }
    blobToBase64(blob.slice(i * SAVE_CHUNK, Math.min(blob.size, (i + 1) * SAVE_CHUNK)), b64 => {
      if(!b64){ fail(); return; }
      const opt = { path:name, data:b64, directory:'CACHE' };
      let w;
      try{ w = (i === 0) ? fsp.writeFile(opt) : fsp.appendFile(opt); }catch(_){ fail(); return; }
      if(!w || typeof w.then !== 'function'){ fail(); return; }
      w.then(r => {
        if(i === 0){ if(!r || !r.uri){ fail(); return; } uri = r.uri; }
        i++; next();
      }, fail);
    });
  })();
  function share(){
    let s;
    try{ s = shp.share({ title:name, files:[uri], dialogTitle:label }); }catch(err){ done(shareQuiet(err) ? 'quiet' : 'fail'); return; }
    if(s && typeof s.then === 'function') s.then(() => done('ok'), err => done(shareQuiet(err) ? 'quiet' : 'fail'));
    else done('ok');
  }
}

/* ---- アプリの中の確かめの窓(2026-09-30) ----
   Play版の window.confirm は、Capacitor(BridgeWebChromeClient)がボタンを英語の OK / Cancel に決め打ちしている。
   Play版はアプリの中に「いいえ / はい」(common.no / common.yes・12言語・もじの大きさの設定どおり)の窓を出す。
   Web版は window.confirm(ブラウザの言葉で出る)。confirm の無い環境(疑似DOMのスモーク)は dflt。
   いまは しゃしんの「なまえ・ことば」を書きかけで戻るボタンを押したときだけ使う(screens/photo.js が api.ask で呼ぶ)。
   done(true=はい / false=いいえ)。戻るボタン=いいえ */
function askBox(msg, done, dflt){
  if(!isNativeApp()){
    let r = !!dflt;
    try{ if(typeof window.confirm === 'function') r = !!window.confirm(msg); }catch(_){ r = false; }
    done(r);
    return;
  }
  const ov = el('div', 'ask-ov');
  ov.setAttribute('role', 'alertdialog');
  ov.setAttribute('aria-modal', 'true');
  const box = el('div', 'ask-box');
  const row = el('div', 'ask-row');
  const no = el('button', 'ask-btn ask-no', T('common.no'));
  const yes = el('button', 'ask-btn ask-yes', T('common.yes'));
  no.type = 'button'; yes.type = 'button';
  no.setAttribute('data-back', '1');
  let closed = false;
  function close(v){ if(closed) return; closed = true; if(ov.parentNode) ov.parentNode.removeChild(ov); done(v); }
  ov._back = () => close(false);
  Tap.bind(no, () => close(false));
  Tap.bind(yes, () => close(true));
  /* TalkBack などは click だけを出すので、この窓のボタンは click も受ける(二重に来ても close は1回だけ) */
  no.addEventListener('click', () => close(false));
  yes.addEventListener('click', () => close(true));
  row.appendChild(no); row.appendChild(yes);
  box.appendChild(el('p', 'ask-msg', msg)); box.appendChild(row); ov.appendChild(box);
  document.body.appendChild(ov);
  try{ no.focus(); }catch(_){}
}

/* ---- Android の戻るボタン(Play版だけ・2026-09-30) ----
   @capacitor/app が無いと、戻るでアプリごと後ろに下がっていた(Android 11 以前は閉じる)。
   押したときの順: ①確かめの窓が出ていれば「いいえ」
                  ②画面のモジュールが back(api) を持ち true を返したら、それで終わり
                    (しゃしん: 大きく見せる画面・とりこみ(トリミング)の画面を、その画面の「とじる/やめる」と同じ動きで閉じる。
                     けす確かめの上では「やめる」。なまえ・ことばを書きかけなら先に確かめる)
                  ③ホーム以外(5カテゴリ・せってい)→ ホーム(ヘッダーの名前タップと同じ)
                  ④ホーム → アプリを後ろに下げる(minimizeApp。中身はそのまま)
   はい・いいえ/たいちょう/すうじ/ことば の画面は、戻る=ホーム(下のナビでほかの画面へ行くのと同じ扱い。
     ことばの ならべた字・すうじ は今までどおり次に開いても残る。確かめは出さない)。
   Web版(ブラウザ)は何も変えない(戻るはブラウザのまま) */
function minimizeApp(){
  const ap = nativePlugin('App', 'minimizeApp');
  try{ if(ap){ const p = ap.minimizeApp(); if(p && p.catch) p.catch(() => {}); } }catch(_){}
}
function onBack(){
  const ask = document.querySelector('.ask-ov');
  if(ask && typeof ask._back === 'function'){ ask._back(); return; }
  if(guideOv){ guideOv._back(); return; }   // はじめての つかいかた(下の節): 2ページ目から=まえ / 1ページ目=初回は後ろに下げる・せっていから開いたときは閉じる
  const mod = (CATS.indexOf(currentScreen) >= 0 && window.KAIWA_SCREENS) ? window.KAIWA_SCREENS.get(currentScreen) : null;
  if(mod && typeof mod.back === 'function'){
    try{ if(mod.back(screenApi()) === true) return; }catch(err){ console.error('back error:', currentScreen, err); }
  }
  if(currentScreen !== 'home'){ showScreen('home'); return; }
  minimizeApp();
}
function watchBack(){
  if(!isNativeApp()) return;
  const ap = nativePlugin('App', 'addListener');
  if(!ap) return;
  try{ ap.addListener('backButton', () => onBack()); }catch(_){}
}

/* ---- はじめての つかいかた(初回の案内・2026-09-30) ----
   ヒロさん「ひとつずつ・そよぎ みたいなタイプのアプリは、必ず最初に使い方の丁寧な説明を出してほしい。10代の情報室のように」。
   キットの templates/app.js openGuide と同じ動きを、このアプリの作りに合わせて入れた:
   ・初回起動で必ず出す(最後まで読むまで、開くたびに出る)。全画面(ヘッダー・下のナビより上)。文言は i18n の guide.*
   ・1ページずつ「つぎ」「まえ」。閉じるのは最後のページの「はじめる」だけ(× は置かない)
   ・戻るボタン(Play版・onBack): 2ページ目から=まえのページ / 1ページ目=初回なら後ろに下げる(閉じない)、せっていから開いたときは閉じる
   ・読み終えたら kaiwa.guide.v1 = true。せってい(作成モード)の「つかいかた」の「もういちど 見る」で開き直せる
   ・作成モードの鍵(ヘッダーの 🔒 の連打)は「隠れた入口」ではない: 🔒 と「せっていはロックを解除」はいつも見えていて、押すたびに「あと ◯かい」と出る。
     鍵は本人が まちがえて せっていを変えないためのもの(10代の情報室のメモの部屋のように人から隠すものではない)。
     なので案内で開き方を書き、せっていから もう一度 見られるようにした。回数は本文の {n} を pref.tapUnlock(3〜10)に置きかえる
   ・1ページ目に ことば(ヘッダーの Language と同じ12言語)。案内がヘッダーを覆うため
   ・BGM・よみあげは今までどおり(BGM は最初のタップで始まる。案内では よみあげない) */
const LS_GUIDE = 'kaiwa.guide.v1';
const GUIDE_RTL = new RegExp('[' + String.fromCharCode(0x590) + '-' + String.fromCharCode(0x8FF) + ']');
let guideOv = null;
function guideDone(){ return loadJSON(LS_GUIDE) === true; }
function openGuide(first){
  if(guideOv) return;                          // すでに開いていれば開かない(二重に出さない)
  let bodies = T('guide.bodies');
  if(!Array.isArray(bodies) || !bodies.length) return;
  let i = 0;
  const ov = el('div', 'guide-ov');
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  const box = el('div', 'guide-box');
  const top = el('div', 'guide-top');
  const ttl = el('p', 'guide-title');
  const step = el('p', 'guide-step');
  top.appendChild(ttl); top.appendChild(step);
  box.appendChild(top);
  let langRow = null, langLbl = null, langSel = null;
  const src = $('set-lang');
  if(src && src.options && src.options.length){
    langRow = el('div', 'guide-lang');
    langLbl = el('span', 'guide-lang-lbl');
    langSel = document.createElement('select');
    langSel.setAttribute('aria-label', 'Language 言語');
    for(let o = 0; o < src.options.length; o++){
      const op = document.createElement('option');
      op.value = src.options[o].value; op.textContent = src.options[o].textContent;
      langSel.appendChild(op);
    }
    langSel.addEventListener('change', () => {
      pref.lang = langSel.value; savePref();
      $('set-lang').value = pref.lang;
      applyI18n();                               // 案内も draw() で訳し直す
    });
    langRow.appendChild(langLbl); langRow.appendChild(langSel);
    box.appendChild(langRow);
  }
  const h = el('h2', 'guide-h');
  const p = el('p', 'guide-p');
  const dots = el('div', 'guide-dots');
  dots.setAttribute('aria-hidden', 'true');
  box.appendChild(h); box.appendChild(p); box.appendChild(dots);
  const row = el('div', 'guide-row');
  const prevB = el('button', 'guide-btn guide-prev');
  const nextB = el('button', 'guide-btn guide-next');
  prevB.type = 'button'; nextB.type = 'button';
  row.appendChild(prevB); row.appendChild(nextB);
  ov.appendChild(box); ov.appendChild(row);
  function draw(){
    const heads = T('guide.heads');
    bodies = T('guide.bodies');                  // ことばを変えたときも、いまのページのまま訳し直す
    const n = bodies.length;
    if(i > n - 1) i = n - 1;
    ov.setAttribute('aria-label', T('guide.title'));
    ttl.textContent = T('guide.title');
    step.textContent = String(T('guide.step')).replace('{n}', i + 1).replace('{m}', n);
    step.setAttribute('dir', GUIDE_RTL.test(step.textContent) ? 'rtl' : 'ltr');   // 「1 / 7」は ar でも左から(「7 / 1」にしない)
    if(langRow){
      langRow.style.display = (i === 0) ? '' : 'none';
      langLbl.textContent = T('set.lang');
      langSel.value = pref.lang;
    }
    h.textContent = (Array.isArray(heads) && heads[i]) ? heads[i] : '';
    p.textContent = String(bodies[i]).split('{n}').join(String(pref.tapUnlock));   // 作成モードに はいる タップの回数(せっていで 3〜10)
    dots.textContent = '';
    for(let k = 0; k < n; k++) dots.appendChild(el('span', 'guide-dot' + (k === i ? ' on' : '')));
    prevB.textContent = T('guide.prev');
    prevB.style.visibility = (i === 0) ? 'hidden' : 'visible';   // 「つぎ」の位置を変えない
    nextB.textContent = (i === n - 1) ? T('guide.start') : T('guide.next');
    ov.scrollTop = 0;
  }
  function close(){
    if(ov.parentNode) ov.parentNode.removeChild(ov);
    guideOv = null;
    saveJSON(LS_GUIDE, true);
  }
  ov._draw = draw;
  ov._back = () => {
    if(i > 0){ i--; draw(); return; }
    if(first) minimizeApp(); else close();       // 初回は「はじめる」でしか閉じない(10代の情報室と同じ)
  };
  Tap.bind(prevB, () => { if(i > 0){ i--; draw(); } });
  Tap.bind(nextB, () => { if(i < bodies.length - 1){ i++; draw(); } else close(); });
  draw();
  guideOv = ov;
  document.body.appendChild(ov);
  try{ nextB.focus(); }catch(_){}
}

/* ---- 機種変更(バックアップ) ----
   ver2(2026-09-30 深夜): せってい + 「ひと・しゃしん」の写真(kaiwa.dict.v1 = 写真・なまえ・ことば・分けた所)を1つのファイルに入れる。
     それまで(ver1)は せってい だけで、写真は うつせなかった。
   よみこむ: ファイルに写真が入っていれば、この端末の写真を ファイルの写真に置きかえる(前のスマホと同じにする。スケジューラーと同じ考え)。
     前の版で書き出した写真なしのファイル(ver1)は今までどおり読める(せっていだけ変わり、いまの写真はそのまま)。
     写真が入りきらない(端末の きおくが いっぱい)ときは、せっていも写真も変えずに「よみこめませんでした」。
     写真は端末の中の写真(data:image/…)だけを入れる(外のアドレスは読まない=オフラインのまま)。
   ほかのデータ(ことば・すうじ の ならべた字)は端末に保存していないので、ファイルにも無い */
const LS_DICT = 'kaiwa.dict.v1';                                      // screens/photo.js の写真のデータ(ここでは機種変更のときだけ読み書き)
const PHOTO_CATS = ['people','places','food','activities','wants'];   // screens/photo.js の CATS と同じ
function sanitizeDict(list){
  const out = [];
  list.forEach(c => {
    if(!c || typeof c !== 'object' || PHOTO_CATS.indexOf(c.cat) < 0) return;
    if(typeof c.img !== 'string' || !/^data:image\//.test(c.img)) return;
    out.push({ id:'p' + (out.length + 1), cat:c.cat, label:(typeof c.label === 'string') ? c.label : '', img:c.img });
  });
  return out;
}
function exportBackup(){
  const dict = loadJSON(LS_DICT);
  const data = { app:'kaiwa_hojo_note', ver:2, prefs: pref, dict: Array.isArray(dict) ? dict : [] };
  const d = new Date();
  const fname = 'kaiwa-hojo-note-' + d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
  /* Play版(2026-09-30): 一時フォルダに書いて共有の画面へ。選べたら「かきだしました」・閉じたら何も出さない・書けなければ「かきだせませんでした」 */
  if(isNativeApp()){
    nativeSaveFile(fname, JSON.stringify(data), T('set.bkExport'), r => {
      if(r === 'ok') toast(T('set.exported'));
      else if(r === 'fail') toast(T('set.exportFail'));
    });
    return;
  }
  const blob = new Blob([JSON.stringify(data)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fname;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast(T('set.exported'));
}
function importBackup(e){
  const f = e.target.files && e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const d = JSON.parse(r.result);
      if(d.app !== 'kaiwa_hojo_note') throw new Error('different app');
      if(Array.isArray(d.dict) && !saveJSON(LS_DICT, sanitizeDict(d.dict))) throw new Error('storage full');   // 写真なし(ver1)は いまの写真のまま
      pref = sanitizePref(d.prefs); savePref();
      applyAll();
      toast(T('set.imported'));
    }catch(err){ toast(T('set.importFail')); }
  };
  r.readAsText(f);
  e.target.value = '';
}

/* ---- トースト ---- */
let toastTimer = 0;
function toast(msg){
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

/* ---- 初期化 ---- */
function init(){
  Tap.bind($('hd-title'), () => showScreen('home'));   // ヘッダーの名前タップ = いつでもホームへ戻る

  Tap.bind($('hd-lock'), onLockTap);
  Tap.bind($('btn-lock'), lock);
  Tap.bind($('btn-tapn'), cycleTapN);

  CATS.forEach(c => Tap.bind($('nav-' + c), () => showScreen(c)));
  Tap.bind($('nav-set'), () => showScreen('set'));

  Tap.bind($('btn-fs'), () => {
    pref.fs = (pref.fs + 1) % 3;
    applyBodyClass();
    savePref(); applyI18n();
  });
  Tap.bind($('btn-showtext'), () => { pref.showText = !pref.showText; savePref(); applyI18n(); });
  Tap.bind($('btn-tts'), () => { pref.tts = !pref.tts; savePref(); applyI18n(); });
  Tap.bind($('btn-weakside'), () => { pref.weakSide = next(WEAK_SIDES, pref.weakSide); savePref(); applyI18n(); });
  Tap.bind($('btn-theme'), () => {
    pref.theme = next(THEMES, pref.theme);
    applyTheme(); savePref(); applyI18n();
  });
  Tap.bind($('btn-bgm'), () => {
    pref.bgm = next(BGMS, pref.bgm);
    applyBgm(); savePref(); applyI18n();
  });
  Tap.bind($('btn-vol'), () => {
    pref.vol = (pref.vol + 1) % 3;
    Sound.setVol(pref.vol);
    savePref(); applyI18n();
  });

  $('set-lang').addEventListener('change', () => {
    pref.lang = $('set-lang').value;
    savePref(); applyI18n();
  });

  Tap.bind($('bk-export'), exportBackup);
  Tap.bind($('bk-import'), () => $('bk-file').click());
  $('bk-file').addEventListener('change', importBackup);
  if($('btn-guide')) Tap.bind($('btn-guide'), () => openGuide(false));   // はじめての つかいかた を もう一度

  buildHomeCats();     // ホームの大ボタンを組み立ててから訳す(applyAll→applyI18n がラベルを入れる)
  applyAll();
  showScreen('home');
  applyLock();
  if(!guideDone()) openGuide(true);   // はじめての つかいかた(読み終えるまで毎回・2026-09-30)
  watchBack();         // Android の戻るボタン(Play版だけ)

  /* Service Worker: 本番(https)だけ登録。localhost(開発)ではSWを使わず、
     既存の登録とキャッシュを消す = 更新しても「前の版」が出続ける問題を防ぐ(そよぎAAC/スケジューラー方式) */
  if(typeof navigator !== 'undefined' && 'serviceWorker' in navigator){
    var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname || '');
    if(isLocal){
      navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }).catch(function(){});
      if(typeof caches !== 'undefined' && caches.keys){ caches.keys().then(function(ks){ ks.forEach(function(k){ caches.delete(k); }); }).catch(function(){}); }
    } else if(/^https:/.test(location.protocol)){
      try{ navigator.serviceWorker.register('sw.js'); }catch(_){}
    }
  }
}

init();

})();
