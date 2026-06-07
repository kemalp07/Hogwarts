import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  Platform,
  ImageBackground,
  TextInput,
} from 'react-native';
import { useAppContext, Character, saveCharacterToDB } from '../context/AppContext';
import { getStepOptions, getStepTitle, t } from '../i18n/translations';

type CharacterCreationScreenProps = {
  navigation: any;
};

const STEPS = [
  'name', 'gender', 'traits', 'origin', 'height',
  'hairColor', 'fear', 'hobby', 'secretTrait', 'attraction',
  'summary',
] as const;

type StepKey = (typeof STEPS)[number];

export const CharacterCreationScreen: React.FC<CharacterCreationScreenProps> = ({ navigation }) => {
  const { characters, setCharacters, setActiveCharacter, language } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [attraction, setAttraction] = useState('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [origin, setOrigin] = useState('');
  const [height, setHeight] = useState('');
  const [hairColor, setHairColor] = useState('');
  const [fear, setFear] = useState('');
  const [hobby, setHobby] = useState('');
  const [secretTrait, setSecretTrait] = useState('');

  const stepKey = STEPS[currentStep];

  useEffect(() => {
    if (Platform.OS === 'web') {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  const handleTraitToggle = (trait: string) => {
    if (selectedTraits.includes(trait)) {
      setSelectedTraits(selectedTraits.filter((t) => t !== trait));
    } else if (selectedTraits.length < 2) {
      setSelectedTraits([...selectedTraits, trait]);
    }
  };

  const isStepValid = (step: StepKey): boolean => {
    switch (step) {
      case 'name':
        return name.trim().length > 0;
      case 'gender':
        return gender !== '';
      case 'traits':
        return selectedTraits.length === 2;
      case 'origin':
        return origin !== '';
      case 'height':
        return height !== '';
      case 'hairColor':
        return hairColor !== '';
      case 'fear':
        return fear !== '';
      case 'hobby':
        return hobby !== '';
      case 'secretTrait':
        return secretTrait !== '';
      case 'attraction':
        return attraction !== '';
      case 'summary':
        return (
          name.trim().length > 0 &&
          gender !== '' &&
          selectedTraits.length === 2 &&
          origin !== '' &&
          height !== '' &&
          hairColor !== '' &&
          fear !== '' &&
          hobby !== '' &&
          secretTrait !== '' &&
          attraction !== ''
        );
      default:
        return false;
    }
  };

  const handleContinue = async () => {
    if (!isStepValid('summary')) return;

    const newCharacter: Character = {
      id: crypto.randomUUID(),
      name: name.trim(),
      gender,
      traits: selectedTraits,
      origin,
      height,
      hairColor,
      fear,
      hobby,
      secretTrait,
      attraction,
      house: '',
      sessionId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    setCharacters([...characters, newCharacter]);
    setActiveCharacter(newCharacter);
    await saveCharacterToDB(newCharacter, newCharacter.sessionId);
    navigation.navigate('Wand');
  };

  const handleNext = () => {
    if (!isStepValid(stepKey)) return;
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleContinue();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const renderOptionGrid = (
    options: readonly string[],
    selected: string | string[],
    onSelect: (value: string) => void,
  ) => (
    <View style={styles.optionsContainer}>
      {options.map((option) => {
        const isSelected = Array.isArray(selected)
          ? selected.includes(option)
          : selected === option;

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

  const renderStepContent = () => {
    switch (stepKey) {
      case 'name':
        return (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t(language, 'namePlaceholder')}
            placeholderTextColor="rgba(245, 220, 180, 0.4)"
            style={styles.nameInput}
            autoFocus
            maxLength={30}
          />
        );
      case 'gender':
        return renderOptionGrid(getStepOptions(language, 'gender'), gender, setGender);
      case 'traits':
        return renderOptionGrid(getStepOptions(language, 'traits'), selectedTraits, handleTraitToggle);
      case 'origin':
        return renderOptionGrid(getStepOptions(language, 'origin'), origin, setOrigin);
      case 'height':
        return renderOptionGrid(getStepOptions(language, 'height'), height, setHeight);
      case 'hairColor':
        return renderOptionGrid(getStepOptions(language, 'hairColor'), hairColor, setHairColor);
      case 'fear':
        return renderOptionGrid(getStepOptions(language, 'fear'), fear, setFear);
      case 'hobby':
        return renderOptionGrid(getStepOptions(language, 'hobby'), hobby, setHobby);
      case 'secretTrait':
        return renderOptionGrid(getStepOptions(language, 'secretTrait'), secretTrait, setSecretTrait);
      case 'attraction':
        return renderOptionGrid(getStepOptions(language, 'attraction'), attraction, setAttraction);
      case 'summary':
        return (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryName}>{name}</Text>
            <Text style={styles.summaryItem}>⚔️ {gender}</Text>
            <Text style={styles.summaryItem}>✨ {selectedTraits.join(', ')}</Text>
            <Text style={styles.summaryItem}>🏠 {origin}</Text>
            <Text style={styles.summaryItem}>📏 {height}</Text>
            <Text style={styles.summaryItem}>💇 {hairColor}</Text>
            <Text style={styles.summaryItem}>😨 {fear}</Text>
            <Text style={styles.summaryItem}>🎯 {hobby}</Text>
            <Text style={styles.summaryItem}>💫 {secretTrait}</Text>
            <Text style={styles.summaryItem}>❤️ {attraction}</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const nextDisabled = !isStepValid(stepKey);
  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../assets/hogwarts_clean.png')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.4 }}
      >
        <View style={styles.overlay} />
        <View style={styles.content}>
          <Text style={styles.title}>{t(language, 'createCharacterTitle')}</Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentStep + 1) / STEPS.length) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {currentStep + 1} / {STEPS.length}
            </Text>
          </View>

          <Text style={styles.stepTitle}>{getStepTitle(language, stepKey)}</Text>

          <View style={styles.stepBody}>{renderStepContent()}</View>

          <View style={styles.buttonRow}>
            {currentStep > 0 && (
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Text style={styles.backButtonText}>{t(language, 'back')}</Text>
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
                {isLastStep ? t(language, 'proceedToWand') : t(language, 'next')}
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
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    color: '#F5E6C8',
    fontFamily: 'Cinzel, serif',
    letterSpacing: 2,
    marginBottom: 24,
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
  nameInput: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(26, 18, 8, 0.85)',
    borderWidth: 1,
    borderColor: '#c9a84c',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
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
  summaryCard: {
    backgroundColor: 'rgba(26, 18, 8, 0.9)',
    borderWidth: 1,
    borderColor: '#c9a84c',
    borderRadius: 12,
    padding: 24,
    gap: 10,
  },
  summaryName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#c9a84c',
    fontFamily: 'Cinzel, serif',
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 15,
    color: '#F5E6C8',
    lineHeight: 22,
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
