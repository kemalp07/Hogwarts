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
  NARRATOR: require('../../assets/characters/sorting_hat.png'),
  HARRY: require('../../assets/characters/harry.png'),
  HERMIONE: require('../../assets/characters/hermione.png'),
  RON: require('../../assets/characters/ron.png'),
  SNAPE: require('../../assets/characters/snape.png'),
  DUMBLEDORE: require('../../assets/characters/dumbledore.png'),
  DRACO: require('../../assets/characters/draco.png'),
  HAGRID: require('../../assets/characters/hagrid.png'),
  MCGONAGALL: require('../../assets/characters/mcgonagall.png'),
  UMBRIDGE: require('../../assets/characters/umbridge.png'),
  VOLDEMORT: require('../../assets/characters/voldemort.png'),
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
  switch (house) {
    case 'Gryffindor':
      return '#8B0000';
    case 'Hufflepuff':
      return '#D97706';
    case 'Ravenclaw':
      return '#1E3A8A';
    case 'Slytherin':
      return '#166534';
    default:
      return '#888';
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

function TypingDots() {
  const firstDot = useRef(new Animated.Value(0.2)).current;
  const secondDot = useRef(new Animated.Value(0.2)).current;
  const thirdDot = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const animations = [
      { value: firstDot, delay: 0 },
      { value: secondDot, delay: 200 },
      { value: thirdDot, delay: 400 },
    ].map(({ value, delay }) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.2,
            duration: 250,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());

    return () => {
      animations.forEach((animation) => animation.stop());
    };
  }, [firstDot, secondDot, thirdDot]);

  return (
    <View style={styles.typingDotsRow}>
      <Animated.View style={[styles.typingDot, styles.typingDotSpacer, { opacity: firstDot }]} />
      <Animated.View style={[styles.typingDot, styles.typingDotSpacer, { opacity: secondDot }]} />
      <Animated.View style={[styles.typingDot, { opacity: thirdDot }]} />
    </View>
  );
}

function TypingBubble() {
  return (
    <View style={styles.aiRow}>
      <View style={styles.aiAvatar}>
        <Text style={styles.aiAvatarText}>{NARRATOR_SYMBOL}</Text>
      </View>
      <View style={styles.aiBubble}>
        <TypingDots />
      </View>
    </View>
  );
}

type MessageBubbleProps = {
  item: Message;
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
      const name = TAG_NAMES[currentTag] || (currentTag.startsWith('CHARACTER:') ? currentTag.slice(10) : currentTag);
      blocks.push({ tag: currentTag, name, content });
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
        const avatarSource = TAG_AVATARS[block.tag] ?? TAG_AVATARS.NARRATOR;

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

function MessageBubble({ item }: MessageBubbleProps) {
  if (item.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={[styles.messageText, styles.userMessageText]}>{item.text}</Text>
        </View>
      </View>
    );
  }

  return renderAIMessage(item);
}

export const ChatScreen = () => {
const {
  userName,
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  hogwartsHouse,
  setHogwartsHouse,
} = useAppContext();

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
  const [showHouseSelection, setShowHouseSelection] = useState(false);

  const canSend = useMemo(() => inputText.trim().length > 0 && !isLoading, [inputText, isLoading]);

  useEffect(() => {
    const firstMes = getFirstMessage(0);
    const personalizedMessage = firstMes.replace(/\{\{user\}\}/g, userName || '');
    setMessages([createMessage('ai', personalizedMessage)]);
    setShowHouseSelection(true);
  }, [setMessages, userName]);

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
      const aiResponse = await sendAiMessage(nextMessages, userName, hogwartsHouse);
      setMessages([
        ...nextMessages,
        createMessage('ai', aiResponse.text, aiResponse.characterName),
      ]);
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

    const userMsg = createMessage('user', `${house}!`);
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const response = await sendAiMessage(nextMessages, userName, house);
      setMessages([
        ...nextMessages,
        createMessage('ai', response.text, response.characterName),
      ]);
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

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (item.role === 'ai' ? renderAIMessage(item) : <MessageBubble item={item} />)}
              onContentSizeChange={() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }}
              maintainVisibleContentPosition={null}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.messageSeparator} />}
              keyboardShouldPersistTaps="handled"
              inverted={false}
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
                    <Text style={[styles.sendIcon, canSend && !isLoading ? styles.sendIconActive : styles.sendIconDisabled]}>↑</Text>
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
    backgroundColor: 'rgba(146, 64, 14, 0.9)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: '85%',
    backgroundColor: 'rgba(120, 50, 8, 0.95)',
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
    maxWidth: '85%',
    flexShrink: 1,
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
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 18,
    paddingVertical: 2,
  },
  typingDotSpacer: {
    marginRight: 6,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999999',
  },
});
