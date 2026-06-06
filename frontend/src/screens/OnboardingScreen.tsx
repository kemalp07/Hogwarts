import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  Platform,
  ImageBackground,
  Image,
  ScrollView,
} from 'react-native';
import { useAppContext, Character } from '../context/AppContext';

type OnboardingScreenProps = {
  navigation: any;
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { characters, setCharacters, setActiveCharacter } = useAppContext();

  useEffect(() => {
    if (Platform.OS === 'web') {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  const handleSelectCharacter = (character: Character) => {
    setActiveCharacter(character);
    navigation.navigate('Chat');
  };

  const handleNewCharacter = () => {
    navigation.navigate('CharacterCreation');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground 
        source={require('../../assets/hogwarts_clean.png')} 
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.4 }}
      >
        <View style={styles.content}>
        <Image 
          source={require('../../assets/hogwarts_crest.png')} 
          style={styles.crestImage}
        />

        <Text style={styles.title}>Hogwarts'a Hoş Geldin</Text>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {characters.length === 0 ? (
            <View style={styles.centerContent}>
              <Text style={styles.subtitle}>Henüz karakterin yok</Text>
              <Pressable
                style={styles.button}
                onPress={handleNewCharacter}
              >
                <Text style={styles.buttonText}>Yeni Karakter Oluştur</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.characterList}>
              {characters.map((character) => (
                <Pressable
                  key={character.id}
                  style={styles.characterCard}
                  onPress={() => handleSelectCharacter(character)}
                >
                  <Text style={styles.characterName}>{character.name}</Text>
                  <View style={styles.characterDetails}>
                    <Text style={styles.characterHouse}>{character.house || 'Ev seçilmedi'}</Text>
                    <Text style={styles.characterTraits}>
                      {character.traits.slice(0, 2).join(', ')}
                    </Text>
                  </View>
                </Pressable>
              ))}
              <Pressable
                style={styles.newCharacterButton}
                onPress={handleNewCharacter}
              >
                <Text style={styles.newCharacterButtonText}>+ Yeni Karakter</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  crestImage: {
    width: 350,
    height: 350,
    marginBottom: 175,
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
    marginBottom: 24,
    fontStyle: 'italic',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  centerContent: {
    alignItems: 'center',
  },
  characterList: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  characterCard: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(245, 220, 180, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  characterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5E6C8',
    marginBottom: 4,
  },
  characterDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  characterHouse: {
    fontSize: 12,
    color: 'rgba(245, 220, 180, 0.7)',
    fontStyle: 'italic',
  },
  characterTraits: {
    fontSize: 11,
    color: 'rgba(245, 220, 180, 0.5)',
  },
  newCharacterButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(245, 220, 180, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  newCharacterButtonText: {
    fontSize: 14,
    color: 'rgba(245, 220, 180, 0.7)',
    fontWeight: '500',
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
  },
  buttonText: {
    color: '#F5E6C8',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
});
