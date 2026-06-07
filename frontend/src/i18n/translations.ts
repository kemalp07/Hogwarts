export type Language = 'tr' | 'en';

export const translations = {
  tr: {
    // Onboarding
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
    // CharacterCreation
    createCharacter: 'Karakter Oluştur',
    characterName: 'Karakter Adı',
    continue: 'Devam',
    back: 'Geri',
    // Chat
    inputPlaceholder: 'Bir şey yaz...',
    typing: 'yazıyor...',
  },
  en: {
    // Onboarding
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
    // CharacterCreation
    createCharacter: 'Create Character',
    characterName: 'Character Name',
    continue: 'Continue',
    back: 'Back',
    // Chat
    inputPlaceholder: 'Write something...',
    typing: 'typing...',
  },
} as const;

export function t(lang: Language, key: keyof typeof translations['tr'], ...args: any[]): string {
  const val = (translations[lang] as any)[key];
  if (typeof val === 'function') return val(...args);
  return val ?? key;
}
