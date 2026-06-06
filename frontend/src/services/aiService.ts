// Assembles final prompt and calls the AI API

export type Message = { id: string; role: 'user' | 'ai'; text: string; characterName?: string };

type AIMessageResult = {
  text: string;
  characterName?: string;
  housePoints?: { gryffindor: number; hufflepuff: number; ravenclaw: number; slytherin: number };
  gameState?: { week: number; day: number; playerHouse: string };
  narratorInjection?: string;
};

type ApiMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatApiResponse = {
  response?: string;
  text?: string;
  character_name?: string;
};

// Use the test endpoint in local dev when Vertex credentials may be missing.
const API_URL = 'http://localhost:8001/api/chat';

export async function sendMessage(
  messages: Message[],
  userName: string,
  house: string = '',
  sessionId: string = '',
  characterProfile: any = null,
): Promise<AIMessageResult> {
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
      session_id: sessionId,
      character_profile: characterProfile,
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
      return { text, characterName: data.character_name };
    }

    const raw = await response.text();
    let assembled = '';
    let characterName = '';
    let housePoints: { gryffindor: number; hufflepuff: number; ravenclaw: number; slytherin: number } | undefined;
    let gameState: { week: number; day: number; playerHouse: string } | undefined;
    let narratorInjection: string | undefined;

    for (const line of raw.split('\n')) {
      if (!line.startsWith('data: ')) {
        continue;
      }

      const dataPart = line.slice(6).trim();
      if (!dataPart) {
        continue;
      }

      try {
        const parsed = JSON.parse(dataPart) as {
          type?: string;
          text?: string;
          character_name?: string;
          house_points?: any;
          game_state?: any;
          narrator_injection?: string;
          simulation_params?: {
            session_id: string;
            player_house: string;
            week: number;
            day: number;
          };
        };
        if (parsed.type === 'meta') {
          housePoints = parsed.house_points;
          gameState = parsed.game_state;
          narratorInjection = parsed.narrator_injection;
        } else if (parsed.type === 'chunk' && parsed.text) {
          assembled += parsed.text;
        } else if (parsed.type === 'done') {
          if (parsed.character_name) {
            characterName = parsed.character_name;
          }
          if (parsed.house_points) {
            housePoints = parsed.house_points;
          }

          if (parsed.simulation_params) {
            const sp = parsed.simulation_params;
            fetch('http://localhost:8001/api/run-simulation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                session_id: sp.session_id,
                player_house: sp.player_house,
                week: sp.week,
                day: sp.day,
                conversation: messages.slice(-10).map((m) => ({
                  role: m.role === 'ai' ? 'assistant' : 'user',
                  content: m.text || '',
                })),
              }),
            })
              .then((r) => r.json())
              .then((data) => {
                if (data.house_points) {
                  housePoints = data.house_points;
                }
              })
              .catch(() => {});
          }
        }
      } catch {
        // Ignore malformed SSE chunks.
      }
    }

    if (!assembled) {
      throw new Error('Empty streaming response from AI API');
    }

    return { text: assembled, characterName: characterName || undefined, housePoints, gameState, narratorInjection };
  } catch (error) {
    console.error('sendMessage failed:', error);
    throw error;
  }
}
