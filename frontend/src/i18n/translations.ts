export type Language = 'tr' | 'en';

export type OptionKey =
  | 'genders'
  | 'attractions'
  | 'traits'
  | 'origins'
  | 'heights'
  | 'hairColors'
  | 'fears'
  | 'hobbies'
  | 'secretTraits'
  | 'wandWoods'
  | 'wandCores'
  | 'wandLengths'
  | 'wandFlexibilities';

const OPTION_SETS: Record<Language, Record<OptionKey, readonly string[]>> = {
  tr: {
    genders: ['Erkek', 'Kadın', 'Belirtmiyorum'],
    attractions: ['Kadınlar', 'Erkekler', 'Her ikisi'],
    traits: ['Cesur', 'Zeki', 'Sadık', 'Gizemli', 'Hırslı', 'Merhametli', 'Yaratıcı', 'Kararlı'],
    origins: ['Muggle ailesi', 'Büyücü ailesi', 'Yarı kan'],
    heights: ['Kısa', 'Orta boy', 'Uzun'],
    hairColors: ['Siyah', 'Kahverengi', 'Sarı', 'Kızıl', 'Beyaz'],
    fears: ['Karanlık', 'Yükseklik', 'Yalnızlık', 'Başarısızlık', 'Ölüm'],
    hobbies: ['Quidditch', 'Kitap okuma', 'Büyü araştırma', 'Müzik', 'Doğa'],
    secretTraits: [
      'Aslında çok kırılgansın',
      'Derin bir sırrın var',
      'Geçmişinde karanlık bir olay var',
      'Gizli bir yeteneğin var',
      'Biri seni takip ediyor',
    ],
    wandWoods: ['Akasya', 'Meşe', 'Çam', 'Karaağaç', 'Söğüt', 'Gürgen', 'Kiraz', 'Kayın'],
    wandCores: ['Ejderha teli', 'Anka tüyü', 'Tek boynuzlu at kılı'],
    wandLengths: ['9 inç', '10 inç', '11 inç', '12 inç', '13 inç'],
    wandFlexibilities: ['Katı', 'Orta', 'Esnek'],
  },
  en: {
    genders: ['Male', 'Female', 'Prefer not to say'],
    attractions: ['Women', 'Men', 'Both'],
    traits: ['Brave', 'Clever', 'Loyal', 'Mysterious', 'Ambitious', 'Compassionate', 'Creative', 'Determined'],
    origins: ['Muggle family', 'Wizarding family', 'Half-blood'],
    heights: ['Short', 'Average', 'Tall'],
    hairColors: ['Black', 'Brown', 'Blonde', 'Red', 'White'],
    fears: ['Darkness', 'Heights', 'Loneliness', 'Failure', 'Death'],
    hobbies: ['Quidditch', 'Reading', 'Spell research', 'Music', 'Nature'],
    secretTraits: [
      'You are more fragile than you let on',
      'You carry a deep secret',
      'Something dark happened in your past',
      'You have a hidden talent',
      'Someone is watching you',
    ],
    wandWoods: ['Acacia', 'Oak', 'Pine', 'Walnut', 'Willow', 'Birch', 'Cherry', 'Beech'],
    wandCores: ['Dragon heartstring', 'Phoenix feather', 'Unicorn hair'],
    wandLengths: ['9 in', '10 in', '11 in', '12 in', '13 in'],
    wandFlexibilities: ['Rigid', 'Moderate', 'Supple'],
  },
};

export const translations = {
  tr: {
    welcome: "Hogwarts'a Hoş Geldin",
    noCharacter: 'Henüz karakterin yok',
    newCharacter: 'Yeni Karakter Oluştur',
    addCharacter: '+ Yeni Karakter',
    houseNotSelected: 'Ev seçilmedi',
    deleteCharacter: 'Karakteri Sil',
    deleteConfirm: (name: string) => `"${name}" ve tüm sohbet geçmişi silinecek. Emin misin?`,
    cancel: 'İptal',
    delete: 'Sil',
    selectLanguage: 'Dil Seç',
    createCharacter: 'Karakter Oluştur',
    createCharacterTitle: 'Karakterini Oluştur',
    characterName: 'Karakter Adı',
    continue: 'Devam',
    back: 'Geri',
    next: 'İleri',
    proceedToWand: 'Asana Geç',
    namePlaceholder: 'Adını gir...',
    stepName: 'Adın ne?',
    stepGender: 'Cinsiyetin?',
    stepTraits: 'Kişiliğini tanımla (2 seç)',
    stepOrigin: 'Kökenin?',
    stepHeight: 'Boyun?',
    stepHairColor: 'Saç rengin?',
    stepFear: 'En büyük korkun?',
    stepHobby: 'Hobilerin neler?',
    stepSecretTrait: 'Gizli bir özelliğin var...',
    stepAttraction: 'Kime ilgi duyarsın?',
    stepSummary: 'İşte sen!',
    wandQuote: '"Asa sahibini seçer..."',
    wandQuoteAuthor: '— Garrick Ollivander',
    stepWandWood: 'Asanın ağacı...',
    stepWandCore: 'Asanın özü...',
    stepWandLength: 'Asanın uzunluğu...',
    stepWandFlexibility: 'Asanın esnekliği...',
    startHogwarts: "Hogwarts'a Başla",
    wandDescription: (wood: string, core: string, length: string, flexibility: string) =>
      `${wood} asası, ${core}, ${length}, ${flexibility}`,
    inputPlaceholder: 'Bir şey yaz...',
    inputPlaceholderWeb: 'Mesaj yaz... (devam et = hikaye ilerler)',
    typing: 'yazıyor...',
    narratorSubtitle: 'Büyücü Dünyası',
    emptyStateSubtitle: 'Sana nasıl yardımcı olabilirim?',
    errorMessage: 'Bir şeyler ters gitti, tekrar dener misin?',
    edit: 'Düzenle',
    save: 'Kaydet',
    narratorLabel: 'Anlatıcı',
    sortingHatLabel: 'Seçmen Şapka',
    weekLabel: (week: number) => `${week}. Hafta`,
    scheduleTitle: (day: string) => `${day} Programı`,
    scheduleTime: (hour: string) => `Saat ${hour}:00`,
    noClassesToday: 'Bugün ders yok — serbest zaman',
    freeTime: '✨ Serbest',
    tomorrow: (day: string) => `Yarın — ${day}`,
    noClassesTomorrow: 'Yarın ders yok',
    missPenalty: (points: number) => `kaçırırsan -${points} puan`,
    close: 'Kapat',
    aiErrorFallback: '⏳ Hogwarts büyüleri yüklenirken bir aksaklık yaşandı. Lütfen tekrar dene...',
  },
  en: {
    welcome: 'Welcome to Hogwarts',
    noCharacter: 'No characters yet',
    newCharacter: 'Create New Character',
    addCharacter: '+ New Character',
    houseNotSelected: 'No house selected',
    deleteCharacter: 'Delete Character',
    deleteConfirm: (name: string) => `"${name}" and all chat history will be deleted. Are you sure?`,
    cancel: 'Cancel',
    delete: 'Delete',
    selectLanguage: 'Select Language',
    createCharacter: 'Create Character',
    createCharacterTitle: 'Create Your Character',
    characterName: 'Character Name',
    continue: 'Continue',
    back: 'Back',
    next: 'Next',
    proceedToWand: 'Choose Your Wand',
    namePlaceholder: 'Enter your name...',
    stepName: 'What is your name?',
    stepGender: 'Your gender?',
    stepTraits: 'Define your personality (pick 2)',
    stepOrigin: 'Your background?',
    stepHeight: 'Your height?',
    stepHairColor: 'Your hair color?',
    stepFear: 'Your greatest fear?',
    stepHobby: 'Your hobbies?',
    stepSecretTrait: 'You have a secret trait...',
    stepAttraction: 'Who are you attracted to?',
    stepSummary: 'Here you are!',
    wandQuote: '"The wand chooses the wizard..."',
    wandQuoteAuthor: '— Garrick Ollivander',
    stepWandWood: 'Your wand wood...',
    stepWandCore: 'Your wand core...',
    stepWandLength: 'Your wand length...',
    stepWandFlexibility: 'Your wand flexibility...',
    startHogwarts: 'Begin at Hogwarts',
    wandDescription: (wood: string, core: string, length: string, flexibility: string) =>
      `${wood} wand, ${core}, ${length}, ${flexibility}`,
    inputPlaceholder: 'Write something...',
    inputPlaceholderWeb: 'Write a message... (type "continue" to progress the story)',
    typing: 'typing...',
    narratorSubtitle: 'Wizarding World',
    emptyStateSubtitle: 'How can I help you?',
    errorMessage: 'Something went wrong. Would you like to try again?',
    edit: 'Edit',
    save: 'Save',
    narratorLabel: 'Narrator',
    sortingHatLabel: 'Sorting Hat',
    weekLabel: (week: number) => `Week ${week}`,
    scheduleTitle: (day: string) => `${day} Schedule`,
    scheduleTime: (hour: string) => `Hour ${hour}:00`,
    noClassesToday: 'No classes today — free time',
    freeTime: '✨ Free time',
    tomorrow: (day: string) => `Tomorrow — ${day}`,
    noClassesTomorrow: 'No classes tomorrow',
    missPenalty: (points: number) => `miss it = -${points} points`,
    close: 'Close',
    aiErrorFallback: '⏳ A hiccup occurred while loading Hogwarts magic. Please try again...',
  },
} as const;

export type TranslationKey = keyof typeof translations['tr'];

export function t(lang: Language, key: TranslationKey, ...args: any[]): string {
  const val = (translations[lang] as any)[key];
  if (typeof val === 'function') return val(...args);
  return val ?? key;
}

export function getOptions(lang: Language, key: OptionKey): readonly string[] {
  return OPTION_SETS[lang][key];
}

export function getInputTips(lang: Language): string[] {
  if (lang === 'en') {
    return [
      '💬 Use quotes for dialogue: look at "Hermione"',
      '⚡ Use asterisks for actions: *looks around*',
      '🧙 Call a character: ask Snape a question',
      '📖 Direct the scene: I want to go to the library',
      '🔮 Express emotion: I feel a little uneasy',
      '📖 Type "continue" to progress the story',
    ];
  }
  return [
    '💬 Karakter konuşturmak için tırnak kullan: "Hermione\'ye bak"',
    '⚡ Eylem için yıldız kullan: *çevreye bakınır*',
    '🧙 Bir karakteri çağır: Snape\'e bir soru sor',
    '📖 Sahneyi yönlendir: Kütüphaneye gitmek istiyorum',
    '🔮 Duygu belirt: Biraz tedirgin hissediyorum',
    '📖 Hikayeye devam etmek için sadece "devam et" yaz',
  ];
}

export function getTagNames(lang: Language): Record<string, string> {
  return {
    NARRATOR: t(lang, 'narratorLabel'),
    SORTING_HAT: t(lang, 'sortingHatLabel'),
    HARRY: 'Harry Potter',
    HERMIONE: 'Hermione Granger',
    RON: 'Ron Weasley',
    SNAPE: 'Severus Snape',
    DUMBLEDORE: 'Albus Dumbledore',
    DRACO: 'Draco Malfoy',
    HAGRID: 'Rubeus Hagrid',
    MCGONAGALL: 'Prof. McGonagall',
    UMBRIDGE: 'Dolores Umbridge',
    VOLDEMORT: 'Lord Voldemort',
  };
}

const STEP_TITLE_KEYS: Record<string, TranslationKey> = {
  name: 'stepName',
  gender: 'stepGender',
  traits: 'stepTraits',
  origin: 'stepOrigin',
  height: 'stepHeight',
  hairColor: 'stepHairColor',
  fear: 'stepFear',
  hobby: 'stepHobby',
  secretTrait: 'stepSecretTrait',
  attraction: 'stepAttraction',
  summary: 'stepSummary',
};

const WAND_STEP_TITLE_KEYS: Record<string, TranslationKey> = {
  wood: 'stepWandWood',
  core: 'stepWandCore',
  length: 'stepWandLength',
  flexibility: 'stepWandFlexibility',
};

const STEP_OPTION_KEYS: Record<string, OptionKey> = {
  gender: 'genders',
  traits: 'traits',
  origin: 'origins',
  height: 'heights',
  hairColor: 'hairColors',
  fear: 'fears',
  hobby: 'hobbies',
  secretTrait: 'secretTraits',
  attraction: 'attractions',
};

const WAND_OPTION_KEYS: Record<string, OptionKey> = {
  wood: 'wandWoods',
  core: 'wandCores',
  length: 'wandLengths',
  flexibility: 'wandFlexibilities',
};

export function getStepTitle(lang: Language, step: string): string {
  const key = STEP_TITLE_KEYS[step];
  return key ? t(lang, key) : step;
}

export function getWandStepTitle(lang: Language, step: string): string {
  const key = WAND_STEP_TITLE_KEYS[step];
  return key ? t(lang, key) : step;
}

export function getStepOptions(lang: Language, step: string): readonly string[] {
  const key = STEP_OPTION_KEYS[step];
  return key ? getOptions(lang, key) : [];
}

export function getWandStepOptions(lang: Language, step: string): readonly string[] {
  const key = WAND_OPTION_KEYS[step];
  return key ? getOptions(lang, key) : [];
}
