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
import { useAppContext, Message, saveCharacterToDB } from '../context/AppContext';
import { getFirstMessage } from '../services/characterCard';
import { deleteMessage, sendMessage as sendAiMessage, updateMessage } from '../services/aiService';
import { housePointsEqual, normalizeHousePoints } from '../utils/housePoints';
import { getInputTips, getTagNames, t, Language } from '../i18n/translations';
import { localizeScheduleData } from '../i18n/schedule';

const NARRATOR_NAME = 'Hogwarts';
const HOUSE_POINTS_POLL_MS = 3000;
const HOUSE_POINTS_REFRESH_DELAYS = [1500, 3500, 6000, 10000, 18000] as const;
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

const LOCATION_BACKGROUNDS: Record<string, any> = {
  gryffindor_tower: require('../../assets/backgrounds/gryffindor_tower.png'),
  great_hall: require('../../assets/backgrounds/great_hall.png'),
  library: require('../../assets/backgrounds/library.png'),
  dungeons: require('../../assets/backgrounds/dungeons.png'),
  quidditch_field: require('../../assets/backgrounds/quidditch_field.png'),
  corridor: require('../../assets/backgrounds/corridor.png'),
  classroom: require('../../assets/backgrounds/classroom.png'),
  owlery: require('../../assets/backgrounds/owlery.png'),
  hospital_wing: require('../../assets/backgrounds/hospital_wing.png'),
  forbidden_forest: require('../../assets/backgrounds/forbidden_forest.png'),
  hogsmeade: require('../../assets/backgrounds/hogsmeade.png'),
  astronomy_tower: require('../../assets/backgrounds/astronomy_tower.png'),
  potions_classroom: require('../../assets/backgrounds/potions_classroom.png'),
  transfiguration_classroom: require('../../assets/backgrounds/transfiguration_classroom.png'),
  charms_classroom: require('../../assets/backgrounds/charms_classroom.png'),
  herbology_greenhouse: require('../../assets/backgrounds/herbology_greenhouse.png'),
  defense_classroom: require('../../assets/backgrounds/defense_classroom.png'),
  great_lake: require('../../assets/backgrounds/great_lake.png'),
  slytherin_common_room: require('../../assets/backgrounds/slytherin_common_room.png'),
  hufflepuff_common_room: require('../../assets/backgrounds/hufflepuff_common_room.png'),
  ravenclaw_common_room: require('../../assets/backgrounds/ravenclaw_common_room.png'),
  gryffindor_dormitory: require('../../assets/backgrounds/gryffindor_dormitory.png'),
  slytherin_dormitory: require('../../assets/backgrounds/slytherin_dormitory.png'),
  room_of_requirement: require('../../assets/backgrounds/room_of_requirement.png'),
};

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
    timestamp: Date.now(),
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

type MessageEditProps = {
  item: Message;
  sessionId: string;
  editingId: string | null;
  editText: string;
  setEditText: (text: string) => void;
  setEditingId: (id: string | null) => void;
  setMessages: (msgs: Message[] | ((prev: Message[]) => Message[])) => void;
};

type MessageBubbleProps = MessageEditProps & {
  hogwartsHouse: string;
};

async function deleteMessageItem(
  sessionId: string,
  item: Message,
  role: 'user' | 'assistant',
  setMessages: MessageEditProps['setMessages'],
) {
  setMessages((prev) => prev.filter((m) => m.id !== item.id));
  await deleteMessage(sessionId, item.text, role);
}

async function saveMessageEdit(
  sessionId: string,
  item: Message,
  newText: string,
  role: 'user' | 'assistant',
  setMessages: MessageEditProps['setMessages'],
  setEditingId: (id: string | null) => void,
) {
  const trimmed = newText.trim();
  if (!trimmed) {
    setEditingId(null);
    return;
  }

  setMessages((prev) =>
    prev.map((m) => (m.id === item.id ? { ...m, text: trimmed } : m)),
  );
  setEditingId(null);

  if (trimmed !== item.text) {
    await updateMessage(sessionId, item.text, trimmed, role);
  }
}

function BubbleInlineActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { language } = useAppContext();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [open]);

  return (
    <View style={{ position: 'absolute', top: 2, right: 12, zIndex: 20 }}>
      <Pressable onPress={() => setOpen((o) => !o)}>
        <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16, lineHeight: 16 }}>⋮</Text>
      </Pressable>

      {open && (
        <>
          <Pressable
            onPress={() => setOpen(false)}
            style={{
              position: 'fixed' as any,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 25,
            }}
          />
          <View style={{
            position: 'absolute',
            bottom: 24,
            right: 0,
            backgroundColor: 'rgba(15,10,3,0.97)',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: 'rgba(201,168,76,0.2)',
            flexDirection: 'row',
            overflow: 'hidden',
            zIndex: 30,
          }}>
            <Pressable
              onPress={() => {
                setOpen(false);
                onEdit();
              }}
              style={{ paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Text style={{ color: '#c9a84c', fontSize: 12 }}>{t(language, 'edit')}</Text>
            </Pressable>
            <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
            <Pressable
              onPress={() => {
                setOpen(false);
                onDelete();
              }}
              style={{ paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <Text style={{ color: '#e87a7a', fontSize: 12 }}>{t(language, 'delete')}</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function EditMessageActions({
  onSave,
  onCancel,
}: {
  onSave: () => void;
  onCancel: () => void;
}) {
  const { language } = useAppContext();

  return (
    <View style={styles.userMessageActions}>
      <Pressable onPress={onSave}>
        <Text style={styles.userActionSave}>{t(language, 'save')}</Text>
      </Pressable>
      <Pressable onPress={onCancel}>
        <Text style={styles.userActionCancel}>{t(language, 'cancel')}</Text>
      </Pressable>
    </View>
  );
}

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

function parseTaggedResponse(text: string, tagNames: Record<string, string>): Array<{ tag: string; name: string; content: string }> {
  const lines = text.split('\n');
  const blocks: Array<{ tag: string; name: string; content: string }> = [];
  let currentTag = 'NARRATOR';
  let currentLines: string[] = [];

  const pushBlock = () => {
    const content = currentLines.join('\n').trim();
    if (content) {
      let resolvedTag = currentTag;
      let resolvedName = tagNames[currentTag] || currentTag;

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
    if (/^\[TIME:[^\]]+\]/i.test(line.trim())) {
      continue;
    }
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

const cleanContent = (text: string) =>
  text.replace(/\[TIME:[^\]]+\]/gi, '').replace(/<[^>]*>/g, '').trim();

function parseAIMessage(text: string): React.ReactNode {
  const cleanedText = cleanContent(text);
  const paragraphs = cleanedText.split(/\n\n+/).filter((paragraph) => paragraph.trim() !== '');

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

const isErrorMessage = (text: string) =>
  text.includes('Vertex AI HTTP 429') ||
  text.includes('RESOURCE_EXHAUSTED') ||
  text.includes('Resource exhausted') ||
  text.includes('Failed to fetch');

function AIMessageBubble({
  item,
  sessionId,
  editingId,
  editText,
  setEditText,
  setEditingId,
  setMessages,
  scheduleData,
  language,
}: MessageEditProps & { scheduleData?: any; language: Language }) {
  if (isErrorMessage(item.text)) {
    return (
      <View style={styles.aiBlockRow}>
        <Text style={styles.aiErrorFallback}>
          {t(language, 'aiErrorFallback')}
        </Text>
      </View>
    );
  }

  if (editingId === item.id) {
    return (
      <View style={styles.aiBlockRow}>
        <View style={styles.aiBlockBody}>
          <TextInput
            value={editText}
            onChangeText={setEditText}
            style={[styles.aiBubble, styles.aiEditInput]}
            autoFocus
            multiline
          />
          <EditMessageActions
            onSave={() => saveMessageEdit(sessionId, item, editText, 'assistant', setMessages, setEditingId)}
            onCancel={() => setEditingId(null)}
          />
        </View>
      </View>
    );
  }

  const taggedBlocks = parseTaggedResponse(item.text, getTagNames(language));
  const mergedBlocks = taggedBlocks.reduce((acc: typeof taggedBlocks, block) => {
    const last = acc[acc.length - 1];
    if (last && last.tag === block.tag) {
      last.content = last.content + '\n' + cleanContent(block.content);
      return acc;
    }
    acc.push({ ...block, content: cleanContent(block.content) });
    return acc;
  }, []);

  const startEdit = () => {
    setEditText(item.text);
    setEditingId(item.id);
  };

  const handleDelete = () =>
    deleteMessageItem(sessionId, item, 'assistant', setMessages);

  return (
    <>
      {mergedBlocks.map((block, index) => {
        const avatarSource = TAG_AVATARS[block.tag] ?? TAG_AVATARS['UNKNOWN'];
        const isFirstOrLastBlock = index === 0 || index === mergedBlocks.length - 1;

        return (
          <View key={`${item.id}-${index}`} style={styles.aiBlockRow}>
            <Image source={avatarSource} style={styles.aiBlockAvatarImage} />
            <View style={styles.aiBlockBody}>
              <Text style={styles.aiBlockName}>{block.name}</Text>
              <View style={styles.aiBubble}>
                <BubbleInlineActions onEdit={startEdit} onDelete={handleDelete} />
                {isFirstOrLastBlock && scheduleData && (
                  <Text style={{
                    color: 'rgba(201,168,76,0.65)',
                    fontSize: 10,
                    fontFamily: 'Cinzel, serif',
                    fontWeight: '600',
                    marginBottom: 6,
                    letterSpacing: 0.5,
                  }}>
                    📅 {scheduleData.day_name} • {t(language, 'weekLabel', scheduleData.week)} • 🕙 {String(scheduleData.hour).padStart(2, '0')}:00
                  </Text>
                )}
                <View style={styles.aiMessageRoot}>
                  {parseAIMessage(cleanContent(block.content))}
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}

function MessageBubble({
  item,
  hogwartsHouse,
  sessionId,
  editingId,
  editText,
  setEditText,
  setEditingId,
  setMessages,
}: MessageBubbleProps) {
  const bubbleColor = houseColor(hogwartsHouse);

  const startEdit = () => {
    setEditText(item.text);
    setEditingId(item.id);
  };

  const handleDelete = () =>
    deleteMessageItem(sessionId, item, 'user', setMessages);

  if (editingId === item.id) {
    return (
      <View style={styles.userRow}>
        <TextInput
          value={editText}
          onChangeText={setEditText}
          style={[styles.userBubble, styles.userEditInput, { backgroundColor: bubbleColor, color: '#fff' }]}
          autoFocus
          multiline
        />
        <EditMessageActions
          onSave={() => saveMessageEdit(sessionId, item, editText, 'user', setMessages, setEditingId)}
          onCancel={() => setEditingId(null)}
        />
      </View>
    );
  }

  return (
    <View style={styles.userRow}>
      <View style={[styles.userBubble, { backgroundColor: bubbleColor }]}>
        <BubbleInlineActions onEdit={startEdit} onDelete={handleDelete} />
        <Text style={[styles.messageText, styles.userMessageText]}>
          {item.text}
        </Text>
      </View>
    </View>
  );
}

const HOUSE_CONFIG: Record<string, { label: string; short: string; color: string; logoKey: string }> = {
  gryffindor: { label: 'Gryffindor', short: 'GRIFF',   color: '#e8b86d', logoKey: 'gryffindor' },
  hufflepuff:  { label: 'Hufflepuff', short: 'HUFF',    color: '#f0d060', logoKey: 'hufflepuff' },
  ravenclaw:   { label: 'Ravenclaw',  short: 'RAVEN',   color: '#7eb8e8', logoKey: 'ravenclaw'  },
  slytherin:   { label: 'Slytherin',  short: 'SLYTH',   color: '#7acf7a', logoKey: 'slytherin'  },
};

// Logo asset map — sen kendi asset path'lerini buraya yaz
// Geçici olarak emoji kullan, logolar gelince değiştir
const HOUSE_LOGOS: Record<string, any> = {
  gryffindor: require('../../assets/houses/gryffindor.png'),
  ravenclaw:  require('../../assets/houses/ravenclaw.png'),
  hufflepuff: require('../../assets/houses/hufflepuff.png'),
  slytherin:  require('../../assets/houses/slytherin.png'),
};

const HOUSE_SCORE_COLOR: Record<string, string> = {
  gryffindor: '#e8b86d',
  hufflepuff:  '#f0d060',
  ravenclaw:   '#7eb8e8',
  slytherin:   '#7acf7a',
};

const HOUSE_SHORT: Record<string, string> = {
  gryffindor: 'GRIFF',
  hufflepuff:  'HUFF',
  ravenclaw:   'RAVEN',
  slytherin:   'SLYTH',
};

const RANK_ACCENT = ['#c9a84c', '#aaaaaa', '#8B6914', 'rgba(255,255,255,0.15)'];

const HOUSE_EMOJIS: Record<string, string> = {
  gryffindor: '🦁',
  hufflepuff: '🦡',
  ravenclaw:  '🦅',
  slytherin:  '🐍',
};

interface HousePanelProps {
  displayPoints: Record<string, number>;
  housePoints: Record<string, number>;
  playerHouse: string;
  side: 'left' | 'right';
  headerHeight: number;
}

const HousePointsPanel: React.FC<HousePanelProps> = ({
  displayPoints, housePoints, playerHouse, side, headerHeight
}) => {
  const sorted = Object.entries(housePoints)
    .sort((a, b) => b[1] - a[1])
    .map(([h]) => h);

  const indices = side === 'left' ? [0, 1] : [2, 3];

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: headerHeight,
        [side]: 0,
        flexDirection: 'row',
        paddingTop: 16,
        paddingHorizontal: 8,
        gap: 30,
        zIndex: 20,
        alignItems: 'flex-start',
      }}
    >
      {indices.map((rankIdx) => {
        const house = sorted[rankIdx];
        if (!house) return null;
        const rank = rankIdx + 1;
        const isPlayer = house === playerHouse?.toLowerCase();
        const accent = RANK_ACCENT[rankIdx];
        const scoreColor = HOUSE_SCORE_COLOR[house] ?? '#ffffff';

        return (
          <View
            key={house}
            style={{
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Rank numarası */}
            <View style={{
              position: 'absolute',
              top: 0, left: 0,
              width: 22, height: 22,
              borderRadius: 11,
              backgroundColor: 'rgba(0,0,0,0.55)',
              borderWidth: 0.5,
              borderColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}>
              <Text style={{
                fontSize: 11,
                fontWeight: '700',
                color: accent,
                fontFamily: 'Cinzel, serif',
              }}>
                {rank}
              </Text>
            </View>

            {/* Logo — büyük, şeffaf */}
            <Image
              source={HOUSE_LOGOS[house]}
              style={{
                width: 200,
                height: 200,
                resizeMode: 'contain',
                opacity: isPlayer ? 1.0 : 0.8,
              }}
            />

            {/* Puan */}
            <Text style={{
              fontSize: 40,
              fontWeight: '700',
              color: scoreColor,
              fontFamily: 'Cinzel, serif',
              lineHeight: 40,
              textShadowColor: 'rgba(0,0,0,0.9)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}>
              {displayPoints[house] ?? 0}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const TimeStrip: React.FC<{ data: any; onPress: () => void; language: Language }> = ({ data, onPress, language }) => {
  if (!data) return null;

  const activeClass = data.schedule?.find((c: any) => c.status === 'active');
  const upcomingClass = data.schedule?.find((c: any) => c.status === 'upcoming');

  const accentColor = activeClass ? '#e87a7a'
    : upcomingClass ? '#e8b86d'
    : '#7acf7a';

  return (
    <Pressable
      onPress={onPress}
      pointerEvents="auto"
      style={{
        position: 'absolute',
        bottom: 90,
        right: 8,
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(5,3,1,0.85)',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(201,168,76,0.25)',
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        zIndex: 15,
      }}
    >
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontFamily: 'Cinzel, serif', letterSpacing: 1 }}>
        {data.day_name} • {t(language, 'weekLabel', data.week)}
      </Text>
      <Text style={{ color: '#c9a84c', fontSize: 13, fontFamily: 'Cinzel, serif', fontWeight: '700', marginTop: 2 }}>
        {String(data.hour).padStart(2, '0')}:00
      </Text>
      <Text style={{ color: accentColor, fontSize: 10, fontFamily: 'Cinzel, serif', marginTop: 3 }}>
        {activeClass ? `🔴 ${activeClass.subject}`
         : upcomingClass ? `⏳ ${upcomingClass.subject}`
         : t(language, 'freeTime')}
      </Text>
    </Pressable>
  );
};

const SchedulePopup: React.FC<{
  data: any;
  onClose: () => void;
  language: Language;
}> = ({ data, onClose, language }) => {
  if (!data) return null;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return '✅';
      case 'active':
        return '🔴';
      case 'upcoming':
        return '⏳';
      default:
        return '📚';
    }
  };

  return (
    <Pressable
      onPress={onClose}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 120,
      }}
    >
      <Pressable
        onPress={(e) => e.stopPropagation?.()}
        style={{
          backgroundColor: 'rgba(15, 10, 3, 0.97)',
          borderRadius: 12,
          padding: 20,
          width: 320,
          borderWidth: 1,
          borderColor: 'rgba(201,168,76,0.3)',
        }}
      >
        <Text
          style={{
            color: '#c9a84c',
            fontSize: 16,
            fontFamily: 'Cinzel, serif',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: 4,
          }}
        >
          {t(language, 'scheduleTitle', data.day_name)}
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11,
            fontFamily: 'Cinzel, serif',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          {t(language, 'scheduleTime', String(data.hour).padStart(2, '0'))} • {t(language, 'weekLabel', data.week)}
        </Text>

        {data.schedule?.length === 0 ? (
          <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontStyle: 'italic' }}>
            {t(language, 'noClassesToday')}
          </Text>
        ) : (
          data.schedule?.map((cls: any, i: number) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: 0.5,
                borderBottomColor: 'rgba(255,255,255,0.08)',
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 16 }}>{statusIcon(cls.status)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Cinzel, serif' }}>
                  {cls.time} — {cls.subject}
                </Text>
                {cls.teacher ? (
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
                    {cls.teacher}
                    {cls.penalty > 0 ? ` • ${t(language, 'missPenalty', cls.penalty)}` : ''}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}

        <Text
          style={{
            color: '#c9a84c',
            fontSize: 13,
            fontFamily: 'Cinzel, serif',
            marginTop: 16,
            marginBottom: 8,
            fontWeight: '600',
          }}
        >
          {t(language, 'tomorrow', data.tomorrow_day_name)}
        </Text>
        {data.tomorrow_schedule?.length === 0 ? (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontStyle: 'italic' }}>
            {t(language, 'noClassesTomorrow')}
          </Text>
        ) : (
          data.tomorrow_schedule?.map((cls: any, i: number) => (
            <View
              key={`tomorrow-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 6,
                borderBottomWidth: 0.5,
                borderBottomColor: 'rgba(255,255,255,0.06)',
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 14 }}>📚</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Cinzel, serif' }}>
                  {cls.time} — {cls.subject}
                </Text>
                {cls.teacher ? (
                  <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>
                    {cls.teacher}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )}

        <Pressable onPress={onClose} style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(201,168,76,0.6)', fontSize: 12, fontFamily: 'Cinzel, serif' }}>
            {t(language, 'close')}
          </Text>
        </Pressable>
      </Pressable>
    </Pressable>
  );
};

export const ChatScreen = ({ navigation }: any) => {
const {
  activeCharacter,
  characters,
  setCharacters,
  setActiveCharacter,
  sessionId,
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  housePoints,
  gameState,
  setHousePoints,
  setGameState,
  language,
} = useAppContext();

  const inputTips = useMemo(() => getInputTips(language), [language]);

  const userName = activeCharacter?.name || '';
  const playerAttraction = activeCharacter?.attraction || 'Her ikisi';
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
    wand: activeCharacter.wand,
  } : null;

  // House points animation state
  const prevHousePoints = useRef({ gryffindor: 0, hufflepuff: 0, ravenclaw: 0, slytherin: 0 });
  const pointsFloorStartedAtRef = useRef<number | null>(null);
  const [displayPoints, setDisplayPoints] = useState({ gryffindor: 0, hufflepuff: 0, ravenclaw: 0, slytherin: 0 });

  const applyHousePoints = (points: Record<string, number>) => {
    setHousePoints((prev: Record<string, number>) => {
      const next = normalizeHousePoints(points, pointsFloorStartedAtRef.current);
      return housePointsEqual(prev, next) ? prev : next;
    });
  };

  const scheduleHousePointsRefresh = () => {
    HOUSE_POINTS_REFRESH_DELAYS.forEach((delay) => {
      setTimeout(() => fetchHousePoints(), delay);
    });
  };
  const [playerHouse, setPlayerHouse] = useState<string>('gryffindor');
  const animationRefs = useRef<Record<string, any>>({});

  const setHogwartsHouse = (house: string) => {
    if (!activeCharacter) return;
    const updatedChar = { ...activeCharacter, house };
    setActiveCharacter(updatedChar);
    setCharacters(characters.map(c =>
      c.id === activeCharacter.id ? { ...c, house } : c
    ));
    setPlayerHouse(house.toLowerCase());
  };

  const animatePointChange = (house: string, from: number, to: number) => {
    if (animationRefs.current[house]) {
      clearInterval(animationRefs.current[house]);
    }
    const duration = 1200; // ms — yavaş ve akıcı
    const steps = 60;
    const stepTime = duration / steps;
    let current = 0;
    animationRefs.current[house] = setInterval(() => {
      current++;
      const eased = from + (to - from) * (1 - Math.pow(1 - current / steps, 3)); // ease-out cubic
      setDisplayPoints(prev => ({ ...prev, [house]: Math.round(eased) }));
      if (current >= steps) {
        clearInterval(animationRefs.current[house]);
        setDisplayPoints(prev => ({ ...prev, [house]: to }));
      }
    }, stepTime);
  };

  useEffect(() => {
    (Object.keys(housePoints) as Array<keyof typeof housePoints>).forEach(house => {
      const prev = prevHousePoints.current[house];
      const next = housePoints[house];
      if (prev !== next) {
        animatePointChange(house, prev, next);
      }
    });
    prevHousePoints.current = { ...housePoints };
  }, [housePoints]);

  useEffect(() => {
    if (gameState?.playerHouse) {
      setPlayerHouse(gameState.playerHouse);
    }
  }, [gameState]);

  useEffect(() => {
    if (activeCharacter?.house) {
      setPlayerHouse(activeCharacter.house.toLowerCase());
    }
  }, [activeCharacter]);

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
  const [showHouseSelection, setShowHouseSelection] = useState<boolean>(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [rawScheduleData, setRawScheduleData] = useState<any>(null);
  const scheduleData = useMemo(
    () => localizeScheduleData(rawScheduleData, language),
    [rawScheduleData, language],
  );
  const [currentLocation, setCurrentLocation] = useState<string>('gryffindor_tower');
  const [displayLocation, setDisplayLocation] = useState<string>('gryffindor_tower');
  const bgOpacity = useRef(new Animated.Value(1)).current;
  const [showSchedule, setShowSchedule] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const canSend = useMemo(() => !isLoading, [isLoading]);

  useEffect(() => {
    if (!activeCharacter) return;
    if (historyLoaded) return; // history yüklendiyse dokunma
    if (activeCharacter.house) return; // house varsa skip
    
    const firstMes = getFirstMessage(0, language);
    const personalizedMessage = firstMes.replace(/\{\{user\}\}/g, userName || '');
    setMessages([createMessage('ai', personalizedMessage)]);
    setShowHouseSelection(true);
  }, [setMessages, userName, activeCharacter, historyLoaded, language]);

  useEffect(() => {
    setTipIndex(0);
  }, [language]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % inputTips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [inputTips.length]);

  useEffect(() => {
    if (!sessionId) return;
    if (historyLoaded) return;

    const loadHistory = async () => {
      try {
        const res = await fetch(`https://hogwarts-2.onrender.com/api/history?session_id=${encodeURIComponent(sessionId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const msgs: any[] = data.messages || [];

        setHistoryLoaded(true);

        if (msgs.length === 0) {
          return;
        }

        const loaded: Message[] = msgs.map((m: any) => ({
          id: Math.random().toString(36).slice(2),
          role: m.role === 'user' ? 'user' : 'ai',
          text: m.content,
          characterName: m.character_name || undefined,
          timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
        }));

        setMessages(loaded);
        setShowHouseSelection(false);

        // Eğer house yoksa ama history varsa — house seçimi gösterme
        // History varsa oyuncu zaten ev seçmişti demektir
        if (activeCharacter && !activeCharacter.house) {
          // game_state'ten house'u çek
          try {
            const gsRes = await fetch(`https://hogwarts-2.onrender.com/api/house-points?session_id=${encodeURIComponent(sessionId)}`);
            if (gsRes.ok) {
              const gsData = await gsRes.json();
              const ph = gsData.game_state?.player_house;
              if (ph) {
                // activeCharacter'ı güncelle
                const updatedChar = { ...activeCharacter, house: ph };
                // AppContext'teki setCharacters veya updateCharacter fonksiyonunu kullan
                // Eğer yoksa localStorage'ı direkt güncelle:
                const chars = JSON.parse(localStorage.getItem('hp_characters') || '[]');
                const updated = chars.map((c: any) => c.id === activeCharacter.id ? { ...c, house: ph } : c);
                localStorage.setItem('hp_characters', JSON.stringify(updated));
              }
            }
          } catch {}
        }
      } catch (e) {
        console.error('History load error:', e);
      }
    };

    loadHistory();
  }, [sessionId, historyLoaded]);

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

    if (isLoading) {
      return;
    }

    const nextMessages = trimmed
      ? [...messages, createMessage('user', trimmed)]
      : [...messages];

    setMessages(nextMessages);
    setInputText('');
    setInputHeight(MIN_INPUT_HEIGHT);
    setIsLoading(true);

    try {
      const aiResponse = await sendAiMessage(nextMessages, userName, hogwartsHouse, sessionId, characterProfile, playerAttraction);
      if (aiResponse.housePoints) applyHousePoints(aiResponse.housePoints);
      scheduleHousePointsRefresh();
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
      scheduleHousePointsRefresh();
      setTimeout(() => fetchSchedule(), 2000);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages([
        ...nextMessages,
        createMessage('ai', t(language, 'errorMessage')),
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
    if (activeCharacter) {
      const updatedChar = { ...activeCharacter, house };
      saveCharacterToDB(updatedChar, sessionId);
    }
    setPlayerHouse(house.toLowerCase());
    setShowHouseSelection(false);

    // Call backend to set player house
    try {
      await fetch('https://hogwarts-2.onrender.com/api/set-house', {
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
      const response = await sendAiMessage(nextMessages, userName, house, sessionId, characterProfile, playerAttraction);
      if (response.housePoints) applyHousePoints(response.housePoints);
      scheduleHousePointsRefresh();
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
      scheduleHousePointsRefresh();
      setTimeout(() => fetchSchedule(), 2000);
    } catch (error) {
      console.error('AI Error:', error);
      setMessages([
        ...nextMessages,
        createMessage('ai', t(language, 'errorMessage')),
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

  const fetchHousePoints = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`https://hogwarts-2.onrender.com/api/house-points?session_id=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.points_floor_started_at) {
        const startedMs = Date.parse(data.points_floor_started_at);
        if (Number.isFinite(startedMs)) {
          pointsFloorStartedAtRef.current = startedMs;
        }
      }
      if (data.points) applyHousePoints(data.points);
      if (data.game_state?.player_house) {
        setPlayerHouse(data.game_state.player_house);
      }
    } catch {}
  };

  const fetchSchedule = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `https://hogwarts-2.onrender.com/api/schedule?session_id=${encodeURIComponent(sessionId)}&language=${language}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setRawScheduleData(data);
      if (data.location) setCurrentLocation(data.location);
    } catch {}
  };

  const fetchLocation = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `https://hogwarts-2.onrender.com/api/schedule?session_id=${encodeURIComponent(sessionId)}&language=${language}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.location) setCurrentLocation(data.location);
    } catch {}
  };

  useEffect(() => {
    if (!sessionId) return;
    fetchSchedule();
    fetchLocation();
  }, [sessionId, language]);

  useEffect(() => {
    Animated.timing(bgOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setDisplayLocation(currentLocation);
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    });
  }, [currentLocation]);

  useEffect(() => {
    if (!sessionId) return;
    fetchHousePoints();

    const interval = setInterval(() => {
      fetchHousePoints();
    }, HOUSE_POINTS_POLL_MS);

    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.overlay}>
        <Animated.Image
          source={LOCATION_BACKGROUNDS[displayLocation] ?? LOCATION_BACKGROUNDS.gryffindor_tower}
          style={{
            ...StyleSheet.absoluteFillObject,
            width: '100%',
            height: '100%',
            opacity: bgOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1.0],
            }),
          } as any}
          resizeMode="cover"
        />
        <View style={styles.backgroundDarkOverlay} />
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.screen, { position: 'relative' }]}>
            {/* Sol panel: 1. ve 2. sıra */}
            <HousePointsPanel
              displayPoints={displayPoints}
              housePoints={housePoints}
              playerHouse={playerHouse}
              side="left"
              headerHeight={64}
            />

            {/* Sağ panel: 3. ve 4. sıra */}
            <HousePointsPanel
              displayPoints={displayPoints}
              housePoints={housePoints}
              playerHouse={playerHouse}
              side="right"
              headerHeight={64}
            />

            <View style={styles.header}>
              <Text style={styles.headerTitle}>{NARRATOR_NAME}</Text>
              <Text style={styles.headerSubtitle}>{t(language, 'narratorSubtitle')}</Text>
            </View>

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) =>
                item.role === 'ai' ? (
                  <AIMessageBubble
                    item={item}
                    sessionId={sessionId}
                    editingId={editingId}
                    editText={editText}
                    setEditText={setEditText}
                    setEditingId={setEditingId}
                    setMessages={setMessages}
                    scheduleData={scheduleData}
                    language={language}
                  />
                ) : (
                  <MessageBubble
                    item={item}
                    hogwartsHouse={hogwartsHouse || playerHouse}
                    sessionId={sessionId}
                    editingId={editingId}
                    editText={editText}
                    setEditText={setEditText}
                    setEditingId={setEditingId}
                    setMessages={setMessages}
                  />
                )
              }
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              maintainVisibleContentPosition={null}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.messageSeparator} />}
              keyboardShouldPersistTaps="handled"
              inverted={false}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={isLoading ? <TypingBubble /> : null}
              ListEmptyComponent={
                <View style={styles.emptyStateWrap}>
                  <Text style={styles.emptyStateTitle}>{NARRATOR_NAME}</Text>
                  <Text style={styles.emptyStateSubtitle}>{t(language, 'emptyStateSubtitle')}</Text>
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
                <Text style={styles.inputTip}>{inputTips[tipIndex]}</Text>
                <View style={[styles.inputBox, styles.inputBoxSpacing]}>
                  <TextInput
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={isWeb ? undefined : handleSend}
                    onKeyPress={isWeb ? handleKeyPress : undefined}
                    onContentSizeChange={handleContentSizeChange}
                    placeholder={t(language, 'inputPlaceholderWeb')}
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

            <TimeStrip data={scheduleData} onPress={() => setShowSchedule(true)} language={language} />

            {showSchedule && (
              <SchedulePopup data={scheduleData} onClose={() => setShowSchedule(false)} language={language} />
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
  },
  backgroundDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
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
    paddingHorizontal: 80,
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
    alignItems: 'stretch',
    maxWidth: 900,
    alignSelf: 'center',
    width: '100%',
  },
  messageSeparator: {
    height: 14,
  },
  userRow: {
    width: '100%',
    alignItems: 'flex-end',
  },
  userBubble: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexShrink: 1,
    maxWidth: '72%',
    alignSelf: 'flex-end',
    marginRight: 16,
    position: 'relative',
  },
  userEditInput: {
    minWidth: 120,
    textAlignVertical: 'top',
  },
  userMessageActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginRight: 16,
    alignSelf: 'flex-end',
  },
  userActionSave: {
    color: '#c9a84c',
    fontSize: 13,
  },
  userActionCancel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
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
  aiErrorFallback: {
    color: 'rgba(255,255,255,0.3)',
    fontStyle: 'italic',
    fontSize: 12,
    padding: 8,
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
    position: 'relative',
  },
  aiEditInput: {
    color: '#fff',
    minHeight: 80,
    textAlignVertical: 'top',
    width: '100%',
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
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
  aiDialogueText: {
    color: '#e8b86d',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  aiPlainText: {
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },
  aiItalicText: {
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.85)',
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
    paddingHorizontal: 80,
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
