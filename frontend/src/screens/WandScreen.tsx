import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  Platform,
  ImageBackground,
} from 'react-native';
import { useAppContext, saveCharacterToDB } from '../context/AppContext';

type WandScreenProps = {
  navigation: any;
};

const WAND_STEPS = ['wood', 'core', 'length', 'flexibility'] as const;
type WandStepKey = (typeof WAND_STEPS)[number];

const WAND_STEP_TITLES: Record<WandStepKey, string> = {
  wood: 'Asanın ağacı...',
  core: 'Asanın özü...',
  length: 'Asanın uzunluğu...',
  flexibility: 'Asanın esnekliği...',
};

const WAND_OPTIONS: Record<WandStepKey, string[]> = {
  wood: ['Akasya', 'Meşe', 'Çam', 'Karaağaç', 'Söğüt', 'Gürgen', 'Kiraz', 'Kayın'],
  core: ['Ejderha teli', 'Anka tüyü', 'Tek boynuzlu at kılı'],
  length: ['9 inç', '10 inç', '11 inç', '12 inç', '13 inç'],
  flexibility: ['Katı', 'Orta', 'Esnek'],
};

export const WandScreen: React.FC<WandScreenProps> = ({ navigation }) => {
  const { activeCharacter, setActiveCharacter, setCharacters } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<WandStepKey, string>>({
    wood: '',
    core: '',
    length: '',
    flexibility: '',
  });

  const stepKey = WAND_STEPS[currentStep];

  useEffect(() => {
    if (Platform.OS === 'web') {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  const isStepValid = (step: WandStepKey) => selections[step] !== '';

  const handleContinue = async () => {
    if (!activeCharacter) return;
    if (!WAND_STEPS.every((step) => selections[step] !== '')) return;

    const { wood, core, length, flexibility } = selections;
    const wand = `${wood} asası, ${core}, ${length}, ${flexibility}`;
    const updated = { ...activeCharacter, wand };

    setCharacters((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)),
    );
    setActiveCharacter(updated);
    await saveCharacterToDB(updated, updated.sessionId);
    navigation.navigate('Chat');
  };

  const handleNext = () => {
    if (!isStepValid(stepKey)) return;
    if (currentStep < WAND_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleContinue();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderOptionGrid = (options: string[], selected: string, onSelect: (value: string) => void) => (
    <View style={styles.optionsContainer}>
      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <Pressable
            key={option}
            style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
            onPress={() => onSelect(option)}
          >
            <Text style={[styles.optionButtonText, isSelected && styles.optionButtonTextSelected]}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const nextDisabled = !isStepValid(stepKey);
  const isLastStep = currentStep === WAND_STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../assets/hogwarts_clean.png')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.4 }}
      >
        <View style={styles.overlay} />
        <View style={styles.content}>
          <View style={styles.quoteBlock}>
            <Text style={styles.quoteText}>"Asa sahibini seçer..."</Text>
            <Text style={styles.quoteAuthor}>— Garrick Ollivander</Text>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentStep + 1) / WAND_STEPS.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentStep + 1} / {WAND_STEPS.length}
            </Text>
          </View>

          <Text style={styles.stepTitle}>{WAND_STEP_TITLES[stepKey]}</Text>

          <View style={styles.stepBody}>
            {renderOptionGrid(
              WAND_OPTIONS[stepKey],
              selections[stepKey],
              (value) => setSelections((prev) => ({ ...prev, [stepKey]: value })),
            )}
          </View>

          <View style={styles.buttonRow}>
            {currentStep > 0 && (
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>Geri</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.nextButton, nextDisabled && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={nextDisabled}
            >
              <Text
                style={[
                  styles.nextButtonText,
                  isLastStep && styles.nextButtonTextCompact,
                  nextDisabled && styles.nextButtonTextDisabled,
                ]}
                numberOfLines={1}
              >
                {isLastStep ? "Hogwarts'a Başla" : 'İleri'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1208',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 18, 8, 0.55)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  quoteBlock: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  quoteText: {
    fontSize: 20,
    fontStyle: 'italic',
    textAlign: 'center',
    color: 'rgba(245, 220, 180, 0.85)',
    fontFamily: 'Cinzel, serif',
    letterSpacing: 1,
    lineHeight: 30,
  },
  quoteAuthor: {
    marginTop: 10,
    fontSize: 13,
    textAlign: 'center',
    color: 'rgba(201, 168, 76, 0.65)',
    fontFamily: 'Cinzel, serif',
    letterSpacing: 1,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 420,
    marginBottom: 32,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(201, 168, 76, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#c9a84c',
    borderRadius: 3,
  },
  progressText: {
    marginTop: 8,
    textAlign: 'center',
    color: 'rgba(245, 220, 180, 0.6)',
    fontSize: 13,
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F5E6C8',
    textAlign: 'center',
    fontFamily: 'Cinzel, serif',
    letterSpacing: 1,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  stepBody: {
    width: '100%',
    maxWidth: 420,
    flexGrow: 0,
    marginBottom: 32,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  optionButton: {
    width: '45%',
    height: 48,
    backgroundColor: 'rgba(26, 18, 8, 0.85)',
    borderWidth: 1,
    borderColor: '#c9a84c',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  optionButtonSelected: {
    backgroundColor: '#c9a84c',
    borderColor: '#c9a84c',
  },
  optionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  optionButtonTextSelected: {
    color: '#1a1208',
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    width: 140,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: 'rgba(245, 220, 180, 0.8)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
  },
  nextButton: {
    width: 180,
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: '#c9a84c',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: 'rgba(60, 40, 10, 0.5)',
  },
  nextButtonText: {
    color: '#1a1208',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  nextButtonTextCompact: {
    fontSize: 13,
  },
  nextButtonTextDisabled: {
    color: 'rgba(245, 220, 180, 0.4)',
  },
});
