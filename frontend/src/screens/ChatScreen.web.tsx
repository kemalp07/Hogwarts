import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  FlatList,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TextInputContentSizeChangeEventData,
  TextInputKeyPressEventData,
  View,
} from 'react-native';
import { Asset } from 'expo-asset';
import { useAppContext, Message } from '../context/AppContext';
import { getFirstMessage } from '../services/characterCard';
import { sendMessage as sendAiMessage } from '../services/aiService';

const NARRATOR_NAME = 'Hogwarts';
const NARRATOR_SUBTITLE = 'Büyücü Dünyası';
const NARRATOR_SYMBOL = '⚡';
const HOUSES = ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'] as const;
const MIN_INPUT_HEIGHT = 36;
const MAX_INPUT_HEIGHT = 100;
const LOOP_CROSSFADE_SECONDS = 0.75;
const LOOP_CROSSFADE_MS = 650;

const WEB_INPUT_RESET =
  Platform.OS === 'web'
    ? ({ outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none' } as any)
    : undefined;

const CHARACTER_AVATARS: Record<string, any> = {
  NARRATOR: require('../../assets/characters/sorting_hat.png'),
  'Harry Potter': require('../../assets/characters/harry.png'),
  'Hermione Granger': require('../../assets/characters/hermione.png'),
  'Ron Weasley': require('../../assets/characters/ron.png'),
  'Severus Snape': require('../../assets/characters/snape.png'),
  'Albus Dumbledore': require('../../assets/characters/dumbledore.png'),
  'Draco Malfoy': require('../../assets/characters/draco.png'),
  'Rubeus Hagrid': require('../../assets/characters/hagrid.png'),
  'Minerva McGonagall': require('../../assets/characters/mcgonagall.png'),
  'Dolores Umbridge': require('../../assets/characters/umbridge.png'),
  'Luna Lovegood': require('../../assets/characters/luna.png'),
  'Ginny Weasley': require('../../assets/characters/ginny.png'),
  'Neville Longbottom': require('../../assets/characters/neville.png'),
  'Voldemort': require('../../assets/characters/voldemort.png'),
  'Bellatrix Lestrange': require('../../assets/characters/bellatrix.png'),
  'Lucius Malfoy': require('../../assets/characters/lucius.png'),
  'Cedric Diggory': require('../../assets/characters/cedric.png'),
  'Fleur Delacour': require('../../assets/characters/fleur.png'),
  'Sıralama Şapkası': require('../../assets/characters/sorting_hat.png'),
  'Professor Trelawney': require('../../assets/characters/trelawney.png'),
  'Oliver Wood': require('../../assets/characters/oliver_wood.png'),
  'Gilderoy Lockhart': require('../../assets/characters/lockhart.png'),
};

const TAG_AVATARS: Record<string, any> = {
  'NARRATOR': require('../../assets/hogwarts_crest.png'),
  'UNKNOWN': require('../../assets/characters/unknown.png'),
  'SORTING_HAT': require('../../assets/characters/sorting_hat.png'),
  'HARRY': require('../../assets/characters/harry.png'),
  'HERMIONE': require('../../assets/characters/hermione.png'),
  'RON': require('../../assets/characters/ron.png'),
  'SNAPE': require('../../assets/characters/snape.png'),
  'DUMBLEDORE': require('../../assets/characters/dumbledore.png'),
  'DRACO': require('../../assets/characters/draco.png'),
  'HAGRID': require('../../assets/characters/hagrid.png'),
  'MCGONAGALL': require('../../assets/characters/mcgonagall.png'),
  'UMBRIDGE': require('../../assets/characters/umbridge.png'),
  'VOLDEMORT': require('../../assets/characters/voldemort.png'),
  'NEVILLE': require('../../assets/characters/neville.png'),
  'LUNA': require('../../assets/characters/luna.png'),
  'GINNY': require('../../assets/characters/ginny.png'),
  'FRED': require('../../assets/characters/fred.png'),
  'GEORGE': require('../../assets/characters/george.png'),
  'PERCY': require('../../assets/characters/percy.png'),
  'OLIVER': require('../../assets/characters/oliver_wood.png'),
  'CEDRIC': require('../../assets/characters/cedric.png'),
  'FLEUR': require('../../assets/characters/fleur.png'),
  'BELLATRIX': require('../../assets/characters/bellatrix.png'),
  'LUCIUS': require('../../assets/characters/lucius.png'),
  'LOCKHART': require('../../assets/characters/lockhart.png'),
  'TRELAWNEY': require('../../assets/characters/trelawney.png'),
  'DEAN': require('../../assets/characters/dean.png'),
  'SEAMUS': require('../../assets/characters/seamus.png'),
  'LAVENDER': require('../../assets/characters/lavender.png'),
  'PARVATI': require('../../assets/characters/parvati.png'),
  'PADMA': require('../../assets/characters/padma.png'),
  'PANSY': require('../../assets/characters/pansy.png'),
  'CRABBE': require('../../assets/characters/crabbe.png'),
  'GOYLE': require('../../assets/characters/goyle.png'),
  'BLAISE': require('../../assets/characters/blaise.png'),
  'JUSTIN': require('../../assets/characters/justin.png'),
  'HANNAH': require('../../assets/characters/hannah.png'),
  'SUSAN': require('../../assets/characters/susan.png'),
  'ERNIE': require('../../assets/characters/ernie.png'),
  'TERRY': require('../../assets/characters/terry.png'),
  'ANTHONY': require('../../assets/characters/anthony.png'),
  'MANDY': require('../../assets/characters/mandy.png'),
  'QUIRRELL': require('../../assets/characters/quirrell.png'),
  'FLITWICK': require('../../assets/characters/flitwick.png'),
  'SPROUT': require('../../assets/characters/sprout.png'),
  'HOOCH': require('../../assets/characters/hooch.png'),
  'FILCH': require('../../assets/characters/filch.png'),
  'POMFREY': require('../../assets/characters/pomfrey.png'),
  'ANGELINA': require('../../assets/characters/angelina.png'),
  'ALICIA': require('../../assets/characters/alicia.png'),
  'KATIE': require('../../assets/characters/katie.png'),
  'LEE': require('../../assets/characters/lee.png'),
  'NICK': require('../../assets/characters/nick.png'),
  'PEEVES': require('../../assets/characters/peeves.png'),
};

const TAG_NAMES: Record<string, string> = {
  NARRATOR: 'Anlatıcı',
  HARRY: 'Harry Potter',
  HERMIONE: 'Hermione Granger',
  RON: 'Ron Weasley',
  SNAPE: 'Severus Snape',
  DUMBLEDORE: 'Albus Dumbledore',
  DRACO: 'Draco Malfoy',
  HAGRID: 'Rubeus Hagrid',
  MCGONAGALL: 'Prof. McGonagall',
  UMBRIDGE: 'Dolores Umbridge',
  VOLDEMORT: 'Lord Voldemort',
};

function houseColor(house: string): string {
  switch (house.toLowerCase()) {
    case 'gryffindor': return 'rgba(120, 10, 10, 0.92)';
    case 'slytherin': return 'rgba(10, 80, 40, 0.92)';
    case 'hufflepuff': return 'rgba(140, 100, 0, 0.92)';
    case 'ravenclaw': return 'rgba(10, 40, 110, 0.92)';
    default: return 'rgba(60, 40, 10, 0.92)';
  }
}

function createMessage(role: 'user' | 'ai', text: string, characterName?: string): Message {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    text,
    characterName,
  };
}

const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      ).start();

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={styles.typingIndicator}>
      <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
      <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
      <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
    </View>
  );
};

function TypingBubble() {
  return <TypingIndicator />;
}

type MessageBubbleProps = {
  item: Message;
  hogwartsHouse: string;
};

function getCharacterAvatarSource(characterName?: string) {
  if (!characterName) {
    return null;
  }

  return CHARACTER_AVATARS[characterName] || null;
}

type TaggedBlock = {
  tag: string;
  name: string;
  content: string;
};

function parseTaggedResponse(text: string): Array<{ tag: string; name: string; content: string }> {
  const lines = text.split('\n');
  const blocks: Array<{ tag: string; name: string; content: string }> = [];
  let currentTag = 'NARRATOR';
  let currentLines: string[] = [];

  const pushBlock = () => {
    const content = currentLines.join('\n').trim();
    if (content) {
      let resolvedTag = currentTag;
      let resolvedName = TAG_NAMES[currentTag] || currentTag;

      if (currentTag.startsWith('CHARACTER:')) {
        resolvedName = currentTag.slice(10).trim();
        // Try to match to known tag by name
        const upperName = resolvedName.toUpperCase().split(' ')[0];
        resolvedTag = TAG_AVATARS[upperName] ? upperName : 'UNKNOWN';
      }

      const name = resolvedName;
      blocks.push({ tag: resolvedTag, name, content });
    }
  };

  for (const line of lines) {
    const tagMatch = line.match(/^\[([^\]]+)\]\s*(.*)/);
    if (tagMatch) {
      pushBlock();
      currentTag = tagMatch[1].trim();
      currentLines = tagMatch[2] ? [tagMatch[2]] : [];
    } else {
      currentLines.push(line);
    }
  }

  pushBlock();
  return blocks;
}

function parseAIMessage(text: string): React.ReactNode {
  const paragraphs = text.split(/\n\n+/).filter((paragraph) => paragraph.trim() !== '');

  return (
    <>
      {paragraphs.map((paragraph, pi) => {
        const lines = paragraph.split('\n').filter((line) => line.trim() !== '');

        return (
          <View key={pi} style={styles.aiParagraph}>
            {lines.map((line, li) => {
              const dialogueMatch = line.match(/^([A-ZÇĞİÖŞÜa-zçğışöü\s]+):\s*"(.+)"$/);
              if (dialogueMatch) {
                return (
                  <Text key={`${pi}-${li}`} style={styles.aiLine}>
                    <Text style={styles.aiSpeakerText}>{dialogueMatch[1]}: </Text>
                    <Text style={styles.aiDialogueText}>"{dialogueMatch[2]}"</Text>
                  </Text>
                );
              }

              const quoteOnlyMatch = line.match(/^"(.+)"$/);
              if (quoteOnlyMatch) {
                return (
                  <Text key={`${pi}-${li}`} style={styles.aiLine}>
                    <Text style={styles.aiDialogueText}>"{quoteOnlyMatch[1]}"</Text>
                  </Text>
                );
              }

              if (line.indexOf('"') !== -1) {
                const pieces = line.split(/("[^"]*")/g);
                return (
                  <Text key={`${pi}-${li}`} style={styles.aiLine}>
                    {pieces.map((piece, j) => {
                      if (!piece) return null;
                      if (piece.startsWith('"') && piece.endsWith('"')) {
                        return (
                          <Text key={`${pi}-${li}-${j}`} style={styles.aiDialogueText}>
                            {piece}
                          </Text>
                        );
                      }

                      const parts = piece.split(/(\*[^*]+\*)/g);
                      return parts.map((part, k) =>
                        part.startsWith('*') && part.endsWith('*') ? (
                          <Text key={`${pi}-${li}-${j}-${k}`} style={styles.aiItalicText}>
                            {part.slice(1, -1)}
                          </Text>
                        ) : (
                          <Text key={`${pi}-${li}-${j}-${k}`} style={styles.aiPlainText}>
                            {part}
                          </Text>
                        ),
                      );
                    })}
                  </Text>
                );
              }

              const parts = line.split(/(\*[^*]+\*)/g);
              return (
                <Text key={`${pi}-${li}`} style={styles.aiLine}>
                  {parts.map((part, j) =>
                    part.startsWith('*') && part.endsWith('*') ? (
                      <Text key={`${pi}-${li}-${j}`} style={styles.aiItalicText}>
                        {part.slice(1, -1)}
                      </Text>
                    ) : (
                      <Text key={`${pi}-${li}-${j}`} style={styles.aiPlainText}>
                        {part}
                      </Text>
                    ),
                  )}
                </Text>
              );
            })}
          </View>
        );
      })}
    </>
  );
}

function renderAIMessage(item: Message) {
  const taggedBlocks = parseTaggedResponse(item.text);

  return (
    <>
      {taggedBlocks.map((block, index) => {
        const avatarSource = TAG_AVATARS[block.tag] ?? TAG_AVATARS['UNKNOWN'];

        return (
          <View key={`${item.id}-${index}`} style={styles.aiBlockRow}>
            <Image source={avatarSource} style={styles.aiBlockAvatarImage} />
            <View style={styles.aiBlockBody}>
              <Text style={styles.aiBlockName}>{block.name}</Text>
              <View style={styles.aiBubble}>
                <View style={styles.aiMessageRoot}>{parseAIMessage(block.content)}</View>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}

function MessageBubble({ item, hogwartsHouse }: MessageBubbleProps) {
  if (item.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: houseColor(hogwartsHouse) }]}>
          <Text style={[styles.messageText, styles.userMessageText]}>{item.text}</Text>
        </View>
      </View>
    );
  }

  return renderAIMessage(item);
}

const INPUT_TIPS = [
  '💬 Karakter konuşturmak için tırnak kullan: "Hermione\'ye bak"',
  '⚡ Eylem için yıldız kullan: *çevreye bakınır*',
  '🧙 Bir karakteri çağır: Snape\'e bir soru sor',
  '📖 Sahneyi yönlendir: Kütüphaneye gitmek istiyorum',
  '🔮 Duygu belirt: Biraz tedirgin hissediyorum',
];

const HOUSE_COLORS = {
  gryffindor: { bg: '#740001', accent: '#D3A625', label: 'Gryffindor', symbol: '🦁' },
  hufflepuff:  { bg: '#FFD800', accent: '#000000', label: 'Hufflepuff',  symbol: '🦡' },
  ravenclaw:   { bg: '#0E1A40', accent: '#946B2D', label: 'Ravenclaw',   symbol: '🦅' },
  slytherin:   { bg: '#1A472A', accent: '#AAAAAA', label: 'Slytherin',   symbol: '🐍' },
};

const HousePointsPanel: React.FC<{
  points: Record<string, number>;
  playerHouse: string;
  side: 'left' | 'right';
}> = ({ points, playerHouse, side }) => {
  const houses = side === 'left'
    ? ['gryffindor', 'hufflepuff']
    : ['ravenclaw', 'slytherin'];

  return (
    <View style={{
      position: 'absolute',
      [side]: 0,
      top: 0,
      bottom: 0,
      width: 72,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      {houses.map(house => {
        const cfg = HOUSE_COLORS[house as keyof typeof HOUSE_COLORS];
        const isPlayer = house === playerHouse;
        return (
          <View key={house} style={{
            width: 64,
            backgroundColor: cfg.bg,
            borderRadius: 12,
            padding: 8,
            alignItems: 'center',
            borderWidth: isPlayer ? 2 : 0,
            borderColor: isPlayer ? '#FFD700' : 'transparent',
            shadowColor: isPlayer ? '#FFD700' : '#000',
            shadowOpacity: isPlayer ? 0.8 : 0.3,
            shadowRadius: 8,
            elevation: isPlayer ? 6 : 2,
          }}>
            <Text style={{ fontSize: 20 }}>{cfg.symbol}</Text>
            <Text style={{
              color: cfg.accent,
              fontSize: 10,
              fontWeight: '700',
              textAlign: 'center',
              marginTop: 2,
            }}>
              {cfg.label.slice(0, 4).toUpperCase()}
            </Text>
            <Text style={{
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '900',
              marginTop: 4,
            }}>
              {points[house] ?? 0}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

export const ChatScreen = ({ navigation }: any) => {
const {
  activeCharacter,
  characters,
  setCharacters,
  sessionId,
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  housePoints,
  gameState,
  setHousePoints,
  setGameState,
} = useAppContext();

  const userName = activeCharacter?.name || '';
  const hogwartsHouse = activeCharacter?.house || '';
  const characterProfile = activeCharacter ? {
    gender: activeCharacter.gender,
    traits: activeCharacter.traits,
    origin: activeCharacter.origin,
    height: activeCharacter.height,
    hairColor: activeCharacter.hairColor,
    fear: activeCharacter.fear,
    hobby: activeCharacter.hobby,
    secretTrait: activeCharacter.secretTrait,
  } : null;

  const setHogwartsHouse = (house: string) => {
    if (!activeCharacter) return;
    const updatedCharacters = characters.map(c =>
      c.id === activeCharacter.id ? { ...c, house } : c
    );
    setCharacters(updatedCharacters);
  };

  // Redirect to onboarding if no active character
  useEffect(() => {
    if (!activeCharacter) {
      navigation.navigate('Onboarding');
    }
  }, [activeCharacter, navigation]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const isWeb = Platform.OS === 'web';
  const flatListRef = useRef<FlatList<Message>>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [showHouseSelection, setShowHouseSelection] = useState<boolean>(
    () => !activeCharacter?.house
  );
  const [tipIndex, setTipIndex] = useState(0);

  const canSend = useMemo(() => inputText.trim().length > 0 && !isLoading, [inputText, isLoading]);

  useEffect(() => {
    if (activeCharacter?.house) return; // already played, skip
    const firstMes = getFirstMessage(0);
    const personalizedMessage = firstMes.replace(/\{\{user\}\}/g, userName || '');
    setMessages([createMessage('ai', personalizedMessage)]);
    setShowHouseSelection(true);
  }, [setMessages, userName, activeCharacter]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % INPUT_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeCharacter) return;
    if (messages.length > 0) return;

    const loadHistory = async () => {
      try {
        const res = await fetch(`http://localhost:8001/api/history?session_id=${encodeURIComponent(sessionId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const msgs = data.messages || [];
        
        if (msgs.length === 0) {
          return; // no history, house selection will show if needed
        }

        const loaded: Message[] = msgs.map((m: any) => ({
          id: Math.random().toString(36).slice(2),
          role: m.role === 'user' ? 'user' : 'ai',
          text: m.content,
        }));
        setMessages(loaded);
        setShowHouseSelection(false);
      } catch (e) {
        console.error('History load error:', e);
      }
    };

    loadHistory();
  }, [activeCharacter, sessionId]);

  // background video removed: using solid color background for web

  useEffect(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const frame = requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [messages, isLoading]);

  const handleSend = async () => {
    const trimmed = inputText.trim();

    if (!trimmed || isLoading) {
      return;
    }

    const nextMessages = [...messages, createMessage('user', trimmed)];
    setMessages(nextMessages);
    setInputText('');
    setInputHeight(MIN_INPUT_HEIGHT);
    setIsLoading(true);

    try {
      const aiResponse = await sendAiMessage(nextMessages, userName, hogwartsHouse, sessionId, characterProfile);
      if (aiResponse.housePoints) setHousePoints(aiResponse.housePoints);
      if (aiResponse.gameState) setGameState(aiResponse.gameState);
      if (aiResponse.narratorInjection) {
        const injectionMsg: Message = {
          id: `narrator-${Date.now()}`,
          role: 'ai',
          text: aiResponse.narratorInjection,
          characterName: 'Hogwarts',
        };
        setMessages([injectionMsg, ...nextMessages, createMessage('ai', aiResponse.text, aiResponse.characterName)]);
      } else {
        setMessages([
          ...nextMessages,
          createMessage('ai', aiResponse.text, aiResponse.characterName),
        ]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages([
        ...nextMessages,
        createMessage('ai', 'Bir şeyler ters gitti, tekrar dener misin?'),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentSizeChange = (
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) => {
    const nextHeight = Math.min(MAX_INPUT_HEIGHT, Math.max(MIN_INPUT_HEIGHT, event.nativeEvent.contentSize.height));
    setInputHeight(nextHeight);
  };

  const handleHouseSelect = async (house: string) => {
    setHogwartsHouse(house);
    setShowHouseSelection(false);

    // Call backend to set player house
    try {
      await fetch('http://localhost:8001/api/set-house', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, house }),
      });
    } catch (error) {
      console.error('Set house error:', error);
    }

    const userMsg = createMessage('user', `${house}!`);
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const response = await sendAiMessage(nextMessages, userName, house, sessionId, characterProfile);
      if (response.housePoints) setHousePoints(response.housePoints);
      if (response.gameState) setGameState(response.gameState);
      if (response.narratorInjection) {
        const injectionMsg: Message = {
          id: `narrator-${Date.now()}`,
          role: 'ai',
          text: response.narratorInjection,
          characterName: 'Hogwarts',
        };
        setMessages([injectionMsg, ...nextMessages, createMessage('ai', response.text, response.characterName)]);
      } else {
        setMessages([
          ...nextMessages,
          createMessage('ai', response.text, response.characterName),
        ]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages([
        ...nextMessages,
        createMessage('ai', 'Bir şeyler ters gitti, tekrar dener misin?'),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const webEvent = event as any;
    const shiftPressed = !!webEvent?.nativeEvent?.shiftKey;

    if (event.nativeEvent.key === 'Enter' && !shiftPressed) {
      webEvent?.preventDefault?.();
      handleSend();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.overlay}>
        <View style={styles.backgroundColorFill} />
        <View style={styles.backgroundDarkOverlay} />
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.screen}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{NARRATOR_NAME}</Text>
              <Text style={styles.headerSubtitle}>{NARRATOR_SUBTITLE}</Text>
            </View>

            {/* Sol panel: Gryffindor + Hufflepuff */}
            <HousePointsPanel
              points={housePoints}
              playerHouse={gameState?.playerHouse ?? 'gryffindor'}
              side="left"
            />

            {/* Sağ panel: Ravenclaw + Slytherin */}
            <HousePointsPanel
              points={housePoints}
              playerHouse={gameState?.playerHouse ?? 'gryffindor'}
              side="right"
            />

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (item.role === 'ai' ? renderAIMessage(item) : <MessageBubble item={item} hogwartsHouse={hogwartsHouse} />)}
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              maintainVisibleContentPosition={null}
              style={styles.list}
              contentContainerStyle={[styles.listContent, { paddingHorizontal: 80 }]}
              ItemSeparatorComponent={() => <View style={styles.messageSeparator} />}
              keyboardShouldPersistTaps="handled"
              inverted={false}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={isLoading ? <TypingBubble /> : null}
              ListEmptyComponent={
                <View style={styles.emptyStateWrap}>
                  <Text style={styles.emptyStateTitle}>{NARRATOR_NAME}</Text>
                  <Text style={styles.emptyStateSubtitle}>Sana nasıl yardımcı olabilirim?</Text>
                </View>
              }
            />

            {showHouseSelection ? (
              <View style={styles.houseSelectionArea}>
                <View style={styles.houseButtonsRow}>
                  {HOUSES.map((house) => (
                    <TouchableOpacity
                      key={house}
                      onPress={() => handleHouseSelect(house)}
                      disabled={isLoading}
                      style={[
                        styles.houseButton,
                        { backgroundColor: houseColor(house) },
                        isLoading && styles.houseButtonDisabled,
                      ]}
                    >
                      <Text style={styles.houseButtonText}>{house}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.inputArea}>
                <Text style={styles.inputTip}>{INPUT_TIPS[tipIndex]}</Text>
                <View style={[styles.inputBox, styles.inputBoxSpacing]}>
                  <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={isWeb ? undefined : handleSend}
                    onKeyPress={isWeb ? handleKeyPress : undefined}
                    onContentSizeChange={handleContentSizeChange}
                    placeholder="Mesaj yaz..."
                    placeholderTextColor="#8B7355"
                    multiline={!isWeb}
                    blurOnSubmit={false}
                    returnKeyType="send"
                    underlineColorAndroid="transparent"
                    textAlignVertical="center"
                    scrollEnabled={inputHeight >= MAX_INPUT_HEIGHT}
                    style={[styles.textInput, { height: inputHeight }, WEB_INPUT_RESET]}
                  />
                  <Pressable
                    onPress={handleSend}
                    disabled={!canSend || isLoading}
                    style={({ pressed }) => [
                      styles.sendButton,
                      canSend && !isLoading ? styles.sendButtonActive : styles.sendButtonDisabled,
                      pressed && canSend && !isLoading ? styles.sendButtonPressed : null,
                    ]}
                  >
                    <Text style={styles.sendButtonText}>↑</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  backgroundVideoWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundVideoIgnorePointer: {
    pointerEvents: 'none',
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    filter: 'saturate(1.14) contrast(1.08) brightness(1.04)',
  },
  backgroundVideoLayer: {
    // No transition: instant swap for seamless illusion
    transitionProperty: 'opacity',
    transitionDuration: `0ms`,
    transitionTimingFunction: 'linear',
  },

  backgroundColorFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    backgroundImage: "url('/assets/hogwarts_clean.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: 0.55,
  },
  backgroundDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    height: 64,
    backgroundColor: 'rgba(5, 3, 1, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Cinzel, serif',
    letterSpacing: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    letterSpacing: 3,
    marginTop: 2,
    fontFamily: 'Cinzel, serif',
  },
  list: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
    alignItems: 'stretch',
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  messageSeparator: {
    height: 14,
  },
  userRow: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    alignItems: 'flex-end',
  },
  userBubble: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '72%',
    flexShrink: 1,
  },
  aiRow: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(12, 7, 2, 0.92)',
    flexShrink: 0,
  },
  aiBlockRow: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  aiBlockAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(12, 7, 2, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  aiBlockAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 8,
    flexShrink: 0,
  },
  aiBlockBody: {
    flex: 1,
    maxWidth: '88%',
  },
  aiBlockName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  aiAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 8,
    flexShrink: 0,
  },
  aiAvatarText: {
    marginBottom: 0,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  aiBubble: {
    backgroundColor: 'rgba(20, 12, 4, 0.82)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120, 53, 15, 0.6)',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '100%',
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    paddingTop: 12,
    paddingBottom: 12,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageRoot: {
    flexShrink: 1,
  },
  aiParagraph: {
    marginBottom: 12,
  },
  aiLine: {
    marginBottom: 4,
    fontSize: 14,
    lineHeight: 22,
  },
  aiSpeakerText: {
    fontWeight: '700',
    color: '#FB923C',
    lineHeight: 22,
  },
  aiDialogueText: {
    color: '#F59E0B',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  aiPlainText: {
    color: '#F5F0E8',
    lineHeight: 22,
  },
  aiItalicText: {
    fontStyle: 'italic',
    color: '#D4B896',
    lineHeight: 22,
  },
  houseSelectionArea: {
    backgroundColor: 'transparent',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 230, 200, 0.12)',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  houseButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    maxWidth: 760,
    alignSelf: 'center',
    width: '100%',
  },
  houseButton: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: '45%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  houseButtonDisabled: {
    opacity: 0.6,
  },
  houseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  inputArea: {
    backgroundColor: 'transparent',
    paddingHorizontal: 40,
    paddingTop: 12,
    paddingBottom: 24,
    alignItems: 'center',
  },
  inputTip: {
    fontSize: 11,
    color: 'rgba(245, 220, 180, 0.45)',
    textAlign: 'center',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  inputBoxSpacing: {
    marginBottom: 0,
  },
  inputBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 720,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#F5E6C8',
    borderWidth: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    marginRight: 10,
    textAlignVertical: 'center',
    includeFontPadding: false,
    backgroundColor: 'transparent',
    alignSelf: 'center',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    alignSelf: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#D97706',
  },
  sendButtonDisabled: {
    backgroundColor: 'transparent',
  },
  sendButtonPressed: {
    opacity: 0.9,
  },
  sendIcon: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
  },
  sendIconActive: {
    color: '#FFFFFF',
  },
  sendIconDisabled: {
    color: '#8C8C8C',
  },
  sendButtonText: {
    fontSize: 18,
    color: '#F5E6C8',
    fontWeight: '700',
  },
  emptyStateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#F5E6C8',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#CBB38C',
    textAlign: 'center',
    lineHeight: 20,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
