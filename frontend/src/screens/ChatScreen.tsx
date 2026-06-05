import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
// video background removed for seamless solid background
import { useAppContext, Message } from '../context/AppContext';
import { getFirstMessage } from '../services/characterCard';
import { sendMessage as sendAiMessage } from '../services/aiService';

const NARRATOR_NAME = 'Hogwarts';
const NARRATOR_SUBTITLE = 'Büyücü Dünyası';
const NARRATOR_SYMBOL = '⚡';
const HOUSES = ['Gryffindor', 'Hufflepuff', 'Ravenclaw', 'Slytherin'] as const;
const MIN_INPUT_HEIGHT = 36;
const MAX_INPUT_HEIGHT = 100;

const WEB_INPUT_RESET =
  Platform.OS === 'web'
    ? ({ outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none' } as any)
    : undefined;

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

type MessageBubbleProps = {
  item: Message;
};

function parseAIMessage(text: string): React.ReactNode {
  const paragraphs = text.split(/\n\n+/).filter((paragraph) => paragraph.trim() !== '');

  return (
    <>
      {paragraphs.map((paragraph, pi) => {
        const lines = paragraph.split('\n').filter((line) => line.trim() !== '');

        return (
          <View key={pi} style={styles.aiParagraph}>
            {lines.map((line, li) => {
              // 1) Dialogue with speaker: Name: "dialogue"
              const dialogueMatch = line.match(/^([A-ZÇĞİÖŞÜa-zçğışöü\s]+):\s*"(.+)"$/);
              if (dialogueMatch) {
                return (
                  <Text key={`${pi}-${li}`} style={styles.aiLine}>
                    <Text style={styles.aiSpeakerText}>{dialogueMatch[1]}: </Text>
                    <Text style={styles.aiDialogueText}>"{dialogueMatch[2]}"</Text>
                  </Text>
                );
              }

              // 2) Quote-only line: "some dialogue"
              const quoteOnlyMatch = line.match(/^"(.+)"$/);
              if (quoteOnlyMatch) {
                return (
                  <Text key={`${pi}-${li}`} style={styles.aiLine}>
                    <Text style={styles.aiDialogueText}>"{quoteOnlyMatch[1]}"</Text>
                  </Text>
                );
              }

              // 3) Line contains quoted segments somewhere: color quoted parts amber/orange
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

                      // inside non-quoted piece, preserve italic parsing
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

              // 4) Default: preserve existing italic parsing
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

  return (
    <View style={styles.aiRow}>
      <View style={styles.aiAvatar}>
        <Text style={styles.aiAvatarText}>{NARRATOR_SYMBOL}</Text>
      </View>
      <View style={styles.aiBubble}>
        <View style={styles.aiMessageRoot}>{parseAIMessage(item.text)}</View>
      </View>
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

export const ChatScreen: React.FC = () => {
  const {
    userName,
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    hogwartsHouse,
    setHogwartsHouse,
  } = useAppContext();
  const isWeb = Platform.OS === 'web';
  const flatListRef = useRef<FlatList<Message>>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // background video removed; using solid background color instead

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

  // Auto-scroll on messages or loading change
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return () => cancelAnimationFrame(frame);
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
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.screen}>
            <View style={styles.header}>
              <View style={styles.headerAvatar}>
                <Text style={styles.headerInitial}>{NARRATOR_SYMBOL}</Text>
              </View>
              <View style={styles.headerTextWrap}>
                <Text style={styles.headerTitle}>{NARRATOR_NAME}</Text>
                <Text style={styles.headerSubtitle}>{NARRATOR_SUBTITLE}</Text>
              </View>
            </View>

            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <MessageBubble item={item} />}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlay: {
    flex: 1,
    backgroundColor: '#090703',
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    height: 56,
    backgroundColor: 'rgba(10, 6, 2, 0.8)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(245, 230, 200, 0.15)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F5E6C8',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#CBB38C',
    marginTop: 1,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  aiAvatarText: {
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
    lineHeight: 22,
    color: '#FFFFFF',
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
    color: '#92400E',
    lineHeight: 22,
  },
  aiDialogueText: {
    color: '#92400E',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  aiPlainText: {
    color: '#F5E6C8',
    lineHeight: 22,
  },
  aiItalicText: {
    fontStyle: 'italic',
    color: '#6B7280',
    lineHeight: 22,
  },
  houseSelectionArea: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(245, 230, 200, 0.12)',
    paddingHorizontal: 16,
    paddingTop: 10,
    alignItems: 'center',
  },
  inputBoxSpacing: {
    marginBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  inputBox: {
    backgroundColor: 'rgba(20, 12, 4, 0.7)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120, 53, 15, 0.6)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 760,
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
    backgroundColor: '#E0E0E0',
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
