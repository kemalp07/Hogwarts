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

const SORTING_HAT_SCENE = `Hogwarts Ekspresi bugün ilk kez yolculuk yapıyor — en azından senin için. 1991 yılı, Eylül'ün ilk günü. Tren İskoçya'nın sisli dağlarında ilerlerken pencereden uzaklara bakıyorsun. Bugün her şey değişecek.

Saatler sonra dev meşe kapılardan içeri adım atıyorsun. Büyük Salon'un büyülü tavanında yıldızlar parlıyor, yüzlerce mum havada asılı duruyor. Diğer birinci sınıf öğrencileriyle birlikte uzun masaların önünde sıralanıyorsunuz.

Profesör McGonagall elinde eski, yıpranmış bir şapkayla öne çıkıyor.

Hangi ev seni çağırıyor?`;

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

export function getFirstMessage(greetingIndex: number = 0): string {
  const data = card.data || {};
  const alternates = Array.isArray(data.alternate_greetings) ? data.alternate_greetings : [];

  const selected =
    greetingIndex === 0
      ? data.first_mes || ''
      : alternates[greetingIndex - 1] || '';

  if (greetingIndex === 0 && !hasSortingHatScene(selected)) {
    return selected.trim() ? `${SORTING_HAT_SCENE}\n\n${selected}` : SORTING_HAT_SCENE;
  }

  return selected;
}

export function getAlternateGreetings(): string[] {
  const data = card.data || {};
  return Array.isArray(data.alternate_greetings) ? data.alternate_greetings : [];
}
