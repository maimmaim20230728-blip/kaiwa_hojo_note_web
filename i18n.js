'use strict';
/* 会話補助ノート・そよぎ 多言語テーブル(v0.1・骨組み)
   ・window.KAIWA_I18N = { ja, en }(そよぎ式スケジューラーと同じ方式。将来12言語へ拡張する構造。
     ja(正)と en を複製→差し替えて言語を足す。RTL言語を足す時は app.js の RTL_LANGS にも追加)
   ・キー構造は全言語で完全一致させること(_check.js が ja を正としてキー構造・配列要素数を機械照合)
   ・{n} は app.js が実値に差し替えるプレースホルダ(訳文でも記号のまま残す)
   ・set.lang は言語切替ラベルなので全言語 'ことば / Language' 固定(そよぎ共通ルール)
   ・本人が読む文言はひらがな中心(feedback-hiragana-audience-rule)。大人の尊厳を保つ表現(幼い語を使わない)
   ・画面ごとの文言は screen.<id> の名前空間にまとめる(id = yesno/health/photo/number/kana)。
     各画面の担当者は自分の screen.<id> 配下にキーを追加してよいが、
     他画面の screen.* や app/nav/lock/set の共有キーは変更しないこと(並行実装の衝突回避ルール) */
(function(){

/* ============ ja(正) ============ */
var ja = {
  app: {
    name:'会話補助ノート・そよぎ',
    tagline:'みせる・さす・つたえる、会話をたすける ノート。'
  },
  home: {
    welcome:'したの ボタンから えらんでください'
  },
  nav: {
    yesno:'はい・いいえ',
    health:'たいちょう・いたみ',
    photo:'ひと・しゃしん',
    number:'すうじ・じかん',
    kana:'ことば',
    set:'せってい'
  },
  lock: {
    hint:'あと {n}かい',
    hdHint:'せっていはロックを解除',
    unlocked:'作成モードに なりました 🔓',
    locked:'本人使用モードに もどりました 🔒',
    setNote:'この がめんは、かいごの ひと・かぞくが せっていします。',
    toSelf:'🔒 本人使用モードに もどす',
    tapN:'作成モードに はいる タップ',
    times:'かい'
  },
  set: {
    hNormal:'ふだんの せってい',
    lang:'ことば / Language',
    fs:'もじの大きさ',
    fsSizes:['ふつう','大きい','とても大きい'],
    showText:'カードの文字',
    on:'ON', off:'OFF',
    tts:'よみあげ',
    weakSide:'見えにくい側',
    weakSides:['なし','ひだり','みぎ'],
    theme:'いろ',
    themes:['みどり','みずいろ','しろ','くろ'],
    bgm:'BGM',
    bgms:['なし','1','2'],
    vol:'おとの おおきさ',
    vols:['ちいさい','ふつう','おおきい'],
    hBackup:'きしゅへんこう(バックアップ)',
    bkHint:'あたらしい スマホに うつるときは、「かきだす」で ファイルを ほぞんして、あたらしい スマホで「よみこむ」を おしてください。',
    bkExport:'かきだす',
    bkImport:'よみこむ',
    exported:'かきだしました ✓',
    imported:'よみこみました ✓',
    importFail:'よみこめませんでした',
    privacy:'プライバシーポリシー',
    credit:'アプリ開発：介護と支援の相談どころ そよぎ'
  },
  /* 画面ごとの文言(v0.1で5画面とも本実装。各画面は screen.<id> 配下のみを使う。
     ja(正)と en はキー構造を完全一致させる(_check.js が機械照合)。placeholderは全画面が
     本実装され不要になったため廃止した) */
  screen: {
    yesno: {
      title:'はい・いいえ',
      yes:'はい',
      no:'いいえ',
      unknown:'わからない',
      prompt:'したから えらんでください',
      selecting:'これを えらんでいます',
      cancel:'とりけす',
      cleared:'とりけしました'
    },
    health: {
      title:'たいちょう・いたみ',
      intro:'からだの ことを、まわりの ひとに つたえます。',
      step1:'どこ',
      step2:'どのくらい',
      front:'まえ',
      back:'うしろ',
      restart:'はじめから',
      speak:'よみあげ',
      level:'つよさ',
      parts:{
        head:'あたま', face:'かお', neck:'くび', chest:'むね', belly:'おなか',
        back:'せなか', waist:'こし', arm:'うで', hand:'て', leg:'あし', foot:'あしさき'
      }
    },
    photo: {
      title:'ひと・しゃしん',
      tab:{ people:'ひと', places:'ばしょ', food:'たべもの', activities:'すること', wants:'ほしいもの' },
      empty:'しゃしんは まだ ありません',
      emptyCreate:'したの ボタンから しゃしんを ついか できます',
      fromCamera:'カメラで とる',
      fromRoll:'アルバムから えらぶ',
      cropTitle:'しゃしんの いちを あわせる',
      cropHint:'いちは ゆびや やじるしで、おおきさは スライダーで',
      zoom:'おおきさ',
      panUp:'うえに うごかす',
      panDown:'したに うごかす',
      panLeft:'ひだりに うごかす',
      panRight:'みぎに うごかす',
      labelLabel:'なまえ・ことば',
      labelPlaceholder:'なまえや ことばを かいてください',
      make:'これで つくる',
      cancel:'やめる',
      close:'とじる',
      speak:'よみあげ',
      save:'ほぞん',
      del:'けす',
      delConfirm:'この しゃしんを けしますか',
      delYes:'けす',
      delNo:'やめる',
      added:'ついか しました',
      saved:'ほぞん しました',
      deleted:'けしました',
      storageFull:'きおくが いっぱいで ついか できませんでした',
      photoFail:'しゃしんを よみこめませんでした'
    },
    number: {
      title:'すうじ・じかん',
      count:'かず',
      delOne:'1つ けす',
      delAll:'ぜんぶ けす',
      read:'よむ',
      numHint:'すうじを おしてください',
      dawn:'あさ', day:'ひる', eve:'ゆうがた', night:'よる'
    },
    kana: {
      title:'ことば',
      guide:'1もじずつ えらんで、うえに ならびます',
      stripEmpty:'ここに もじが ならびます',
      undo:'もどす',
      delOne:'1もじ けす',
      clearAll:'ぜんぶ けす',
      say:'よみあげ',
      space:'空白',
      cleared:'ぜんぶ けしました。「もどす」で もどせます',
      restored:'もどしました'
    }
  }
};

/* ============ en ============ */
var en = {
  app: {
    name:'Soyogi Conversation Notes',
    tagline:'A notebook that helps you show, point, and share.'
  },
  home: {
    welcome:'Choose a button below'
  },
  nav: {
    yesno:'Yes / No',
    health:'Condition / Pain',
    photo:'People / Photos',
    number:'Numbers / Time',
    kana:'Words',
    set:'Settings'
  },
  lock: {
    hint:'{n} more',
    hdHint:'Unlock for settings',
    unlocked:'Creation mode on 🔓',
    locked:'Back to use mode 🔒',
    setNote:'This screen is set up by a caregiver or family member.',
    toSelf:'🔒 Back to use mode',
    tapN:'Taps to enter creation mode',
    times:' taps'
  },
  set: {
    hNormal:'Basic settings',
    lang:'ことば / Language',
    fs:'Text size',
    fsSizes:['Normal','Large','Extra large'],
    showText:'Card text',
    on:'ON', off:'OFF',
    tts:'Read aloud',
    weakSide:'Harder-to-see side',
    weakSides:['None','Left','Right'],
    theme:'Color',
    themes:['Green','Aqua','White','Dark'],
    bgm:'Music',
    bgms:['Off','1','2'],
    vol:'Volume',
    vols:['Small','Normal','Large'],
    hBackup:'Change phones (backup)',
    bkHint:'When moving to a new phone, use "Export" to save a file, then open it on the new phone with "Import".',
    bkExport:'Export',
    bkImport:'Import',
    exported:'Exported ✓',
    imported:'Imported ✓',
    importFail:'Could not import',
    privacy:'Privacy Policy',
    credit:'App by: Soyogi (Care & Support Consultation)'
  },
  screen: {
    yesno: {
      title:'Yes / No',
      yes:'Yes',
      no:'No',
      unknown:'Not sure',
      prompt:'Choose below',
      selecting:'I\'m choosing this',
      cancel:'Cancel',
      cleared:'Cleared'
    },
    health: {
      title:'Condition / Pain',
      intro:'Show the people around you how your body feels.',
      step1:'Where',
      step2:'How much',
      front:'Front',
      back:'Back',
      restart:'Start over',
      speak:'Read aloud',
      level:'Level',
      parts:{
        head:'Head', face:'Face', neck:'Neck', chest:'Chest', belly:'Belly',
        back:'Upper back', waist:'Lower back', arm:'Arm', hand:'Hand', leg:'Leg', foot:'Foot'
      }
    },
    photo: {
      title:'People / Photos',
      tab:{ people:'People', places:'Places', food:'Food', activities:'Activities', wants:'Wants' },
      empty:'No photos yet',
      emptyCreate:'Use the buttons below to add a photo',
      fromCamera:'Take a photo',
      fromRoll:'Choose from album',
      cropTitle:'Fit the photo',
      cropHint:'Position with your finger or the arrows; resize with the slider',
      zoom:'Size',
      panUp:'Move up',
      panDown:'Move down',
      panLeft:'Move left',
      panRight:'Move right',
      labelLabel:'Name / word',
      labelPlaceholder:'Write a name or word',
      make:'Create',
      cancel:'Cancel',
      close:'Close',
      speak:'Read aloud',
      save:'Save',
      del:'Delete',
      delConfirm:'Delete this photo?',
      delYes:'Delete',
      delNo:'Keep',
      added:'Added',
      saved:'Saved',
      deleted:'Deleted',
      storageFull:'Storage is full, could not add',
      photoFail:'Could not load the photo'
    },
    number: {
      title:'Numbers / Time',
      count:'Count',
      delOne:'Delete one',
      delAll:'Clear all',
      read:'Read aloud',
      numHint:'Tap a number',
      dawn:'Morning', day:'Daytime', eve:'Evening', night:'Night'
    },
    kana: {
      title:'Words',
      guide:'Tap letters. They line up above.',
      stripEmpty:'Letters will appear here',
      undo:'Undo',
      delOne:'Delete one',
      clearAll:'Clear all',
      say:'Read aloud',
      space:'Space',
      cleared:'Cleared. Tap "Undo" to bring it back.',
      restored:'Restored'
    }
  }
};

/* ============ de ============ */
var de = {
  "app": {
    "name": "Soyogi Gesprächsnotizen",
    "tagline": "Ein Heft, das beim Zeigen, Deuten und Mitteilen hilft."
  },
  "home": {
    "welcome": "Bitte unten eine Taste wählen"
  },
  "nav": {
    "yesno": "Ja / Nein",
    "health": "Befinden / Schmerz",
    "photo": "Menschen / Fotos",
    "number": "Zahlen / Zeit",
    "kana": "Wörter",
    "set": "Einstellungen"
  },
  "lock": {
    "hint": "Noch {n}",
    "hdHint": "Für Einstellungen entsperren",
    "unlocked": "Bearbeitungsmodus ein 🔓",
    "locked": "Zurück im Nutzungsmodus 🔒",
    "setNote": "Diese Seite wird von einer Pflegeperson oder Angehörigen eingerichtet.",
    "toSelf": "🔒 Zurück zum Nutzungsmodus",
    "tapN": "Tippen für Bearbeitungsmodus",
    "times": " mal"
  },
  "set": {
    "hNormal": "Grundeinstellungen",
    "lang": "ことば / Language",
    "fs": "Schriftgröße",
    "fsSizes": [
      "Normal",
      "Groß",
      "Sehr groß"
    ],
    "showText": "Kartentext",
    "on": "AN",
    "off": "AUS",
    "tts": "Vorlesen",
    "weakSide": "Schlechter sichtbare Seite",
    "weakSides": [
      "Keine",
      "Links",
      "Rechts"
    ],
    "theme": "Farbe",
    "themes": [
      "Grün",
      "Türkis",
      "Weiß",
      "Dunkel"
    ],
    "bgm": "Musik",
    "bgms": [
      "Aus",
      "1",
      "2"
    ],
    "vol": "Lautstärke",
    "vols": [
      "Leise",
      "Normal",
      "Laut"
    ],
    "hBackup": "Handywechsel (Sicherung)",
    "bkHint": "Beim Wechsel auf ein neues Handy speichern Sie mit „Exportieren“ eine Datei und öffnen sie auf dem neuen Handy mit „Importieren“.",
    "bkExport": "Exportieren",
    "bkImport": "Importieren",
    "exported": "Exportiert ✓",
    "imported": "Importiert ✓",
    "importFail": "Import fehlgeschlagen",
    "privacy": "Datenschutzerklärung",
    "credit": "App von: Soyogi (Beratung für Pflege und Unterstützung)"
  },
  "screen": {
    "yesno": {
      "title": "Ja / Nein",
      "yes": "Ja",
      "no": "Nein",
      "unknown": "Weiß nicht",
      "prompt": "Bitte unten wählen",
      "selecting": "Ich wähle das",
      "cancel": "Zurücknehmen",
      "cleared": "Zurückgenommen"
    },
    "health": {
      "title": "Befinden / Schmerz",
      "intro": "Zeigen Sie den Menschen um Sie herum, wie es Ihrem Körper geht.",
      "step1": "Wo",
      "step2": "Wie stark",
      "front": "Vorne",
      "back": "Hinten",
      "restart": "Von vorn",
      "speak": "Vorlesen",
      "level": "Stärke",
      "parts": {
        "head": "Kopf",
        "face": "Gesicht",
        "neck": "Hals",
        "chest": "Brust",
        "belly": "Bauch",
        "back": "Oberer Rücken",
        "waist": "Unterer Rücken",
        "arm": "Arm",
        "hand": "Hand",
        "leg": "Bein",
        "foot": "Fuß"
      }
    },
    "photo": {
      "title": "Menschen / Fotos",
      "tab": {
        "people": "Menschen",
        "places": "Orte",
        "food": "Essen",
        "activities": "Aktivitäten",
        "wants": "Wünsche"
      },
      "empty": "Noch keine Fotos",
      "emptyCreate": "Über die Tasten unten ein Foto hinzufügen",
      "fromCamera": "Foto aufnehmen",
      "fromRoll": "Aus dem Album wählen",
      "cropTitle": "Foto ausrichten",
      "cropHint": "Position mit dem Finger oder den Pfeilen, Größe mit dem Regler",
      "zoom": "Größe",
      "panUp": "Nach oben",
      "panDown": "Nach unten",
      "panLeft": "Nach links",
      "panRight": "Nach rechts",
      "labelLabel": "Name / Wort",
      "labelPlaceholder": "Name oder Wort eingeben",
      "make": "Erstellen",
      "cancel": "Abbrechen",
      "close": "Schließen",
      "speak": "Vorlesen",
      "save": "Speichern",
      "del": "Löschen",
      "delConfirm": "Dieses Foto löschen?",
      "delYes": "Löschen",
      "delNo": "Behalten",
      "added": "Hinzugefügt",
      "saved": "Gespeichert",
      "deleted": "Gelöscht",
      "storageFull": "Speicher voll, konnte nicht hinzufügen",
      "photoFail": "Foto konnte nicht geladen werden"
    },
    "number": {
      "title": "Zahlen / Zeit",
      "count": "Anzahl",
      "delOne": "Eine löschen",
      "delAll": "Alle löschen",
      "read": "Vorlesen",
      "numHint": "Bitte eine Zahl tippen",
      "dawn": "Morgen",
      "day": "Mittag",
      "eve": "Abend",
      "night": "Nacht"
    },
    "kana": {
      "title": "Wörter",
      "guide": "Buchstaben tippen. Sie erscheinen oben.",
      "stripEmpty": "Hier erscheinen die Buchstaben",
      "undo": "Rückgängig",
      "delOne": "Einen löschen",
      "clearAll": "Alle löschen",
      "say": "Vorlesen",
      "space": "Leerzeichen",
      "cleared": "Alles gelöscht. Mit „Rückgängig“ zurückholen.",
      "restored": "Wiederhergestellt"
    }
  }
};

/* ============ fr ============ */
var fr = {
  "app": {
    "name": "Carnet de conversation SOYOGI",
    "tagline": "Un carnet pour montrer, désigner et communiquer."
  },
  "home": {
    "welcome": "Choisissez un bouton ci-dessous"
  },
  "nav": {
    "yesno": "Oui / Non",
    "health": "État / Douleur",
    "photo": "Personnes / Photos",
    "number": "Chiffres / Heure",
    "kana": "Mots",
    "set": "Réglages"
  },
  "lock": {
    "hint": "Encore {n}",
    "hdHint": "Déverrouiller pour les réglages",
    "unlocked": "Mode création activé 🔓",
    "locked": "Retour au mode utilisation 🔒",
    "setNote": "Cet écran est configuré par un aidant ou un proche.",
    "toSelf": "🔒 Revenir au mode utilisation",
    "tapN": "Appuis pour passer en mode création",
    "times": " appuis"
  },
  "set": {
    "hNormal": "Réglages de base",
    "lang": "ことば / Language",
    "fs": "Taille du texte",
    "fsSizes": [
      "Normale",
      "Grande",
      "Très grande"
    ],
    "showText": "Texte des cartes",
    "on": "ON",
    "off": "OFF",
    "tts": "Lecture vocale",
    "weakSide": "Côté difficile à voir",
    "weakSides": [
      "Aucun",
      "Gauche",
      "Droite"
    ],
    "theme": "Couleur",
    "themes": [
      "Vert",
      "Bleu clair",
      "Blanc",
      "Sombre"
    ],
    "bgm": "Musique",
    "bgms": [
      "Aucune",
      "1",
      "2"
    ],
    "vol": "Volume",
    "vols": [
      "Faible",
      "Normal",
      "Fort"
    ],
    "hBackup": "Changer de téléphone (sauvegarde)",
    "bkHint": "Pour passer à un nouveau téléphone, utilisez « Exporter » pour enregistrer un fichier, puis ouvrez-le sur le nouveau téléphone avec « Importer ».",
    "bkExport": "Exporter",
    "bkImport": "Importer",
    "exported": "Exporté ✓",
    "imported": "Importé ✓",
    "importFail": "Importation impossible",
    "privacy": "Politique de confidentialité",
    "credit": "Application développée par : SOYOGI (Conseil en soins et accompagnement)"
  },
  "screen": {
    "yesno": {
      "title": "Oui / Non",
      "yes": "Oui",
      "no": "Non",
      "unknown": "Je ne sais pas",
      "prompt": "Choisissez ci-dessous",
      "selecting": "Je choisis ceci",
      "cancel": "Annuler",
      "cleared": "Annulé"
    },
    "health": {
      "title": "État / Douleur",
      "intro": "Montrez à votre entourage ce que ressent votre corps.",
      "step1": "Où",
      "step2": "À quel point",
      "front": "Devant",
      "back": "Derrière",
      "restart": "Recommencer",
      "speak": "Lecture vocale",
      "level": "Intensité",
      "parts": {
        "head": "Tête",
        "face": "Visage",
        "neck": "Cou",
        "chest": "Poitrine",
        "belly": "Ventre",
        "back": "Haut du dos",
        "waist": "Bas du dos",
        "arm": "Bras",
        "hand": "Main",
        "leg": "Jambe",
        "foot": "Pied"
      }
    },
    "photo": {
      "title": "Personnes / Photos",
      "tab": {
        "people": "Personnes",
        "places": "Lieux",
        "food": "Nourriture",
        "activities": "Activités",
        "wants": "Envies"
      },
      "empty": "Aucune photo pour l'instant",
      "emptyCreate": "Utilisez les boutons ci-dessous pour ajouter une photo",
      "fromCamera": "Prendre une photo",
      "fromRoll": "Choisir dans l'album",
      "cropTitle": "Ajuster la photo",
      "cropHint": "Positionnez avec le doigt ou les flèches ; ajustez la taille avec le curseur",
      "zoom": "Taille",
      "panUp": "Déplacer vers le haut",
      "panDown": "Déplacer vers le bas",
      "panLeft": "Déplacer vers la gauche",
      "panRight": "Déplacer vers la droite",
      "labelLabel": "Nom / mot",
      "labelPlaceholder": "Écrivez un nom ou un mot",
      "make": "Créer",
      "cancel": "Annuler",
      "close": "Fermer",
      "speak": "Lecture vocale",
      "save": "Enregistrer",
      "del": "Supprimer",
      "delConfirm": "Supprimer cette photo ?",
      "delYes": "Supprimer",
      "delNo": "Conserver",
      "added": "Ajouté",
      "saved": "Enregistré",
      "deleted": "Supprimé",
      "storageFull": "Mémoire pleine, ajout impossible",
      "photoFail": "Impossible de charger la photo"
    },
    "number": {
      "title": "Chiffres / Heure",
      "count": "Nombre",
      "delOne": "Effacer un",
      "delAll": "Tout effacer",
      "read": "Lecture vocale",
      "numHint": "Appuyez sur un chiffre",
      "dawn": "Matin",
      "day": "Journée",
      "eve": "Soir",
      "night": "Nuit"
    },
    "kana": {
      "title": "Mots",
      "guide": "Choisissez les lettres une à une. Elles s'affichent en haut.",
      "stripEmpty": "Les lettres apparaîtront ici",
      "undo": "Annuler",
      "delOne": "Effacer une lettre",
      "clearAll": "Tout effacer",
      "say": "Lecture vocale",
      "space": "Espace",
      "cleared": "Tout effacé. Appuyez sur « Annuler » pour rétablir.",
      "restored": "Rétabli"
    }
  }
};

/* ============ es ============ */
var es = {
  "app": {
    "name": "Notas de conversación SOYOGI",
    "tagline": "Un cuaderno que ayuda a mostrar, señalar y comunicar."
  },
  "home": {
    "welcome": "Elija un botón de abajo"
  },
  "nav": {
    "yesno": "Sí / No",
    "health": "Estado / Dolor",
    "photo": "Personas / Fotos",
    "number": "Números / Hora",
    "kana": "Palabras",
    "set": "Ajustes"
  },
  "lock": {
    "hint": "{n} más",
    "hdHint": "Desbloquear para ajustes",
    "unlocked": "Modo de edición activado 🔓",
    "locked": "De vuelta al modo de uso 🔒",
    "setNote": "Esta pantalla la configura un cuidador o un familiar.",
    "toSelf": "🔒 Volver al modo de uso",
    "tapN": "Toques para entrar en el modo de edición",
    "times": " toques"
  },
  "set": {
    "hNormal": "Ajustes básicos",
    "lang": "ことば / Language",
    "fs": "Tamaño del texto",
    "fsSizes": [
      "Normal",
      "Grande",
      "Muy grande"
    ],
    "showText": "Texto de las tarjetas",
    "on": "ON",
    "off": "OFF",
    "tts": "Lectura en voz alta",
    "weakSide": "Lado difícil de ver",
    "weakSides": [
      "Ninguno",
      "Izquierda",
      "Derecha"
    ],
    "theme": "Color",
    "themes": [
      "Verde",
      "Celeste",
      "Blanco",
      "Oscuro"
    ],
    "bgm": "Música",
    "bgms": [
      "Ninguna",
      "1",
      "2"
    ],
    "vol": "Volumen",
    "vols": [
      "Bajo",
      "Normal",
      "Alto"
    ],
    "hBackup": "Cambio de teléfono (copia de seguridad)",
    "bkHint": "Al cambiar a un teléfono nuevo, use «Exportar» para guardar un archivo y luego ábralo en el nuevo teléfono con «Importar».",
    "bkExport": "Exportar",
    "bkImport": "Importar",
    "exported": "Exportado ✓",
    "imported": "Importado ✓",
    "importFail": "No se pudo importar",
    "privacy": "Política de privacidad",
    "credit": "Aplicación de: SOYOGI (Consultas de Cuidado y Apoyo)"
  },
  "screen": {
    "yesno": {
      "title": "Sí / No",
      "yes": "Sí",
      "no": "No",
      "unknown": "No lo sé",
      "prompt": "Elija abajo",
      "selecting": "Estoy eligiendo esto",
      "cancel": "Cancelar",
      "cleared": "Cancelado"
    },
    "health": {
      "title": "Estado / Dolor",
      "intro": "Comunique a quienes le rodean cómo se siente su cuerpo.",
      "step1": "Dónde",
      "step2": "Cuánto",
      "front": "Delante",
      "back": "Detrás",
      "restart": "Empezar de nuevo",
      "speak": "Lectura en voz alta",
      "level": "Intensidad",
      "parts": {
        "head": "Cabeza",
        "face": "Cara",
        "neck": "Cuello",
        "chest": "Pecho",
        "belly": "Vientre",
        "back": "Espalda alta",
        "waist": "Espalda baja",
        "arm": "Brazo",
        "hand": "Mano",
        "leg": "Pierna",
        "foot": "Pie"
      }
    },
    "photo": {
      "title": "Personas / Fotos",
      "tab": {
        "people": "Personas",
        "places": "Lugares",
        "food": "Comida",
        "activities": "Actividades",
        "wants": "Deseos"
      },
      "empty": "Todavía no hay fotos",
      "emptyCreate": "Use los botones de abajo para añadir una foto",
      "fromCamera": "Hacer una foto",
      "fromRoll": "Elegir del álbum",
      "cropTitle": "Ajustar la foto",
      "cropHint": "Coloque con el dedo o las flechas; cambie el tamaño con el control deslizante",
      "zoom": "Tamaño",
      "panUp": "Mover arriba",
      "panDown": "Mover abajo",
      "panLeft": "Mover a la izquierda",
      "panRight": "Mover a la derecha",
      "labelLabel": "Nombre / palabra",
      "labelPlaceholder": "Escriba un nombre o una palabra",
      "make": "Crear",
      "cancel": "Cancelar",
      "close": "Cerrar",
      "speak": "Lectura en voz alta",
      "save": "Guardar",
      "del": "Borrar",
      "delConfirm": "¿Borrar esta foto?",
      "delYes": "Borrar",
      "delNo": "Conservar",
      "added": "Añadido",
      "saved": "Guardado",
      "deleted": "Borrado",
      "storageFull": "El almacenamiento está lleno, no se pudo añadir",
      "photoFail": "No se pudo cargar la foto"
    },
    "number": {
      "title": "Números / Hora",
      "count": "Cantidad",
      "delOne": "Borrar uno",
      "delAll": "Borrar todo",
      "read": "Lectura en voz alta",
      "numHint": "Toque un número",
      "dawn": "Mañana",
      "day": "Mediodía",
      "eve": "Tarde",
      "night": "Noche"
    },
    "kana": {
      "title": "Palabras",
      "guide": "Toque las letras. Se alinean arriba.",
      "stripEmpty": "Las letras aparecerán aquí",
      "undo": "Deshacer",
      "delOne": "Borrar una",
      "clearAll": "Borrar todo",
      "say": "Lectura en voz alta",
      "space": "Espacio",
      "cleared": "Todo borrado. Toque «Deshacer» para recuperarlo.",
      "restored": "Restaurado"
    }
  }
};

/* ============ it ============ */
var it = {
  "app": {
    "name": "Note di conversazione SOYOGI",
    "tagline": "Un quaderno che aiuta a mostrare, indicare e comunicare."
  },
  "home": {
    "welcome": "Scegli con un pulsante qui sotto"
  },
  "nav": {
    "yesno": "Sì / No",
    "health": "Condizione / Dolore",
    "photo": "Persone / Foto",
    "number": "Numeri / Ora",
    "kana": "Parole",
    "set": "Impostazioni"
  },
  "lock": {
    "hint": "Ancora {n}",
    "hdHint": "Sblocca per le impostazioni",
    "unlocked": "Modalità creazione attiva 🔓",
    "locked": "Di nuovo in modalità uso 🔒",
    "setNote": "Questa schermata viene impostata da chi assiste o dai familiari.",
    "toSelf": "🔒 Torna alla modalità uso",
    "tapN": "Tocchi per entrare in modalità creazione",
    "times": " tocchi"
  },
  "set": {
    "hNormal": "Impostazioni di base",
    "lang": "ことば / Language",
    "fs": "Dimensione testo",
    "fsSizes": [
      "Normale",
      "Grande",
      "Molto grande"
    ],
    "showText": "Testo della carta",
    "on": "ON",
    "off": "OFF",
    "tts": "Lettura vocale",
    "weakSide": "Lato meno visibile",
    "weakSides": [
      "Nessuno",
      "Sinistra",
      "Destra"
    ],
    "theme": "Colore",
    "themes": [
      "Verde",
      "Azzurro",
      "Bianco",
      "Scuro"
    ],
    "bgm": "Musica",
    "bgms": [
      "Nessuna",
      "1",
      "2"
    ],
    "vol": "Volume",
    "vols": [
      "Basso",
      "Medio",
      "Alto"
    ],
    "hBackup": "Cambio telefono (backup)",
    "bkHint": "Quando passi a un nuovo telefono, usa \"Esporta\" per salvare un file, poi aprilo sul nuovo telefono con \"Importa\".",
    "bkExport": "Esporta",
    "bkImport": "Importa",
    "exported": "Esportato ✓",
    "imported": "Importato ✓",
    "importFail": "Impossibile importare",
    "privacy": "Informativa sulla privacy",
    "credit": "App di: SOYOGI (sportello di assistenza e supporto)"
  },
  "screen": {
    "yesno": {
      "title": "Sì / No",
      "yes": "Sì",
      "no": "No",
      "unknown": "Non so",
      "prompt": "Scegli qui sotto",
      "selecting": "Sto scegliendo questo",
      "cancel": "Annulla",
      "cleared": "Annullato"
    },
    "health": {
      "title": "Condizione / Dolore",
      "intro": "Comunica a chi ti sta vicino come ti senti.",
      "step1": "Dove",
      "step2": "Quanto",
      "front": "Davanti",
      "back": "Dietro",
      "restart": "Ricomincia",
      "speak": "Lettura vocale",
      "level": "Intensità",
      "parts": {
        "head": "Testa",
        "face": "Viso",
        "neck": "Collo",
        "chest": "Petto",
        "belly": "Pancia",
        "back": "Schiena",
        "waist": "Zona lombare",
        "arm": "Braccio",
        "hand": "Mano",
        "leg": "Gamba",
        "foot": "Piede"
      }
    },
    "photo": {
      "title": "Persone / Foto",
      "tab": {
        "people": "Persone",
        "places": "Luoghi",
        "food": "Cibo",
        "activities": "Attività",
        "wants": "Desideri"
      },
      "empty": "Ancora nessuna foto",
      "emptyCreate": "Usa i pulsanti qui sotto per aggiungere una foto",
      "fromCamera": "Scatta una foto",
      "fromRoll": "Scegli dall'album",
      "cropTitle": "Sistema la foto",
      "cropHint": "Sposta con il dito o le frecce; ridimensiona con il cursore.",
      "zoom": "Dimensione",
      "panUp": "Sposta su",
      "panDown": "Sposta giù",
      "panLeft": "Sposta a sinistra",
      "panRight": "Sposta a destra",
      "labelLabel": "Nome / parola",
      "labelPlaceholder": "Scrivi un nome o una parola",
      "make": "Crea",
      "cancel": "Annulla",
      "close": "Chiudi",
      "speak": "Lettura vocale",
      "save": "Salva",
      "del": "Elimina",
      "delConfirm": "Eliminare questa foto?",
      "delYes": "Elimina",
      "delNo": "Mantieni",
      "added": "Aggiunto",
      "saved": "Salvato",
      "deleted": "Eliminato",
      "storageFull": "Memoria piena, impossibile aggiungere",
      "photoFail": "Impossibile caricare la foto"
    },
    "number": {
      "title": "Numeri / Ora",
      "count": "Quantità",
      "delOne": "Elimina uno",
      "delAll": "Cancella tutto",
      "read": "Leggi",
      "numHint": "Tocca un numero",
      "dawn": "Mattina",
      "day": "Giorno",
      "eve": "Sera",
      "night": "Notte"
    },
    "kana": {
      "title": "Parole",
      "guide": "Tocca le lettere una a una; appaiono in alto.",
      "stripEmpty": "Qui appariranno le lettere",
      "undo": "Annulla",
      "delOne": "Elimina una lettera",
      "clearAll": "Cancella tutto",
      "say": "Lettura vocale",
      "space": "Spazio",
      "cleared": "Tutto cancellato. Tocca \"Annulla\" per ripristinare.",
      "restored": "Ripristinato"
    }
  }
};

/* ============ pt ============ */
var pt = {
  "app": {
    "name": "Notas de Conversa Soyogi",
    "tagline": "Um caderno que ajuda a mostrar, apontar e comunicar."
  },
  "home": {
    "welcome": "Escolha um botão abaixo"
  },
  "nav": {
    "yesno": "Sim / Não",
    "health": "Estado / Dor",
    "photo": "Pessoas / Fotos",
    "number": "Números / Hora",
    "kana": "Palavras",
    "set": "Ajustes"
  },
  "lock": {
    "hint": "Mais {n}",
    "hdHint": "Desbloquear para ajustes",
    "unlocked": "Modo de criação ativado 🔓",
    "locked": "De volta ao modo de uso 🔒",
    "setNote": "Esta tela é configurada por um cuidador ou familiar.",
    "toSelf": "🔒 Voltar ao modo de uso",
    "tapN": "Toques para entrar no modo de criação",
    "times": " toques"
  },
  "set": {
    "hNormal": "Ajustes básicos",
    "lang": "ことば / Language",
    "fs": "Tamanho do texto",
    "fsSizes": [
      "Normal",
      "Grande",
      "Muito grande"
    ],
    "showText": "Texto do cartão",
    "on": "ON",
    "off": "OFF",
    "tts": "Ler em voz alta",
    "weakSide": "Lado mais difícil de ver",
    "weakSides": [
      "Nenhum",
      "Esquerda",
      "Direita"
    ],
    "theme": "Cor",
    "themes": [
      "Verde",
      "Água",
      "Branco",
      "Escuro"
    ],
    "bgm": "Música",
    "bgms": [
      "Desligada",
      "1",
      "2"
    ],
    "vol": "Volume",
    "vols": [
      "Baixo",
      "Normal",
      "Alto"
    ],
    "hBackup": "Trocar de telefone (backup)",
    "bkHint": "Ao mudar para um telefone novo, use \"Exportar\" para salvar um arquivo e depois abra-o no telefone novo com \"Importar\".",
    "bkExport": "Exportar",
    "bkImport": "Importar",
    "exported": "Exportado ✓",
    "imported": "Importado ✓",
    "importFail": "Não foi possível importar",
    "privacy": "Política de Privacidade",
    "credit": "Aplicativo por: Soyogi (Consultoria de Cuidado e Apoio)"
  },
  "screen": {
    "yesno": {
      "title": "Sim / Não",
      "yes": "Sim",
      "no": "Não",
      "unknown": "Não sei",
      "prompt": "Escolha abaixo",
      "selecting": "Estou escolhendo isto",
      "cancel": "Cancelar",
      "cleared": "Cancelado"
    },
    "health": {
      "title": "Estado / Dor",
      "intro": "Mostre às pessoas ao seu redor como o seu corpo está.",
      "step1": "Onde",
      "step2": "Quanto",
      "front": "Frente",
      "back": "Costas",
      "restart": "Recomeçar",
      "speak": "Ler em voz alta",
      "level": "Intensidade",
      "parts": {
        "head": "Cabeça",
        "face": "Rosto",
        "neck": "Pescoço",
        "chest": "Peito",
        "belly": "Barriga",
        "back": "Costas",
        "waist": "Lombar",
        "arm": "Braço",
        "hand": "Mão",
        "leg": "Perna",
        "foot": "Pé"
      }
    },
    "photo": {
      "title": "Pessoas / Fotos",
      "tab": {
        "people": "Pessoas",
        "places": "Lugares",
        "food": "Comida",
        "activities": "Atividades",
        "wants": "Desejos"
      },
      "empty": "Ainda não há fotos",
      "emptyCreate": "Use os botões abaixo para adicionar uma foto",
      "fromCamera": "Tirar uma foto",
      "fromRoll": "Escolher do álbum",
      "cropTitle": "Ajustar a foto",
      "cropHint": "Posicione com o dedo ou as setas; ajuste o tamanho com o controle deslizante",
      "zoom": "Tamanho",
      "panUp": "Mover para cima",
      "panDown": "Mover para baixo",
      "panLeft": "Mover para a esquerda",
      "panRight": "Mover para a direita",
      "labelLabel": "Nome / palavra",
      "labelPlaceholder": "Escreva um nome ou palavra",
      "make": "Criar",
      "cancel": "Cancelar",
      "close": "Fechar",
      "speak": "Ler em voz alta",
      "save": "Salvar",
      "del": "Apagar",
      "delConfirm": "Apagar esta foto?",
      "delYes": "Apagar",
      "delNo": "Manter",
      "added": "Adicionado",
      "saved": "Salvo",
      "deleted": "Apagado",
      "storageFull": "A memória está cheia, não foi possível adicionar",
      "photoFail": "Não foi possível carregar a foto"
    },
    "number": {
      "title": "Números / Hora",
      "count": "Quantidade",
      "delOne": "Apagar um",
      "delAll": "Apagar tudo",
      "read": "Ler em voz alta",
      "numHint": "Toque em um número",
      "dawn": "Manhã",
      "day": "Meio-dia",
      "eve": "Tarde",
      "night": "Noite"
    },
    "kana": {
      "title": "Palavras",
      "guide": "Toque nas letras. Elas aparecem em fila acima.",
      "stripEmpty": "As letras aparecerão aqui",
      "undo": "Desfazer",
      "delOne": "Apagar uma",
      "clearAll": "Apagar tudo",
      "say": "Ler em voz alta",
      "space": "Espaço",
      "cleared": "Tudo apagado. Toque em \"Desfazer\" para recuperar.",
      "restored": "Recuperado"
    }
  }
};

/* ============ nl ============ */
var nl = {
  "app": {
    "name": "Soyogi gespreksnotities",
    "tagline": "Een notitieboek dat helpt om te laten zien, te wijzen en te delen."
  },
  "home": {
    "welcome": "Kies hieronder een knop"
  },
  "nav": {
    "yesno": "Ja / Nee",
    "health": "Toestand / Pijn",
    "photo": "Mensen / Foto's",
    "number": "Cijfers / Tijd",
    "kana": "Woorden",
    "set": "Instellingen"
  },
  "lock": {
    "hint": "Nog {n}",
    "hdHint": "Ontgrendel voor instellingen",
    "unlocked": "Bewerkmodus aan 🔓",
    "locked": "Terug naar gebruiksmodus 🔒",
    "setNote": "Dit scherm wordt ingesteld door een verzorger of familielid.",
    "toSelf": "🔒 Terug naar gebruiksmodus",
    "tapN": "Tikken om de bewerkmodus te openen",
    "times": " tikken"
  },
  "set": {
    "hNormal": "Basisinstellingen",
    "lang": "ことば / Language",
    "fs": "Tekstgrootte",
    "fsSizes": [
      "Normaal",
      "Groot",
      "Extra groot"
    ],
    "showText": "Kaarttekst",
    "on": "AAN",
    "off": "UIT",
    "tts": "Voorlezen",
    "weakSide": "Moeilijk zichtbare kant",
    "weakSides": [
      "Geen",
      "Links",
      "Rechts"
    ],
    "theme": "Kleur",
    "themes": [
      "Groen",
      "Aqua",
      "Wit",
      "Donker"
    ],
    "bgm": "Muziek",
    "bgms": [
      "Uit",
      "1",
      "2"
    ],
    "vol": "Volume",
    "vols": [
      "Zacht",
      "Normaal",
      "Hard"
    ],
    "hBackup": "Van telefoon wisselen (back-up)",
    "bkHint": "Als u naar een nieuwe telefoon overgaat, gebruik \"Exporteren\" om een bestand op te slaan en open het op de nieuwe telefoon met \"Importeren\".",
    "bkExport": "Exporteren",
    "bkImport": "Importeren",
    "exported": "Geëxporteerd ✓",
    "imported": "Geïmporteerd ✓",
    "importFail": "Importeren mislukt",
    "privacy": "Privacybeleid",
    "credit": "App door: Soyogi (Zorg- en ondersteuningsadvies)"
  },
  "screen": {
    "yesno": {
      "title": "Ja / Nee",
      "yes": "Ja",
      "no": "Nee",
      "unknown": "Weet ik niet",
      "prompt": "Kies hieronder",
      "selecting": "Ik kies dit",
      "cancel": "Annuleren",
      "cleared": "Geannuleerd"
    },
    "health": {
      "title": "Toestand / Pijn",
      "intro": "Laat de mensen om u heen weten hoe uw lichaam aanvoelt.",
      "step1": "Waar",
      "step2": "Hoeveel",
      "front": "Voorkant",
      "back": "Achterkant",
      "restart": "Opnieuw beginnen",
      "speak": "Voorlezen",
      "level": "Sterkte",
      "parts": {
        "head": "Hoofd",
        "face": "Gezicht",
        "neck": "Nek",
        "chest": "Borst",
        "belly": "Buik",
        "back": "Bovenrug",
        "waist": "Onderrug",
        "arm": "Arm",
        "hand": "Hand",
        "leg": "Been",
        "foot": "Voet"
      }
    },
    "photo": {
      "title": "Mensen / Foto's",
      "tab": {
        "people": "Mensen",
        "places": "Plaatsen",
        "food": "Eten",
        "activities": "Activiteiten",
        "wants": "Wensen"
      },
      "empty": "Nog geen foto's",
      "emptyCreate": "Voeg een foto toe met de knoppen hieronder",
      "fromCamera": "Foto maken",
      "fromRoll": "Kiezen uit album",
      "cropTitle": "Foto passend maken",
      "cropHint": "Verschuif met uw vinger of de pijlen; verander de grootte met de schuifregelaar",
      "zoom": "Grootte",
      "panUp": "Omhoog verplaatsen",
      "panDown": "Omlaag verplaatsen",
      "panLeft": "Naar links verplaatsen",
      "panRight": "Naar rechts verplaatsen",
      "labelLabel": "Naam / woord",
      "labelPlaceholder": "Schrijf een naam of woord",
      "make": "Maken",
      "cancel": "Annuleren",
      "close": "Sluiten",
      "speak": "Voorlezen",
      "save": "Opslaan",
      "del": "Verwijderen",
      "delConfirm": "Deze foto verwijderen?",
      "delYes": "Verwijderen",
      "delNo": "Behouden",
      "added": "Toegevoegd",
      "saved": "Opgeslagen",
      "deleted": "Verwijderd",
      "storageFull": "Opslag is vol, toevoegen niet gelukt",
      "photoFail": "Foto laden mislukt"
    },
    "number": {
      "title": "Cijfers / Tijd",
      "count": "Aantal",
      "delOne": "Eén verwijderen",
      "delAll": "Alles wissen",
      "read": "Voorlezen",
      "numHint": "Tik op een cijfer",
      "dawn": "Ochtend",
      "day": "Middag",
      "eve": "Avond",
      "night": "Nacht"
    },
    "kana": {
      "title": "Woorden",
      "guide": "Tik op letters. Ze verschijnen bovenaan.",
      "stripEmpty": "Hier verschijnen de letters",
      "undo": "Ongedaan maken",
      "delOne": "Eén letter verwijderen",
      "clearAll": "Alles wissen",
      "say": "Voorlezen",
      "space": "Spatie",
      "cleared": "Alles gewist. Tik op \"Ongedaan maken\" om het terug te halen.",
      "restored": "Teruggehaald"
    }
  }
};

/* ============ sv ============ */
var sv = {
  "app": {
    "name": "Soyogi Samtalsanteckningar",
    "tagline": "En anteckningsbok som hjälper dig att visa, peka och förmedla."
  },
  "home": {
    "welcome": "Välj en knapp nedan"
  },
  "nav": {
    "yesno": "Ja / Nej",
    "health": "Mående / Smärta",
    "photo": "Personer / Foton",
    "number": "Siffror / Tid",
    "kana": "Ord",
    "set": "Inställningar"
  },
  "lock": {
    "hint": "{n} kvar",
    "hdHint": "Lås upp för inställningar",
    "unlocked": "Redigeringsläge på 🔓",
    "locked": "Tillbaka till användarläge 🔒",
    "setNote": "Den här skärmen ställs in av en vårdare eller anhörig.",
    "toSelf": "🔒 Tillbaka till användarläge",
    "tapN": "Tryck för att gå till redigeringsläge",
    "times": " tryck"
  },
  "set": {
    "hNormal": "Grundinställningar",
    "lang": "ことば / Language",
    "fs": "Textstorlek",
    "fsSizes": [
      "Normal",
      "Stor",
      "Extra stor"
    ],
    "showText": "Text på kort",
    "on": "PÅ",
    "off": "AV",
    "tts": "Läs upp",
    "weakSide": "Sida som syns sämre",
    "weakSides": [
      "Ingen",
      "Vänster",
      "Höger"
    ],
    "theme": "Färg",
    "themes": [
      "Grön",
      "Turkos",
      "Vit",
      "Mörk"
    ],
    "bgm": "Musik",
    "bgms": [
      "Av",
      "1",
      "2"
    ],
    "vol": "Volym",
    "vols": [
      "Låg",
      "Normal",
      "Hög"
    ],
    "hBackup": "Byta telefon (säkerhetskopia)",
    "bkHint": "När du byter till en ny telefon, använd \"Exportera\" för att spara en fil, och öppna den sedan på den nya telefonen med \"Importera\".",
    "bkExport": "Exportera",
    "bkImport": "Importera",
    "exported": "Exporterat ✓",
    "imported": "Importerat ✓",
    "importFail": "Kunde inte importera",
    "privacy": "Integritetspolicy",
    "credit": "App av: Soyogi (Rådgivning för vård och stöd)"
  },
  "screen": {
    "yesno": {
      "title": "Ja / Nej",
      "yes": "Ja",
      "no": "Nej",
      "unknown": "Vet inte",
      "prompt": "Välj nedan",
      "selecting": "Jag väljer det här",
      "cancel": "Avbryt",
      "cleared": "Rensat"
    },
    "health": {
      "title": "Mående / Smärta",
      "intro": "Visa personerna runt dig hur din kropp känns.",
      "step1": "Var",
      "step2": "Hur mycket",
      "front": "Framsida",
      "back": "Baksida",
      "restart": "Börja om",
      "speak": "Läs upp",
      "level": "Styrka",
      "parts": {
        "head": "Huvud",
        "face": "Ansikte",
        "neck": "Hals",
        "chest": "Bröst",
        "belly": "Mage",
        "back": "Övre rygg",
        "waist": "Nedre rygg",
        "arm": "Arm",
        "hand": "Hand",
        "leg": "Ben",
        "foot": "Fot"
      }
    },
    "photo": {
      "title": "Personer / Foton",
      "tab": {
        "people": "Personer",
        "places": "Platser",
        "food": "Mat",
        "activities": "Aktiviteter",
        "wants": "Önskemål"
      },
      "empty": "Inga foton än",
      "emptyCreate": "Använd knapparna nedan för att lägga till ett foto",
      "fromCamera": "Ta ett foto",
      "fromRoll": "Välj från albumet",
      "cropTitle": "Justera fotot",
      "cropHint": "Flytta med fingret eller pilarna, ändra storlek med reglaget",
      "zoom": "Storlek",
      "panUp": "Flytta upp",
      "panDown": "Flytta ner",
      "panLeft": "Flytta vänster",
      "panRight": "Flytta höger",
      "labelLabel": "Namn / ord",
      "labelPlaceholder": "Skriv ett namn eller ord",
      "make": "Skapa",
      "cancel": "Avbryt",
      "close": "Stäng",
      "speak": "Läs upp",
      "save": "Spara",
      "del": "Ta bort",
      "delConfirm": "Ta bort det här fotot?",
      "delYes": "Ta bort",
      "delNo": "Behåll",
      "added": "Tillagt",
      "saved": "Sparat",
      "deleted": "Borttaget",
      "storageFull": "Lagringen är full, kunde inte lägga till",
      "photoFail": "Kunde inte läsa in fotot"
    },
    "number": {
      "title": "Siffror / Tid",
      "count": "Antal",
      "delOne": "Ta bort en",
      "delAll": "Rensa allt",
      "read": "Läs upp",
      "numHint": "Tryck på en siffra",
      "dawn": "Morgon",
      "day": "Dag",
      "eve": "Kväll",
      "night": "Natt"
    },
    "kana": {
      "title": "Ord",
      "guide": "Tryck på bokstäver. De radas upp ovanför.",
      "stripEmpty": "Bokstäverna visas här",
      "undo": "Ångra",
      "delOne": "Ta bort en",
      "clearAll": "Rensa allt",
      "say": "Läs upp",
      "space": "Mellanslag",
      "cleared": "Rensat. Tryck på \"Ångra\" för att få tillbaka.",
      "restored": "Återställt"
    }
  }
};

/* ============ ko ============ */
var ko = {
  "app": {
    "name": "대화 보조 노트 · SOYOGI",
    "tagline": "보여주고 · 가리키고 · 전하는, 대화를 돕는 노트."
  },
  "home": {
    "welcome": "아래 버튼에서 골라 주세요"
  },
  "nav": {
    "yesno": "예 · 아니요",
    "health": "몸 상태 · 통증",
    "photo": "사람 · 사진",
    "number": "숫자 · 시간",
    "kana": "글자",
    "set": "설정"
  },
  "lock": {
    "hint": "{n}번 더",
    "hdHint": "설정은 잠금 해제",
    "unlocked": "만들기 모드가 되었어요 🔓",
    "locked": "사용 모드로 돌아왔어요 🔒",
    "setNote": "이 화면은 돌봄을 하는 분이나 가족이 설정합니다.",
    "toSelf": "🔒 사용 모드로 돌아가기",
    "tapN": "만들기 모드로 들어가려면 탭",
    "times": "번"
  },
  "set": {
    "hNormal": "기본 설정",
    "lang": "ことば / Language",
    "fs": "글자 크기",
    "fsSizes": [
      "보통",
      "크게",
      "아주 크게"
    ],
    "showText": "카드 글자",
    "on": "ON",
    "off": "OFF",
    "tts": "읽어 주기",
    "weakSide": "잘 안 보이는 쪽",
    "weakSides": [
      "없음",
      "왼쪽",
      "오른쪽"
    ],
    "theme": "색",
    "themes": [
      "초록",
      "하늘색",
      "흰색",
      "검정"
    ],
    "bgm": "배경 음악",
    "bgms": [
      "없음",
      "1",
      "2"
    ],
    "vol": "소리 크기",
    "vols": [
      "작게",
      "보통",
      "크게"
    ],
    "hBackup": "기기 변경 (백업)",
    "bkHint": "새 스마트폰으로 옮길 때는 「내보내기」로 파일을 저장한 뒤, 새 스마트폰에서 「불러오기」를 눌러 주세요.",
    "bkExport": "내보내기",
    "bkImport": "불러오기",
    "exported": "내보냈어요 ✓",
    "imported": "불러왔어요 ✓",
    "importFail": "불러오지 못했어요",
    "privacy": "개인정보 처리방침",
    "credit": "앱 개발: 돌봄과 지원 상담소 SOYOGI"
  },
  "screen": {
    "yesno": {
      "title": "예 · 아니요",
      "yes": "예",
      "no": "아니요",
      "unknown": "잘 모르겠어요",
      "prompt": "아래에서 골라 주세요",
      "selecting": "이것을 고르고 있어요",
      "cancel": "취소",
      "cleared": "취소했어요"
    },
    "health": {
      "title": "몸 상태 · 통증",
      "intro": "몸 상태를 주변 사람에게 전합니다.",
      "step1": "어디",
      "step2": "얼마나",
      "front": "앞",
      "back": "뒤",
      "restart": "처음부터",
      "speak": "읽어 주기",
      "level": "세기",
      "parts": {
        "head": "머리",
        "face": "얼굴",
        "neck": "목",
        "chest": "가슴",
        "belly": "배",
        "back": "등",
        "waist": "허리",
        "arm": "팔",
        "hand": "손",
        "leg": "다리",
        "foot": "발"
      }
    },
    "photo": {
      "title": "사람 · 사진",
      "tab": {
        "people": "사람",
        "places": "장소",
        "food": "음식",
        "activities": "활동",
        "wants": "원하는 것"
      },
      "empty": "아직 사진이 없어요",
      "emptyCreate": "아래 버튼으로 사진을 추가할 수 있어요",
      "fromCamera": "카메라로 찍기",
      "fromRoll": "앨범에서 고르기",
      "cropTitle": "사진 위치 맞추기",
      "cropHint": "위치는 손가락이나 화살표로, 크기는 슬라이더로",
      "zoom": "크기",
      "panUp": "위로 옮기기",
      "panDown": "아래로 옮기기",
      "panLeft": "왼쪽으로 옮기기",
      "panRight": "오른쪽으로 옮기기",
      "labelLabel": "이름 · 낱말",
      "labelPlaceholder": "이름이나 낱말을 적어 주세요",
      "make": "이것으로 만들기",
      "cancel": "그만두기",
      "close": "닫기",
      "speak": "읽어 주기",
      "save": "저장",
      "del": "지우기",
      "delConfirm": "이 사진을 지울까요?",
      "delYes": "지우기",
      "delNo": "그만두기",
      "added": "추가했어요",
      "saved": "저장했어요",
      "deleted": "지웠어요",
      "storageFull": "저장 공간이 가득 차서 추가하지 못했어요",
      "photoFail": "사진을 불러오지 못했어요"
    },
    "number": {
      "title": "숫자 · 시간",
      "count": "개수",
      "delOne": "하나 지우기",
      "delAll": "전부 지우기",
      "read": "읽기",
      "numHint": "숫자를 눌러 주세요",
      "dawn": "아침",
      "day": "낮",
      "eve": "저녁",
      "night": "밤"
    },
    "kana": {
      "title": "글자",
      "guide": "한 글자씩 고르면 위에 나란히 놓여요",
      "stripEmpty": "여기에 글자가 놓여요",
      "undo": "되돌리기",
      "delOne": "한 글자 지우기",
      "clearAll": "전부 지우기",
      "say": "읽어 주기",
      "space": "띄어쓰기",
      "cleared": "전부 지웠어요. 「되돌리기」로 되살릴 수 있어요",
      "restored": "되돌렸어요"
    }
  }
};

/* ============ zh ============ */
var zh = {
  "app": {
    "name": "对话辅助笔记 · SOYOGI",
    "tagline": "展示、指认、表达,帮助交流的笔记。"
  },
  "home": {
    "welcome": "请从下方的按钮中选择"
  },
  "nav": {
    "yesno": "是 / 否",
    "health": "身体状况 / 疼痛",
    "photo": "人物 / 照片",
    "number": "数字 / 时间",
    "kana": "文字",
    "set": "设置"
  },
  "lock": {
    "hint": "还差 {n} 次",
    "hdHint": "设置需解锁",
    "unlocked": "已进入编辑模式 🔓",
    "locked": "已返回使用模式 🔒",
    "setNote": "此界面由照护者或家人进行设置。",
    "toSelf": "🔒 返回使用模式",
    "tapN": "点按进入编辑模式",
    "times": "次"
  },
  "set": {
    "hNormal": "常用设置",
    "lang": "ことば / Language",
    "fs": "文字大小",
    "fsSizes": [
      "普通",
      "大",
      "特大"
    ],
    "showText": "卡片文字",
    "on": "ON",
    "off": "OFF",
    "tts": "朗读",
    "weakSide": "不易看清的一侧",
    "weakSides": [
      "无",
      "左",
      "右"
    ],
    "theme": "颜色",
    "themes": [
      "绿色",
      "浅蓝",
      "白色",
      "黑色"
    ],
    "bgm": "背景音乐",
    "bgms": [
      "无",
      "1",
      "2"
    ],
    "vol": "音量",
    "vols": [
      "小",
      "普通",
      "大"
    ],
    "hBackup": "更换手机(备份)",
    "bkHint": "更换新手机时,请先用“导出”保存文件,再在新手机上点按“导入”。",
    "bkExport": "导出",
    "bkImport": "导入",
    "exported": "已导出 ✓",
    "imported": "已导入 ✓",
    "importFail": "无法导入",
    "privacy": "隐私政策",
    "credit": "应用开发:介护与支援咨询处 SOYOGI"
  },
  "screen": {
    "yesno": {
      "title": "是 / 否",
      "yes": "是",
      "no": "否",
      "unknown": "不确定",
      "prompt": "请从下方选择",
      "selecting": "正在选择这个",
      "cancel": "取消",
      "cleared": "已取消"
    },
    "health": {
      "title": "身体状况 / 疼痛",
      "intro": "把身体的感受告诉身边的人。",
      "step1": "哪里",
      "step2": "程度",
      "front": "正面",
      "back": "背面",
      "restart": "重新开始",
      "speak": "朗读",
      "level": "强度",
      "parts": {
        "head": "头",
        "face": "脸",
        "neck": "脖子",
        "chest": "胸",
        "belly": "肚子",
        "back": "上背",
        "waist": "腰",
        "arm": "手臂",
        "hand": "手",
        "leg": "腿",
        "foot": "脚"
      }
    },
    "photo": {
      "title": "人物 / 照片",
      "tab": {
        "people": "人物",
        "places": "地点",
        "food": "食物",
        "activities": "活动",
        "wants": "想要的"
      },
      "empty": "还没有照片",
      "emptyCreate": "可用下方的按钮添加照片",
      "fromCamera": "用相机拍摄",
      "fromRoll": "从相册中选择",
      "cropTitle": "调整照片位置",
      "cropHint": "位置用手指或箭头调整,大小用滑块调整",
      "zoom": "大小",
      "panUp": "向上移动",
      "panDown": "向下移动",
      "panLeft": "向左移动",
      "panRight": "向右移动",
      "labelLabel": "名称 / 词语",
      "labelPlaceholder": "请输入名称或词语",
      "make": "创建",
      "cancel": "取消",
      "close": "关闭",
      "speak": "朗读",
      "save": "保存",
      "del": "删除",
      "delConfirm": "要删除这张照片吗?",
      "delYes": "删除",
      "delNo": "保留",
      "added": "已添加",
      "saved": "已保存",
      "deleted": "已删除",
      "storageFull": "存储空间已满,无法添加",
      "photoFail": "无法加载照片"
    },
    "number": {
      "title": "数字 / 时间",
      "count": "数量",
      "delOne": "删除一个",
      "delAll": "全部删除",
      "read": "朗读",
      "numHint": "请点按数字",
      "dawn": "早上",
      "day": "白天",
      "eve": "傍晚",
      "night": "晚上"
    },
    "kana": {
      "title": "文字",
      "guide": "逐字选择,会排列在上方",
      "stripEmpty": "文字会显示在这里",
      "undo": "撤销",
      "delOne": "删除一个字",
      "clearAll": "全部删除",
      "say": "朗读",
      "space": "空格",
      "cleared": "已全部删除。点按“撤销”可恢复",
      "restored": "已恢复"
    }
  }
};

/* ============ ar ============ */
var ar = {
  "app": {
    "name": "دفتر مساعدة المحادثة · SOYOGI",
    "tagline": "دفتر يساعدك على أن تُري وتُشير وتُعبِّر."
  },
  "home": {
    "welcome": "اختر زرًّا من الأسفل"
  },
  "nav": {
    "yesno": "نعم / لا",
    "health": "الحالة / الألم",
    "photo": "أشخاص / صور",
    "number": "أرقام / وقت",
    "kana": "كلمات",
    "set": "الإعدادات"
  },
  "lock": {
    "hint": "بقي {n}",
    "hdHint": "افتح القفل للإعدادات",
    "unlocked": "وضع الإعداد مفعّل 🔓",
    "locked": "العودة إلى وضع الاستخدام 🔒",
    "setNote": "يقوم بإعداد هذه الشاشة أحد مقدّمي الرعاية أو أفراد العائلة.",
    "toSelf": "🔒 العودة إلى وضع الاستخدام",
    "tapN": "نقرات للدخول إلى وضع الإعداد",
    "times": " نقرات"
  },
  "set": {
    "hNormal": "الإعدادات الأساسية",
    "lang": "ことば / Language",
    "fs": "حجم الخط",
    "fsSizes": [
      "عادي",
      "كبير",
      "كبير جدًا"
    ],
    "showText": "نص البطاقة",
    "on": "تشغيل",
    "off": "إيقاف",
    "tts": "القراءة الصوتية",
    "weakSide": "الجهة الأصعب رؤيةً",
    "weakSides": [
      "لا شيء",
      "يسار",
      "يمين"
    ],
    "theme": "اللون",
    "themes": [
      "أخضر",
      "سماوي",
      "أبيض",
      "داكن"
    ],
    "bgm": "موسيقى",
    "bgms": [
      "إيقاف",
      "1",
      "2"
    ],
    "vol": "مستوى الصوت",
    "vols": [
      "منخفض",
      "عادي",
      "مرتفع"
    ],
    "hBackup": "تغيير الهاتف (نسخة احتياطية)",
    "bkHint": "عند الانتقال إلى هاتف جديد، استخدم «تصدير» لحفظ ملف، ثم افتحه على الهاتف الجديد بالضغط على «استيراد».",
    "bkExport": "تصدير",
    "bkImport": "استيراد",
    "exported": "تم التصدير ✓",
    "imported": "تم الاستيراد ✓",
    "importFail": "تعذّر الاستيراد",
    "privacy": "سياسة الخصوصية",
    "credit": "تطوير التطبيق: SOYOGI (مركز استشارات الرعاية والدعم)"
  },
  "screen": {
    "yesno": {
      "title": "نعم / لا",
      "yes": "نعم",
      "no": "لا",
      "unknown": "لست متأكدًا",
      "prompt": "اختر من الأسفل",
      "selecting": "أختار هذا",
      "cancel": "إلغاء",
      "cleared": "تم الإلغاء"
    },
    "health": {
      "title": "الحالة / الألم",
      "intro": "عبِّر لمن حولك عمّا تشعر به في جسدك.",
      "step1": "أين",
      "step2": "إلى أي درجة",
      "front": "الأمام",
      "back": "الخلف",
      "restart": "البدء من جديد",
      "speak": "القراءة الصوتية",
      "level": "الشدّة",
      "parts": {
        "head": "الرأس",
        "face": "الوجه",
        "neck": "الرقبة",
        "chest": "الصدر",
        "belly": "البطن",
        "back": "أعلى الظهر",
        "waist": "أسفل الظهر",
        "arm": "الذراع",
        "hand": "اليد",
        "leg": "الساق",
        "foot": "القدم"
      }
    },
    "photo": {
      "title": "أشخاص / صور",
      "tab": {
        "people": "أشخاص",
        "places": "أماكن",
        "food": "طعام",
        "activities": "أنشطة",
        "wants": "رغبات"
      },
      "empty": "لا توجد صور بعد",
      "emptyCreate": "استخدم الأزرار في الأسفل لإضافة صورة",
      "fromCamera": "التقاط صورة",
      "fromRoll": "اختيار من الألبوم",
      "cropTitle": "ضبط موضع الصورة",
      "cropHint": "حرّك الموضع بإصبعك أو بالأسهم، وغيّر الحجم بالشريط",
      "zoom": "الحجم",
      "panUp": "تحريك للأعلى",
      "panDown": "تحريك للأسفل",
      "panLeft": "تحريك لليسار",
      "panRight": "تحريك لليمين",
      "labelLabel": "الاسم / الكلمة",
      "labelPlaceholder": "اكتب اسمًا أو كلمة",
      "make": "إنشاء",
      "cancel": "إلغاء",
      "close": "إغلاق",
      "speak": "القراءة الصوتية",
      "save": "حفظ",
      "del": "حذف",
      "delConfirm": "هل تريد حذف هذه الصورة؟",
      "delYes": "حذف",
      "delNo": "الاحتفاظ",
      "added": "تمت الإضافة",
      "saved": "تم الحفظ",
      "deleted": "تم الحذف",
      "storageFull": "الذاكرة ممتلئة، تعذّرت الإضافة",
      "photoFail": "تعذّر تحميل الصورة"
    },
    "number": {
      "title": "أرقام / وقت",
      "count": "العدد",
      "delOne": "حذف واحد",
      "delAll": "مسح الكل",
      "read": "القراءة الصوتية",
      "numHint": "اضغط على رقم",
      "dawn": "الصباح",
      "day": "الظهر",
      "eve": "المساء",
      "night": "الليل"
    },
    "kana": {
      "title": "كلمات",
      "guide": "اضغط على الحروف، فتصطفّ في الأعلى.",
      "stripEmpty": "ستظهر الحروف هنا",
      "undo": "تراجع",
      "delOne": "حذف حرف",
      "clearAll": "مسح الكل",
      "say": "القراءة الصوتية",
      "space": "مسافة",
      "cleared": "تم المسح. اضغط «تراجع» لاستعادته.",
      "restored": "تمت الاستعادة"
    }
  }
};

window.KAIWA_I18N = { ja: ja, en: en, de: de, fr: fr, es: es, it: it, pt: pt, nl: nl, sv: sv, ko: ko, zh: zh, ar: ar };

})();
