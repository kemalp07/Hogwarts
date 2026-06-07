// Parses a SillyTavern chara_card_v2 JSON and builds the system prompt
import characterCardData from '../data/wizarding-world-spec_v2.json';

type CharacterCardData = {
  data?: {
    system_prompt?: string;
    description?: string;
    scenario?: string;
    post_history_instructions?: string;
    first_mes?: string;
    alternate_greetings?: string[];
  };
};

const card = characterCardData as CharacterCardData;

const SORTING_HAT_SCENE_TR = `[SORTING_HAT] Hogwarts Ekspresi bugün ilk kez yolculuk yapıyor — en azından senin için. 1991 yılı, Eylül'ün ilk günü. Tren İskoçya'nın sisli dağlarında ilerlerken pencereden uzaklara bakıyorsun. Bugün her şey değişecek.

Saatler sonra dev meşe kapılardan içeri adım atıyorsun. Büyük Salon'un büyülü tavanında yıldızlar parlıyor, yüzlerce mum havada asılı duruyor. Diğer birinci sınıf öğrencileriyle birlikte uzun masaların önünde sıralanıyorsunuz.

Profesör McGonagall elinde eski, yıpranmış bir şapkayla öne çıkıyor.

Hangi ev seni çağırıyor?`;

const SORTING_HAT_SCENE_EN = `[SORTING_HAT] The Hogwarts Express is making its journey for the first time today — at least for you. It is September 1991. As the train moves through Scotland's misty mountains, you stare out the window. Everything will change today.

Hours later, you step through the great oak doors. Stars glitter across the enchanted ceiling of the Great Hall, and hundreds of candles float in the air. You line up with the other first-years before the long tables.

Professor McGonagall steps forward holding an old, worn hat.

Which house is calling you?`;

const FIRST_MES_EN =
  "*The Great Hall's massive doors swing open; hundreds of candles flicker in mid-air while whispers echo across the stone floor.*\n\nWelcome, {{user}}. Your first evening at Hogwarts is beginning. In this hall of hats, houses, and secrets, your story starts now.";

function hasSortingHatScene(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('sorting hat') ||
    lower.includes('sıralama şapkası') ||
    lower.includes('sorting şapkası')
  );
}

function replaceUserPlaceholders(input: string, userName: string): string {
  return (input || '').replace(/\{\{user\}\}/g, userName);
}

export function buildSystemPrompt(userName: string): string {
  const data = card.data || {};

  const combined = [
    data.system_prompt || '',
    data.description || '',
    data.scenario || '',
  ]
    .join('\n\n')
    .trim();

  return replaceUserPlaceholders(combined, userName);
}

export function getFirstMessage(greetingIndex: number = 0, language: string = 'tr'): string {
  const data = card.data || {};
  const alternates = Array.isArray(data.alternate_greetings) ? data.alternate_greetings : [];
  const sortingHatScene = language === 'en' ? SORTING_HAT_SCENE_EN : SORTING_HAT_SCENE_TR;

  const firstMes = language === 'en' ? FIRST_MES_EN : (data.first_mes || '');

  const selected =
    greetingIndex === 0
      ? firstMes
      : alternates[greetingIndex - 1] || '';

  if (greetingIndex === 0 && !hasSortingHatScene(selected)) {
    return selected.trim() ? `${sortingHatScene}\n\n${selected}` : sortingHatScene;
  }

  return selected;
}

export function getAlternateGreetings(): string[] {
  const data = card.data || {};
  return Array.isArray(data.alternate_greetings) ? data.alternate_greetings : [];
}
