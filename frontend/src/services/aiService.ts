// Assembles final prompt and calls the AI API

export type Message = { id: string; role: 'user' | 'ai'; text: string };

type ApiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatApiResponse = {
  response?: string;
  text?: string;
};

// Use the test endpoint in local dev when Vertex credentials may be missing.
const API_URL = 'http://localhost:8001/api/chat';

export async function sendMessage(
  messages: Message[],
  userName: string,
  house: string = '',
): Promise<string> {
  try {
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
