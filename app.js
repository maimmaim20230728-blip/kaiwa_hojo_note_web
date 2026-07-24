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

const VER = '0.1.2';
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
  'link-privacy':'set.privacy', 'about-credit':'set.credit'
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
    toast: toast
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
}
function applyAll(){
  applyBodyClass();
  applyTheme();
  applyBgm();
  Sound.setVol(pref.vol);
  $('set-lang').value = pref.lang;
  applyI18n();
}

/* ---- 機種変更(バックアップ) ----
   v0.1骨組みはせってい値のみ。写真辞書(kaiwa.dict.v1)・ことば上書き(kaiwa.labels.v1)は
   後続フェーズで各データが実装され次第、ここに追加する(SPEC_V1のデータ節を参照) */
function exportBackup(){
  const data = { app:'kaiwa_hojo_note', ver:1, prefs: pref };
  const blob = new Blob([JSON.stringify(data)], { type:'application/json' });
  const a = document.createElement('a');
  const d = new Date();
  a.href = URL.createObjectURL(blob);
  a.download = 'kaiwa-hojo-note-' + d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '.json';
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

  buildHomeCats();     // ホームの大ボタンを組み立ててから訳す(applyAll→applyI18n がラベルを入れる)
  applyAll();
  showScreen('home');
  applyLock();

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
