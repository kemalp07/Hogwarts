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
const MAX_LORE_CHARS = 3000;
const MAX_CONSTANT_CHARS = 500;

function shouldIncludeByProbability(probability: number | undefined): boolean {
  const p = typeof probability === 'number' ? probability : 100;
  return Math.random() * 100 < p;
}

function matchesKeywords(entry: LoreEntry, scannedText: string): boolean {
  const keys = Array.isArray(entry.key) ? entry.key : [];
  return keys.some((k) => scannedText.includes(String(k).toLowerCase()));
}

function getEntryContent(entry: LoreEntry, isConstant: boolean): string {
  const content = (entry.content || '').trim();
  if (!content) {
    return '';
  }

  if (isConstant) {
    return content.slice(0, MAX_CONSTANT_CHARS);
  }

  return content;
}

export function getLoreTokenEstimate(lore: string): number {
  return Math.ceil((lore || '').length / 4);
}

export function hasRelevantLore(messages: string[]): boolean {
  const scannedText = messages.slice(-3).join(' ').toLowerCase();
  const entries = lorebook.entries || {};

  for (const entry of Object.values(entries)) {
    if (!entry?.enabled || entry.constant) {
      continue;
    }

    if (matchesKeywords(entry, scannedText)) {
      return true;
    }
  }

  return false;
}

export function getRelevantLore(recentMessages: string[], maxTokens: number = 750): string {
  const scanDepth = lorebook.scan_depth ?? DEFAULT_SCAN_DEPTH;
  const entries = lorebook.entries || {};

  const scannedText = recentMessages
    .slice(-scanDepth)
    .join(' ')
    .toLowerCase();

  const constantEntries: string[] = [];
  const keywordMatches: string[] = [];
  const probabilityMatches: string[] = [];

  for (const entry of Object.values(entries)) {
    if (!entry?.enabled) {
      continue;
    }

    const isConstant = entry.constant === true;
    const content = getEntryContent(entry, isConstant);
    if (!content) {
      continue;
    }

    if (isConstant) {
      constantEntries.push(content);
      continue;
    }

    if (matchesKeywords(entry, scannedText)) {
      keywordMatches.push(content);
      continue;
    }

    if (!shouldIncludeByProbability(entry.probability)) {
      continue;
    }

    probabilityMatches.push(content);
  }

  const matched: string[] = [...constantEntries];
  let currentLore = constantEntries.join('\n\n');

  for (const content of [...keywordMatches, ...probabilityMatches]) {
    const separator = matched.length > 0 ? '\n\n' : '';
    const nextLore = currentLore ? `${currentLore}${separator}${content}` : content;

    if (getLoreTokenEstimate(nextLore) > maxTokens) {
      break;
    }

    if (nextLore.length > MAX_LORE_CHARS) {
      break;
    }

    matched.push(content);
    currentLore = nextLore;
  }

  return matched.join('\n\n');
}
