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

const SORTING_HAT_SCENE = `Büyük Salon, sen öne adım atarken sessizleşir.
Profesör McGonagall kadim Sıralama Şapkası'nı başına koyar...
"Hmm," diye mırıldanır Şapka kulağında. "Cesaret görüyorum, zeka ve sadakat...
Ama seni nereye koymalıyım?"
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
