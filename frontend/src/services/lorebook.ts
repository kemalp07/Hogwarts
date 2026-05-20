// Keyword-based world info injection from a SillyTavern lorebook JSON
import worldInfoData from '../data/wizarding-world-book-world_info.json';

type LoreEntry = {
  key?: string[];
  content?: string;
  enabled?: boolean;
  constant?: boolean;
  probability?: number;
  depth?: number;
};

type Lorebook = {
  scan_depth?: number;
  entries?: Record<string, LoreEntry>;
};

const lorebook = worldInfoData as Lorebook;
const DEFAULT_SCAN_DEPTH = 5;
const MAX_LORE_CHARS = 8000;

function shouldIncludeByProbability(probability: number | undefined): boolean {
  const p = typeof probability === 'number' ? probability : 100;
  return Math.random() * 100 < p;
}

export function getRelevantLore(recentMessages: string[]): string {
  const scanDepth = lorebook.scan_depth ?? DEFAULT_SCAN_DEPTH;
  const entries = lorebook.entries || {};

  const scannedText = recentMessages
    .slice(-scanDepth)
    .join(' ')
    .toLowerCase();

  const matched: string[] = [];
  let currentLen = 0;

  for (const entry of Object.values(entries)) {
    if (!entry?.enabled) {
      continue;
    }

    const content = (entry.content || '').trim();
    if (!content) {
      continue;
    }

    const includeConstant = entry.constant === true;

    let includeByKeyword = false;
    if (!includeConstant) {
      const keys = Array.isArray(entry.key) ? entry.key : [];
      includeByKeyword = keys.some((k) => scannedText.includes(String(k).toLowerCase()));
    }

    const isMatched = includeConstant || includeByKeyword;
    if (!isMatched) {
      continue;
    }

    if (!shouldIncludeByProbability(entry.probability)) {
      continue;
    }

    const separatorLen = matched.length > 0 ? 2 : 0; // for "\n\n"
    if (currentLen + separatorLen + content.length > MAX_LORE_CHARS) {
      break;
    }

    matched.push(content);
    currentLen += separatorLen + content.length;
  }

  return matched.join('\n\n');
}
