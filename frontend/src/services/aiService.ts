// Assembles final prompt and calls the AI API
import characterCardData from '../data/wizarding-world-spec_v2.json';
import { getRelevantLore, hasRelevantLore } from './lorebook';

export type Message = { id: string; role: 'user' | 'ai'; text: string };

type ApiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatApiResponse = {
  response?: string;
  text?: string;
};

const API_URL = 'http://localhost:8001/api/chat';

type CharacterCardData = {
  data?: {
    system_prompt?: string;
    description?: string;
    scenario?: string;
    post_history_instructions?: string;
  };
};

function replaceUserPlaceholders(input: string, userName: string): string {
  return (input || '').replace(/\{\{user\}\}/g, userName);
}

function buildFinalSystemPrompt(userName: string): string {
  const card = characterCardData as CharacterCardData;
  const data = card.data || {};
  const finalPrompt = [
    data.system_prompt || '',
    data.description || '',
    data.scenario || '',
    data.post_history_instructions || '',
  ]
    .join('\n\n')
    .trim();

  return replaceUserPlaceholders(finalPrompt, userName);
}

export async function sendMessage(
  messages: Message[],
  userName: string,
  house: string = '',
): Promise<string> {
  try {
    let systemPrompt = buildFinalSystemPrompt(userName);
    const recentMessages = messages.slice(-3).map((message) => message.text);

    if (house) {
      systemPrompt += `\n\nIMPORTANT: The user has been sorted into ${house}.
Always refer to them as a ${house} student.
Their common room, housemates, and house traits should be reflected throughout the story.`;
    }

    if (hasRelevantLore(recentMessages)) {
      const worldContext = getRelevantLore(recentMessages, 750);

      if (worldContext) {
        systemPrompt += `\n\nWorld context:\n${worldContext}`;
      }
    }

    console.log('Final system prompt:', systemPrompt);

    const history: ApiMessage[] = messages
      .slice(-20)
      .map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }));

    const payload = {
      message: history[history.length - 1]?.content || '',
      user_name: userName,
      character_id: 'hogwarts-narrator',
      location_id: 'great-hall',
      model: undefined,
      // Pass full prompt context for servers that can use it.
      system_prompt: systemPrompt,
      history,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';

    // Supports both JSON and SSE-style text responses.
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as ChatApiResponse;
      const text = data.response || data.text || '';
      if (!text) {
        throw new Error('Empty response from AI API');
      }
      return text;
    }

    const raw = await response.text();
    let assembled = '';

    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) {
        continue;
      }

      const dataPart = line.slice(6).trim();
      if (!dataPart) {
        continue;
      }

      try {
        const parsed = JSON.parse(dataPart) as { type?: string; text?: string };
        if (parsed.type === 'chunk' && parsed.text) {
          assembled += parsed.text;
        }
      } catch {
        // Ignore malformed SSE chunks.
      }
    }

    if (!assembled) {
      throw new Error('Empty streaming response from AI API');
    }

    return assembled;
  } catch (error) {
    console.error('sendMessage failed:', error);
    throw error;
  }
}
