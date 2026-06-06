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
const API_BASE = 'https://hogwarts-2.onrender.com/api';
const API_URL = `${API_BASE}/chat`;

export async function deleteMessage(
  sessionId: string,
  content: string,
  role: 'user' | 'assistant',
): Promise<void> {
  try {
    await fetch(`${API_BASE}/delete-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, content, role }),
    });
  } catch {
    // Best-effort server sync.
  }
}

export async function updateMessage(
  sessionId: string,
  oldContent: string,
  newContent: string,
  role: 'user' | 'assistant',
): Promise<void> {
  const trimmed = newContent.trim();
  if (!trimmed || trimmed === oldContent) return;

  try {
    await fetch(`${API_BASE}/edit-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        old_content: oldContent,
        new_content: trimmed,
        role,
      }),
    });
  } catch {
    // Best-effort server sync.
  }
}

export async function sendMessage(
  messages: Message[],
  userName: string,
  house: string = '',
  sessionId: string = '',
  characterProfile: any = null,
  playerAttraction: string = 'Her ikisi',
): Promise<AIMessageResult> {
  try {
    const history: ApiMessage[] = messages
      .slice(-20)
      .map((m) => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.text,
      }));

    const payload = {
      message: history[history.length - 1]?.content || '...',
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
    let simulationParams: {
      session_id: string;
      player_house: string;
      week: number;
      day: number;
    } | undefined;

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
            simulationParams = parsed.simulation_params;
          }
        }
      } catch {
        // Ignore malformed SSE chunks.
      }
    }

    if (simulationParams) {
      const sp = simulationParams;
      try {
        const simRes = await fetch('https://hogwarts-2.onrender.com/api/run-simulation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sp.session_id,
            player_house: sp.player_house,
            week: sp.week,
            day: sp.day,
            ai_response: assembled,
            player_name: userName,
            player_attraction: playerAttraction,
            conversation: messages.slice(-10).map((m) => ({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.text || '',
            })),
          }),
        });
        const data = await simRes.json();
        if (data.house_points) {
          housePoints = data.house_points;
        }
        if (data.surprise_event) {
          narratorInjection = (narratorInjection || '') + '\n' + data.surprise_event;
        }
      } catch {
        // Simulation optional — chat response still valid.
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
