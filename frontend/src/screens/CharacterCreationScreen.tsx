import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  Platform,
  ImageBackground,
  ScrollView,
} from 'react-native';

type CharacterCreationScreenProps = {
  navigation: any;
};

const GENDERS = ['Erkek', 'Kadın', 'Belirtmiyorum'];
const TRAITS = ['Cesur', 'Zeki', 'Sadık', 'Gizemli', 'Hırslı', 'Merhametli', 'Yaratıcı', 'Kararlı'];
const ORIGINS = ['Muggle ailesi', 'Büyücü ailesi', 'Yarı kan'];
const HEIGHTS = ['Kısa', 'Orta boy', 'Uzun'];
const HAIR_COLORS = ['Siyah', 'Kahverengi', 'Sarı', 'Kızıl', 'Beyaz'];
const FEARS = ['Karanlık', 'Yükseklik', 'Yalnızlık', 'Başarısızlık', 'Ölüm'];
const HOBBIES = ['Quidditch', 'Kitap okuma', 'Büyü araştırma', 'Müzik', 'Doğa'];
const SECRET_TRAITS = ['Aslında çok kırılgansın', 'Derin bir sırrın var', 'Geçmişinde karanlık bir olay var', 'Gizli bir yeteneğin var', 'Biri seni takip ediyor'];

export const CharacterCreationScreen: React.FC<CharacterCreationScreenProps> = ({ navigation }) => {
  const [gender, setGender] = useState('');
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [origin, setOrigin] = useState('');
  const [height, setHeight] = useState('');
  const [hairColor, setHairColor] = useState('');
  const [fear, setFear] = useState('');
  const [hobby, setHobby] = useState('');
  const [secretTrait, setSecretTrait] = useState('');

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
      setSelectedTraits(selectedTraits.filter(t => t !== trait));
    } else if (selectedTraits.length < 2) {
      setSelectedTraits([...selectedTraits, trait]);
    }
  };

  const handleContinue = () => {
    if (!gender || selectedTraits.length === 0 || !origin || !height || !hairColor || !fear || !hobby || !secretTrait) return;

    const character = {
      gender,
      traits: selectedTraits,
      origin,
      height,
      hairColor,
      fear,
      hobby,
      secretTrait,
    };

    localStorage.setItem('hp_character', JSON.stringify(character));
    navigation.navigate('Chat');
  };

  const isButtonDisabled = !gender || selectedTraits.length === 0 || !origin || !height || !hairColor || !fear || !hobby || !secretTrait;

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground 
        source={require('../../assets/hogwarts_clean.png')} 
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.4 }}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Karakterini Oluştur</Text>
            <Text style={styles.subtitle}>Kendini tanıt, genç büyücü</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cinsiyet</Text>
              <View style={styles.optionsRow}>
                {GENDERS.map((g) => (
                  <Pressable
                    key={g}
                    style={[
                      styles.optionButton,
                      gender === g && styles.optionButtonSelected,
                    ]}
                    onPress={() => setGender(g)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        gender === g && styles.optionTextSelected,
                      ]}
                    >
                      {g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kişilik Özellikleri (2 seç)</Text>
              <View style={styles.traitsRow}>
                {TRAITS.map((trait) => (
                  <Pressable
                    key={trait}
                    style={[
                      styles.traitButton,
                      selectedTraits.includes(trait) && styles.traitButtonSelected,
                    ]}
                    onPress={() => handleTraitToggle(trait)}
                  >
                    <Text
                      style={[
                        styles.traitText,
                        selectedTraits.includes(trait) && styles.traitTextSelected,
                      ]}
                    >
                      {trait}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Köken</Text>
              <View style={styles.optionsRow}>
                {ORIGINS.map((o) => (
                  <Pressable
                    key={o}
                    style={[
                      styles.optionButton,
                      origin === o && styles.optionButtonSelected,
                    ]}
                    onPress={() => setOrigin(o)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        origin === o && styles.optionTextSelected,
                      ]}
                    >
                      {o}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Boy</Text>
              <View style={styles.optionsRow}>
                {HEIGHTS.map((h) => (
                  <Pressable
                    key={h}
                    style={[
                      styles.optionButton,
                      height === h && styles.optionButtonSelected,
                    ]}
                    onPress={() => setHeight(h)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        height === h && styles.optionTextSelected,
                      ]}
                    >
                      {h}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Saç Rengi</Text>
              <View style={styles.optionsRow}>
                {HAIR_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    style={[
                      styles.optionButton,
                      hairColor === c && styles.optionButtonSelected,
                    ]}
                    onPress={() => setHairColor(c)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        hairColor === c && styles.optionTextSelected,
                      ]}
                    >
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Korkusu</Text>
              <View style={styles.optionsRow}>
                {FEARS.map((f) => (
                  <Pressable
                    key={f}
                    style={[
                      styles.optionButton,
                      fear === f && styles.optionButtonSelected,
                    ]}
                    onPress={() => setFear(f)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        fear === f && styles.optionTextSelected,
                      ]}
                    >
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hobisi</Text>
              <View style={styles.optionsRow}>
                {HOBBIES.map((h) => (
                  <Pressable
                    key={h}
                    style={[
                      styles.optionButton,
                      hobby === h && styles.optionButtonSelected,
                    ]}
                    onPress={() => setHobby(h)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        hobby === h && styles.optionTextSelected,
                      ]}
                    >
                      {h}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gizli Özellik</Text>
              <View style={styles.optionsRow}>
                {SECRET_TRAITS.map((s) => (
                  <Pressable
                    key={s}
                    style={[
                      styles.optionButton,
                      secretTrait === s && styles.optionButtonSelected,
                    ]}
                    onPress={() => setSecretTrait(s)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        secretTrait === s && styles.optionTextSelected,
                      ]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[
                styles.button,
                isButtonDisabled && styles.buttonDisabled,
              ]}
              onPress={handleContinue}
              disabled={isButtonDisabled}
            >
              <Text
                style={[
                  styles.buttonText,
                  isButtonDisabled && styles.buttonTextDisabled,
                ]}
              >
                Devam Et
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0604',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    color: '#F5E6C8',
    fontFamily: 'Cinzel, serif',
    letterSpacing: 3,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(245, 220, 180, 0.55)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 32,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  section: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5E6C8',
    marginBottom: 12,
    letterSpacing: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(245, 220, 180, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: 'rgba(120, 50, 8, 0.9)',
    borderColor: 'rgba(245, 220, 180, 0.4)',
  },
  optionText: {
    color: 'rgba(245, 220, 180, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#F5E6C8',
    fontWeight: '600',
  },
  traitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  traitButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(245, 220, 180, 0.25)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  traitButtonSelected: {
    backgroundColor: 'rgba(120, 50, 8, 0.9)',
    borderColor: 'rgba(245, 220, 180, 0.4)',
  },
  traitText: {
    color: 'rgba(245, 220, 180, 0.7)',
    fontSize: 13,
    fontWeight: '500',
  },
  traitTextSelected: {
    color: '#F5E6C8',
    fontWeight: '600',
  },
  button: {
    width: '72%',
    maxWidth: 360,
    height: 48,
    backgroundColor: 'rgba(120, 50, 8, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 220, 180, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(60, 40, 10, 0.5)',
  },
  buttonText: {
    color: '#F5E6C8',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  buttonTextDisabled: {
    color: 'rgba(245, 220, 180, 0.4)',
  },
});
