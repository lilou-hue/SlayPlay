/* ================================================================
   i18n — Shared internationalization module for Game Arcade
   ================================================================ */

const I18N = (() => {
  const translations = {
    en: {
      // Hub
      gameArcade: 'Game Arcade',
      pickAGame: 'Pick a game and start playing',
      flappyBirdTitle: 'Flappy Bird',
      flappyBirdDesc: 'Tap to flap and navigate through the pipes. Classic arcade action!',
      casual: 'Casual',
      methaneDriftTitle: 'Methane Drift',
      methaneDriftDesc: 'Drift through an alien methane sky. Dodge hazards and activate symbiosis to survive.',
      sciFi: 'Sci-Fi',

      // Shared
      backToGames: '\u2190 Back to Games',

      // Flappy Bird
      fbTitle: 'Flappy Bird',
      fbInstructions: 'Press space or click/tap to flap. Avoid the pipes!',
      score: 'Score',
      best: 'Best',
      restart: 'Restart',
      fbTip: 'Tip: keep a steady rhythm to stay in the gap.',
      tapToStart: 'Tap to start',
      keepBirdInGaps: 'Keep the bird in the gaps.',
      gameOver: 'Game Over',
      tapOrSpaceTryAgain: 'Tap or press space to try again.',

      // Methane Drift
      mdTitle: 'Methane Drift',
      mdInstructions_1: 'Drift through an alien methane sky. Tap ',
      mdInstructions_bold1: 'Space / Click',
      mdInstructions_2: ' to pulse upward. Press ',
      mdInstructions_bold2: 'Shift',
      mdInstructions_3: ' to trigger Symbiosis when charged. Press ',
      mdInstructions_bold3: 'Escape',
      mdInstructions_4: ' to pause.',
      distance: 'Distance',
      atmosphere: 'Atmosphere',
      symbiosis: 'Symbiosis',
      combo: 'Combo',
      soundOn: 'Sound: ON',
      soundOff: 'Sound: OFF',
      restartDrift: 'Restart Drift',
      symbiosisBtn: 'Symbiosis',

      // Methane Drift - Density
      buoyant: 'Buoyant',
      dense: 'Dense',
      crushing: 'Crushing',

      // Methane Drift - Symbiosis states
      phasing: 'Phasing',
      symbiosisReady: 'Symbiosis Ready',
      charging: 'Charging',
      ready: 'Ready',

      // Methane Drift - Tutorial
      tutPulseTitle: 'Pulse Upward',
      tutPulseDesc: 'Tap Space or Click to pulse the glider upward',
      tutAvoidTitle: 'Avoid Hazards',
      tutAvoidDesc: 'Navigate through spires, schools, geysers, and storms',
      tutSymbTitle: 'Symbiosis',
      tutSymbDesc: 'Press Shift when charged to phase through obstacles',
      tutTapContinue: 'Tap to continue',

      // Methane Drift - Screens
      methaneDriftLogo: 'METHANE DRIFT',
      spaceClickBegin: 'Space / Click to Begin',
      paused: 'Paused',
      pressEscResume: 'Press Escape to resume',
      signalLost: 'Signal Lost',
      newRecord: 'NEW RECORD',
      dodged: 'Dodged',
      nearMisses: 'Near-misses',
      time: 'Time',
      tapOrSpaceRestart: 'Tap or press Space to restart',

      // Methane Drift - Zone names
      upperAtmosphere: 'Upper Atmosphere',
      midTurbulence: 'Mid Turbulence',
      pressureLayer: 'Pressure Layer',
      coreProximity: 'Core Proximity',
      unstableCore: 'Unstable Core',
      zone: 'Zone',

      // Methane Drift - Achievements
      achievement: 'Achievement',
      achFirstDrift: 'First Drift',
      achFirstDriftDesc: 'Score 1 point',
      achDeepDiver: 'Deep Diver',
      achDeepDiverDesc: 'Score 25 points',
      achPressureVet: 'Pressure Veteran',
      achPressureVetDesc: 'Score 50 points',
      achCoreRunner: 'Core Runner',
      achCoreRunnerDesc: 'Score 100 points',
      achSymbiont: 'Symbiont',
      achSymbiontDesc: 'Use symbiosis 10 times total',
      achUntouchable: 'Untouchable',
      achUntouchableDesc: 'Score 20 without symbiosis',
      achDensityMaster: 'Density Master',
      achDensityMasterDesc: 'Survive 5 Crushing phases in one run',
      achNearMissExpert: 'Near-Miss Expert',
      achNearMissExpertDesc: '10 near-misses in one run',
    },

    ko: {
      gameArcade: '게임 아케이드',
      pickAGame: '게임을 선택하고 플레이하세요',
      flappyBirdTitle: '플래피 버드',
      flappyBirdDesc: '탭하여 날개짓하고 파이프 사이를 지나가세요. 클래식 아케이드 액션!',
      casual: '캐주얼',
      methaneDriftTitle: '메탄 드리프트',
      methaneDriftDesc: '외계 메탄 하늘을 떠다니세요. 장애물을 피하고 공생을 활성화하여 살아남으세요.',
      sciFi: 'SF',

      backToGames: '\u2190 게임 목록으로',

      fbTitle: '플래피 버드',
      fbInstructions: '스페이스바를 누르거나 클릭/탭하여 날개짓하세요. 파이프를 피하세요!',
      score: '점수',
      best: '최고',
      restart: '다시 시작',
      fbTip: '팁: 꾸준한 리듬으로 틈새를 유지하세요.',
      tapToStart: '탭하여 시작',
      keepBirdInGaps: '새를 틈새에 유지하세요.',
      gameOver: '게임 오버',
      tapOrSpaceTryAgain: '탭하거나 스페이스바를 눌러 다시 시도하세요.',

      mdTitle: '메탄 드리프트',
      mdInstructions_1: '외계 메탄 하늘을 떠다니세요. ',
      mdInstructions_bold1: '스페이스 / 클릭',
      mdInstructions_2: '으로 위로 펄스. ',
      mdInstructions_bold2: 'Shift',
      mdInstructions_3: '를 눌러 충전 시 공생 활성화. ',
      mdInstructions_bold3: 'Escape',
      mdInstructions_4: '를 눌러 일시정지.',
      distance: '거리',
      atmosphere: '대기',
      symbiosis: '공생',
      combo: '콤보',
      soundOn: '소리: 켜짐',
      soundOff: '소리: 꺼짐',
      restartDrift: '드리프트 재시작',
      symbiosisBtn: '공생',

      buoyant: '부력',
      dense: '밀집',
      crushing: '압도',
      phasing: '위상 통과',
      symbiosisReady: '공생 준비',
      charging: '충전 중',
      ready: '준비',

      tutPulseTitle: '위로 펄스',
      tutPulseDesc: '스페이스바 또는 클릭으로 글라이더를 위로 밀어올리세요',
      tutAvoidTitle: '장애물 회피',
      tutAvoidDesc: '첨탑, 무리, 간헐천, 폭풍을 통과하세요',
      tutSymbTitle: '공생',
      tutSymbDesc: '충전 시 Shift를 눌러 장애물을 통과하세요',
      tutTapContinue: '탭하여 계속',

      methaneDriftLogo: '메탄 드리프트',
      spaceClickBegin: '스페이스 / 클릭으로 시작',
      paused: '일시정지',
      pressEscResume: 'Escape를 눌러 재개',
      signalLost: '신호 유실',
      newRecord: '새 기록!',
      dodged: '회피',
      nearMisses: '아슬아슬',
      time: '시간',
      tapOrSpaceRestart: '탭 또는 스페이스로 재시작',

      upperAtmosphere: '상층 대기',
      midTurbulence: '중간 난류',
      pressureLayer: '압력층',
      coreProximity: '코어 근접',
      unstableCore: '불안정한 코어',
      zone: '구역',

      achievement: '업적',
      achFirstDrift: '첫 번째 드리프트',
      achFirstDriftDesc: '1점 획득',
      achDeepDiver: '딥 다이버',
      achDeepDiverDesc: '25점 획득',
      achPressureVet: '압력 베테랑',
      achPressureVetDesc: '50점 획득',
      achCoreRunner: '코어 러너',
      achCoreRunnerDesc: '100점 획득',
      achSymbiont: '공생체',
      achSymbiontDesc: '공생 총 10회 사용',
      achUntouchable: '무적',
      achUntouchableDesc: '공생 없이 20점 획득',
      achDensityMaster: '밀도 마스터',
      achDensityMasterDesc: '한 판에서 압도 단계 5회 생존',
      achNearMissExpert: '아슬아슬 전문가',
      achNearMissExpertDesc: '한 판에서 아슬아슬 10회',
    },

    ja: {
      gameArcade: 'ゲームアーケード',
      pickAGame: 'ゲームを選んでプレイしよう',
      flappyBirdTitle: 'フラッピーバード',
      flappyBirdDesc: 'タップして羽ばたき、パイプの間を通り抜けよう。クラシックアーケードアクション！',
      casual: 'カジュアル',
      methaneDriftTitle: 'メタンドリフト',
      methaneDriftDesc: 'エイリアンのメタンの空を漂おう。障害物を避け、共生を発動して生き延びよう。',
      sciFi: 'SF',

      backToGames: '\u2190 ゲーム一覧へ',

      fbTitle: 'フラッピーバード',
      fbInstructions: 'スペースキーを押すかクリック/タップで羽ばたき。パイプを避けよう！',
      score: 'スコア',
      best: 'ベスト',
      restart: 'リスタート',
      fbTip: 'ヒント：一定のリズムで隙間を保とう。',
      tapToStart: 'タップして開始',
      keepBirdInGaps: '鳥を隙間に通そう。',
      gameOver: 'ゲームオーバー',
      tapOrSpaceTryAgain: 'タップまたはスペースキーで再挑戦。',

      mdTitle: 'メタンドリフト',
      mdInstructions_1: 'エイリアンのメタンの空を漂おう。',
      mdInstructions_bold1: 'スペース / クリック',
      mdInstructions_2: 'で上にパルス。',
      mdInstructions_bold2: 'Shift',
      mdInstructions_3: 'で充電時に共生発動。',
      mdInstructions_bold3: 'Escape',
      mdInstructions_4: 'で一時停止。',
      distance: '距離',
      atmosphere: '大気',
      symbiosis: '共生',
      combo: 'コンボ',
      soundOn: 'サウンド: オン',
      soundOff: 'サウンド: オフ',
      restartDrift: 'ドリフト再開',
      symbiosisBtn: '共生',

      buoyant: '浮力',
      dense: '高密度',
      crushing: '圧壊',
      phasing: 'フェーズ中',
      symbiosisReady: '共生準備完了',
      charging: '充電中',
      ready: '準備完了',

      tutPulseTitle: '上にパルス',
      tutPulseDesc: 'スペースキーまたはクリックでグライダーを上に押し上げよう',
      tutAvoidTitle: '障害物回避',
      tutAvoidDesc: '尖塔、群れ、間欠泉、嵐を切り抜けよう',
      tutSymbTitle: '共生',
      tutSymbDesc: '充電時にShiftを押して障害物を通り抜けよう',
      tutTapContinue: 'タップして続ける',

      methaneDriftLogo: 'メタンドリフト',
      spaceClickBegin: 'スペース / クリックで開始',
      paused: '一時停止',
      pressEscResume: 'Escapeキーで再開',
      signalLost: '信号喪失',
      newRecord: '新記録！',
      dodged: '回避',
      nearMisses: 'ニアミス',
      time: '時間',
      tapOrSpaceRestart: 'タップまたはスペースで再開',

      upperAtmosphere: '上層大気',
      midTurbulence: '中間乱流',
      pressureLayer: '圧力層',
      coreProximity: 'コア近接',
      unstableCore: '不安定コア',
      zone: 'ゾーン',

      achievement: '実績',
      achFirstDrift: 'ファーストドリフト',
      achFirstDriftDesc: '1ポイント獲得',
      achDeepDiver: 'ディープダイバー',
      achDeepDiverDesc: '25ポイント獲得',
      achPressureVet: 'プレッシャーベテラン',
      achPressureVetDesc: '50ポイント獲得',
      achCoreRunner: 'コアランナー',
      achCoreRunnerDesc: '100ポイント獲得',
      achSymbiont: 'シンビオント',
      achSymbiontDesc: '共生を合計10回使用',
      achUntouchable: 'アンタッチャブル',
      achUntouchableDesc: '共生なしで20ポイント獲得',
      achDensityMaster: '密度マスター',
      achDensityMasterDesc: '1回のプレイで圧壊フェーズを5回生存',
      achNearMissExpert: 'ニアミスエキスパート',
      achNearMissExpertDesc: '1回のプレイでニアミス10回',
    },

    tr: {
      gameArcade: 'Oyun Salonu',
      pickAGame: 'Bir oyun seç ve oynamaya başla',
      flappyBirdTitle: 'Flappy Bird',
      flappyBirdDesc: 'Kanat çırpmak için dokun ve boruların arasından geç. Klasik arcade aksiyonu!',
      casual: 'Gündelik',
      methaneDriftTitle: 'Metan Sürüklenmesi',
      methaneDriftDesc: 'Uzaylı metan gökyüzünde sürüklen. Tehlikelerden kaçın ve hayatta kalmak için simbiyozu etkinleştir.',
      sciFi: 'Bilim Kurgu',

      backToGames: '\u2190 Oyunlara Dön',

      fbTitle: 'Flappy Bird',
      fbInstructions: 'Kanat çırpmak için boşluk tuşuna bas veya tıkla/dokun. Borulardan kaçın!',
      score: 'Skor',
      best: 'En İyi',
      restart: 'Yeniden Başla',
      fbTip: 'İpucu: boşlukta kalmak için sabit bir ritim tutun.',
      tapToStart: 'Başlamak için dokun',
      keepBirdInGaps: 'Kuşu boşlukta tutun.',
      gameOver: 'Oyun Bitti',
      tapOrSpaceTryAgain: 'Tekrar denemek için dokun veya boşluk tuşuna bas.',

      mdTitle: 'Metan Sürüklenmesi',
      mdInstructions_1: 'Uzaylı metan gökyüzünde sürüklen. ',
      mdInstructions_bold1: 'Boşluk / Tıkla',
      mdInstructions_2: ' ile yukarı it. ',
      mdInstructions_bold2: 'Shift',
      mdInstructions_3: ' ile şarj olunca simbiyozu etkinleştir. ',
      mdInstructions_bold3: 'Escape',
      mdInstructions_4: ' ile duraklat.',
      distance: 'Mesafe',
      atmosphere: 'Atmosfer',
      symbiosis: 'Simbiyoz',
      combo: 'Kombo',
      soundOn: 'Ses: AÇIK',
      soundOff: 'Ses: KAPALI',
      restartDrift: 'Sürüklenmeyi Yeniden Başlat',
      symbiosisBtn: 'Simbiyoz',

      buoyant: 'Yüzer',
      dense: 'Yoğun',
      crushing: 'Ezici',
      phasing: 'Faz Geçişi',
      symbiosisReady: 'Simbiyoz Hazır',
      charging: 'Şarj Oluyor',
      ready: 'Hazır',

      tutPulseTitle: 'Yukarı İt',
      tutPulseDesc: 'Planörü yukarı itmek için Boşluk veya Tıkla',
      tutAvoidTitle: 'Tehlikelerden Kaçın',
      tutAvoidDesc: 'Sivri kayalar, sürüler, gayzerler ve fırtınalar arasından geçin',
      tutSymbTitle: 'Simbiyoz',
      tutSymbDesc: 'Şarj olunca Shift\'e basarak engellerin içinden geçin',
      tutTapContinue: 'Devam etmek için dokun',

      methaneDriftLogo: 'METAN SÜRÜKLENMESİ',
      spaceClickBegin: 'Başlamak için Boşluk / Tıkla',
      paused: 'Duraklatıldı',
      pressEscResume: 'Devam etmek için Escape\'e bas',
      signalLost: 'Sinyal Kayboldu',
      newRecord: 'YENİ REKOR',
      dodged: 'Kaçınılan',
      nearMisses: 'Kıl Payı',
      time: 'Süre',
      tapOrSpaceRestart: 'Yeniden başlatmak için dokun veya Boşluk\'a bas',

      upperAtmosphere: 'Üst Atmosfer',
      midTurbulence: 'Orta Türbülans',
      pressureLayer: 'Basınç Katmanı',
      coreProximity: 'Çekirdek Yakınlığı',
      unstableCore: 'Kararsız Çekirdek',
      zone: 'Bölge',

      achievement: 'Başarım',
      achFirstDrift: 'İlk Sürüklenme',
      achFirstDriftDesc: '1 puan kazan',
      achDeepDiver: 'Derin Dalıcı',
      achDeepDiverDesc: '25 puan kazan',
      achPressureVet: 'Basınç Gazisi',
      achPressureVetDesc: '50 puan kazan',
      achCoreRunner: 'Çekirdek Koşucusu',
      achCoreRunnerDesc: '100 puan kazan',
      achSymbiont: 'Simbiyont',
      achSymbiontDesc: 'Toplam 10 kez simbiyoz kullan',
      achUntouchable: 'Dokunulmaz',
      achUntouchableDesc: 'Simbiyoz kullanmadan 20 puan kazan',
      achDensityMaster: 'Yoğunluk Ustası',
      achDensityMasterDesc: 'Bir turda 5 Ezici fazdan sağ çık',
      achNearMissExpert: 'Kıl Payı Uzmanı',
      achNearMissExpertDesc: 'Bir turda 10 kıl payı',
    },

    fr: {
      gameArcade: 'Salle d\'Arcade',
      pickAGame: 'Choisis un jeu et commence à jouer',
      flappyBirdTitle: 'Flappy Bird',
      flappyBirdDesc: 'Tape pour voler et navigue entre les tuyaux. Action arcade classique !',
      casual: 'Casual',
      methaneDriftTitle: 'Dérive Méthane',
      methaneDriftDesc: 'Dérive dans un ciel de méthane alien. Esquive les dangers et active la symbiose pour survivre.',
      sciFi: 'Sci-Fi',

      backToGames: '\u2190 Retour aux jeux',

      fbTitle: 'Flappy Bird',
      fbInstructions: 'Appuie sur espace ou clique/tape pour voler. Évite les tuyaux !',
      score: 'Score',
      best: 'Meilleur',
      restart: 'Recommencer',
      fbTip: 'Astuce : garde un rythme régulier pour rester dans l\'espace.',
      tapToStart: 'Tape pour commencer',
      keepBirdInGaps: 'Garde l\'oiseau dans les espaces.',
      gameOver: 'Partie Terminée',
      tapOrSpaceTryAgain: 'Tape ou appuie sur espace pour réessayer.',

      mdTitle: 'Dérive Méthane',
      mdInstructions_1: 'Dérive dans un ciel de méthane alien. Tape ',
      mdInstructions_bold1: 'Espace / Clic',
      mdInstructions_2: ' pour pulser vers le haut. Appuie sur ',
      mdInstructions_bold2: 'Shift',
      mdInstructions_3: ' pour activer la symbiose quand chargé. Appuie sur ',
      mdInstructions_bold3: 'Échap',
      mdInstructions_4: ' pour pause.',
      distance: 'Distance',
      atmosphere: 'Atmosphère',
      symbiosis: 'Symbiose',
      combo: 'Combo',
      soundOn: 'Son : ON',
      soundOff: 'Son : OFF',
      restartDrift: 'Relancer la Dérive',
      symbiosisBtn: 'Symbiose',

      buoyant: 'Flottant',
      dense: 'Dense',
      crushing: 'Écrasant',
      phasing: 'Déphasage',
      symbiosisReady: 'Symbiose Prête',
      charging: 'En charge',
      ready: 'Prêt',

      tutPulseTitle: 'Pulser vers le haut',
      tutPulseDesc: 'Appuie sur Espace ou Clique pour pulser le planeur vers le haut',
      tutAvoidTitle: 'Éviter les dangers',
      tutAvoidDesc: 'Navigue entre les flèches, bancs, geysers et tempêtes',
      tutSymbTitle: 'Symbiose',
      tutSymbDesc: 'Appuie sur Shift quand chargé pour traverser les obstacles',
      tutTapContinue: 'Tape pour continuer',

      methaneDriftLogo: 'DÉRIVE MÉTHANE',
      spaceClickBegin: 'Espace / Clic pour commencer',
      paused: 'Pause',
      pressEscResume: 'Appuie sur Échap pour reprendre',
      signalLost: 'Signal Perdu',
      newRecord: 'NOUVEAU RECORD',
      dodged: 'Esquivés',
      nearMisses: 'Frôlements',
      time: 'Temps',
      tapOrSpaceRestart: 'Tape ou appuie sur Espace pour recommencer',

      upperAtmosphere: 'Haute Atmosphère',
      midTurbulence: 'Turbulence Moyenne',
      pressureLayer: 'Couche de Pression',
      coreProximity: 'Proximité du Noyau',
      unstableCore: 'Noyau Instable',
      zone: 'Zone',

      achievement: 'Succès',
      achFirstDrift: 'Première Dérive',
      achFirstDriftDesc: 'Marquer 1 point',
      achDeepDiver: 'Plongeur des Profondeurs',
      achDeepDiverDesc: 'Marquer 25 points',
      achPressureVet: 'Vétéran de la Pression',
      achPressureVetDesc: 'Marquer 50 points',
      achCoreRunner: 'Coureur du Noyau',
      achCoreRunnerDesc: 'Marquer 100 points',
      achSymbiont: 'Symbiote',
      achSymbiontDesc: 'Utiliser la symbiose 10 fois au total',
      achUntouchable: 'Intouchable',
      achUntouchableDesc: 'Marquer 20 sans symbiose',
      achDensityMaster: 'Maître de la Densité',
      achDensityMasterDesc: 'Survivre à 5 phases Écrasantes en une partie',
      achNearMissExpert: 'Expert en Frôlements',
      achNearMissExpertDesc: '10 frôlements en une partie',
    },

    sv: {
      gameArcade: 'Spelarkad',
      pickAGame: 'Välj ett spel och börja spela',
      flappyBirdTitle: 'Flappy Bird',
      flappyBirdDesc: 'Tryck för att flaxa och navigera genom rören. Klassisk arkadaction!',
      casual: 'Avslappnad',
      methaneDriftTitle: 'Metandrift',
      methaneDriftDesc: 'Glid genom en utomjordisk metanhimmel. Undvik faror och aktivera symbios för att överleva.',
      sciFi: 'Sci-Fi',

      backToGames: '\u2190 Tillbaka till spel',

      fbTitle: 'Flappy Bird',
      fbInstructions: 'Tryck mellanslag eller klicka/tryck för att flaxa. Undvik rören!',
      score: 'Poäng',
      best: 'Bäst',
      restart: 'Omstart',
      fbTip: 'Tips: håll en jämn rytm för att stanna i luckorna.',
      tapToStart: 'Tryck för att starta',
      keepBirdInGaps: 'Håll fågeln i luckorna.',
      gameOver: 'Spelet Slut',
      tapOrSpaceTryAgain: 'Tryck eller mellanslag för att försöka igen.',

      mdTitle: 'Metandrift',
      mdInstructions_1: 'Glid genom en utomjordisk metanhimmel. Tryck ',
      mdInstructions_bold1: 'Mellanslag / Klicka',
      mdInstructions_2: ' för att pulsa uppåt. Tryck ',
      mdInstructions_bold2: 'Shift',
      mdInstructions_3: ' för att aktivera symbios vid laddning. Tryck ',
      mdInstructions_bold3: 'Escape',
      mdInstructions_4: ' för att pausa.',
      distance: 'Distans',
      atmosphere: 'Atmosfär',
      symbiosis: 'Symbios',
      combo: 'Kombo',
      soundOn: 'Ljud: PÅ',
      soundOff: 'Ljud: AV',
      restartDrift: 'Starta om Driften',
      symbiosisBtn: 'Symbios',

      buoyant: 'Flytande',
      dense: 'Tät',
      crushing: 'Krossande',
      phasing: 'Fasövergång',
      symbiosisReady: 'Symbios Redo',
      charging: 'Laddar',
      ready: 'Redo',

      tutPulseTitle: 'Pulsa Uppåt',
      tutPulseDesc: 'Tryck Mellanslag eller Klicka för att pulsa glidaren uppåt',
      tutAvoidTitle: 'Undvik Faror',
      tutAvoidDesc: 'Navigera genom spiror, stim, gejsrar och stormar',
      tutSymbTitle: 'Symbios',
      tutSymbDesc: 'Tryck Shift vid laddning för att fasa genom hinder',
      tutTapContinue: 'Tryck för att fortsätta',

      methaneDriftLogo: 'METANDRIFT',
      spaceClickBegin: 'Mellanslag / Klicka för att börja',
      paused: 'Pausad',
      pressEscResume: 'Tryck Escape för att återuppta',
      signalLost: 'Signal Förlorad',
      newRecord: 'NYTT REKORD',
      dodged: 'Undvikna',
      nearMisses: 'Nära ögat',
      time: 'Tid',
      tapOrSpaceRestart: 'Tryck eller Mellanslag för att starta om',

      upperAtmosphere: 'Övre Atmosfären',
      midTurbulence: 'Mellanturbulens',
      pressureLayer: 'Trycklager',
      coreProximity: 'Kärnnärhet',
      unstableCore: 'Instabil Kärna',
      zone: 'Zon',

      achievement: 'Prestation',
      achFirstDrift: 'Första Driften',
      achFirstDriftDesc: 'Få 1 poäng',
      achDeepDiver: 'Djupdykare',
      achDeepDiverDesc: 'Få 25 poäng',
      achPressureVet: 'Tryckväteran',
      achPressureVetDesc: 'Få 50 poäng',
      achCoreRunner: 'Kärnlöpare',
      achCoreRunnerDesc: 'Få 100 poäng',
      achSymbiont: 'Symbiont',
      achSymbiontDesc: 'Använd symbios 10 gånger totalt',
      achUntouchable: 'Orörd',
      achUntouchableDesc: 'Få 20 utan symbios',
      achDensityMaster: 'Densitetsmästare',
      achDensityMasterDesc: 'Överlev 5 Krossande faser på en runda',
      achNearMissExpert: 'Nära Ögat-expert',
      achNearMissExpertDesc: '10 nära ögat på en runda',
    },

    zh: {
      gameArcade: '游戏厅',
      pickAGame: '选择一个游戏开始玩',
      flappyBirdTitle: '像素鸟',
      flappyBirdDesc: '点击飞翔，穿越管道。经典街机动作！',
      casual: '休闲',
      methaneDriftTitle: '甲烷漂流',
      methaneDriftDesc: '在外星甲烷天空中漂流。躲避危险并激活共生以求生存。',
      sciFi: '科幻',

      backToGames: '\u2190 返回游戏',

      fbTitle: '像素鸟',
      fbInstructions: '按空格键或点击/触摸来飞翔。避开管道！',
      score: '分数',
      best: '最佳',
      restart: '重新开始',
      fbTip: '提示：保持稳定节奏以待在缝隙中。',
      tapToStart: '点击开始',
      keepBirdInGaps: '让小鸟保持在缝隙中。',
      gameOver: '游戏结束',
      tapOrSpaceTryAgain: '点击或按空格键重试。',

      mdTitle: '甲烷漂流',
      mdInstructions_1: '在外星甲烷天空中漂流。按',
      mdInstructions_bold1: '空格 / 点击',
      mdInstructions_2: '向上脉冲。按',
      mdInstructions_bold2: 'Shift',
      mdInstructions_3: '在充能时触发共生。按',
      mdInstructions_bold3: 'Escape',
      mdInstructions_4: '暂停。',
      distance: '距离',
      atmosphere: '大气',
      symbiosis: '共生',
      combo: '连击',
      soundOn: '声音：开',
      soundOff: '声音：关',
      restartDrift: '重新漂流',
      symbiosisBtn: '共生',

      buoyant: '浮力',
      dense: '密集',
      crushing: '碾压',
      phasing: '相位中',
      symbiosisReady: '共生就绪',
      charging: '充能中',
      ready: '就绪',

      tutPulseTitle: '向上脉冲',
      tutPulseDesc: '按空格键或点击将滑翔器向上推',
      tutAvoidTitle: '躲避危险',
      tutAvoidDesc: '穿越尖塔、鱼群、间歇泉和风暴',
      tutSymbTitle: '共生',
      tutSymbDesc: '充能时按Shift穿越障碍物',
      tutTapContinue: '点击继续',

      methaneDriftLogo: '甲烷漂流',
      spaceClickBegin: '空格 / 点击开始',
      paused: '已暂停',
      pressEscResume: '按Escape继续',
      signalLost: '信号丢失',
      newRecord: '新纪录！',
      dodged: '闪避',
      nearMisses: '擦身而过',
      time: '时间',
      tapOrSpaceRestart: '点击或按空格键重新开始',

      upperAtmosphere: '高层大气',
      midTurbulence: '中层湍流',
      pressureLayer: '压力层',
      coreProximity: '核心临近',
      unstableCore: '不稳定核心',
      zone: '区域',

      achievement: '成就',
      achFirstDrift: '初次漂流',
      achFirstDriftDesc: '得1分',
      achDeepDiver: '深潜者',
      achDeepDiverDesc: '得25分',
      achPressureVet: '压力老兵',
      achPressureVetDesc: '得50分',
      achCoreRunner: '核心奔跑者',
      achCoreRunnerDesc: '得100分',
      achSymbiont: '共生体',
      achSymbiontDesc: '共计使用共生10次',
      achUntouchable: '不可触碰',
      achUntouchableDesc: '不使用共生得20分',
      achDensityMaster: '密度大师',
      achDensityMasterDesc: '在一局中存活5次碾压阶段',
      achNearMissExpert: '擦身而过专家',
      achNearMissExpertDesc: '一局中擦身而过10次',
    },
  };

  const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'fr', label: 'Français' },
    { code: 'sv', label: 'Svenska' },
    { code: 'zh', label: '中文' },
  ];

  const STORAGE_KEY = 'arcadeLanguage';

  let currentLang = 'en';

  function load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && translations[stored]) {
        currentLang = stored;
      }
    } catch (e) { /* localStorage unavailable */ }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, currentLang);
    } catch (e) { /* */ }
  }

  function getLang() {
    return currentLang;
  }

  function setLang(code) {
    if (translations[code]) {
      currentLang = code;
      save();
      applyDOM();
      document.documentElement.lang = code === 'zh' ? 'zh-CN' : code;
    }
  }

  /** Get a translated string by key */
  function t(key) {
    const dict = translations[currentLang] || translations.en;
    return dict[key] !== undefined ? dict[key] : (translations.en[key] || key);
  }

  /** Apply translations to all DOM elements with data-i18n attributes */
  function applyDOM() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      if (key === 'mdInstructions') {
        el.innerHTML =
          t('mdInstructions_1') +
          '<strong>' + t('mdInstructions_bold1') + '</strong>' +
          t('mdInstructions_2') +
          '<strong>' + t('mdInstructions_bold2') + '</strong>' +
          t('mdInstructions_3') +
          '<strong>' + t('mdInstructions_bold3') + '</strong>' +
          t('mdInstructions_4');
      }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      el.setAttribute('aria-label', t(key));
    });
    // Update language selector display
    const sel = document.getElementById('langSelect');
    if (sel) sel.value = currentLang;
  }

  /** Inject the language selector UI into the page */
  function createSelector(container) {
    if (!container) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'lang-switcher';

    const select = document.createElement('select');
    select.id = 'langSelect';
    select.setAttribute('aria-label', 'Language');

    for (const lang of LANGUAGES) {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = lang.label;
      if (lang.code === currentLang) opt.selected = true;
      select.appendChild(opt);
    }

    select.addEventListener('change', () => {
      setLang(select.value);
      // Fire custom event so game scripts can react
      window.dispatchEvent(new CustomEvent('langchange', { detail: { lang: select.value } }));
    });

    wrapper.appendChild(select);
    container.insertBefore(wrapper, container.firstChild);
  }

  // Initialize
  load();

  return { t, getLang, setLang, applyDOM, createSelector, LANGUAGES };
})();
