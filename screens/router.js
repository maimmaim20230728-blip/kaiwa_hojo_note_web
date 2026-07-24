'use strict';
/* 会話補助ノート・そよぎ 画面ルーター(レジストリ)
   ・ここは共有ファイル。カテゴリ画面の担当者はこのファイルを書き換えないこと。
   ・各カテゴリ画面(screens/yesno.js など)は自分の起動時に1回だけ
       window.KAIWA_SCREENS.register('yesno', { render(container, api){ ... } });
     を呼んで自分を登録するだけでよい。
   ・render(container, api) は その画面が表示されるたびに app.js から呼ばれる。
     container はその画面専用の<section>要素(app.js 側で呼び出し前に空にしてから渡す)。
     api は下記の最小セットのみ(app.js の内部変数・他の関数には触れさせない):
       api.T(key)        … i18n訳文取得(screen.<自分のid>.* を使うこと)
       api.el(tag,cls,txt)… DOM要素を作る小さなヘルパー(そよぎ式スケジューラーと同じ書式)
       api.pref           … 現在のせってい値のコピー(読み取り専用スナップショット。書き換えても保存されない)
       api.toast(msg)     … 画面下部にトーストを出す
   ・画面同士・app.jsの内部状態は共有しない(担当が分かれても衝突しないための取り決め)。
   window.KAIWA_SCREENS = { register(id, mod), get(id), ids() } */
(function(){
  var registry = {};
  function register(id, mod){
    if(!id || !mod || typeof mod.render !== 'function'){
      console.error('KAIWA_SCREENS.register: render(container, api) を持つモジュールが必要です → ' + id);
      return;
    }
    registry[id] = mod;
  }
  function get(id){ return registry[id] || null; }
  function ids(){ return Object.keys(registry); }
  window.KAIWA_SCREENS = { register: register, get: get, ids: ids };
})();
