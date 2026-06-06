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
  TouchableOpacity,
} from 'react-native';
import { useAppContext, Character, loadAllCharactersFromDB } from '../context/AppContext';

type OnboardingScreenProps = {
  navigation: any;
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { characters, setCharacters, setActiveCharacter } = useAppContext();
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const loadFromDb = async () => {
      const saved = localStorage.getItem('hp_characters');
      if (saved && JSON.parse(saved).length > 0) return;
      const fromDb = await loadAllCharactersFromDB();
      if (fromDb.length > 0) {
        setCharacters(fromDb);
      }
    };
    loadFromDb();
  }, [setCharacters]);

  const handleSelectCharacter = (character: Character) => {
    setActiveCharacter(character);
    navigation.navigate('Chat');
  };

  const handleNewCharacter = () => {
    navigation.navigate('CharacterCreation');
  };

  const handleDeleteCharacter = (character: any) => {
    setDeleteTarget(character);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`https://hogwarts-2.onrender.com/api/messages?session_id=${encodeURIComponent(deleteTarget.sessionId)}`, {
        method: 'DELETE',
      });
      const updated = characters.filter((c: any) => c.id !== deleteTarget.id);
      setCharacters(updated);
      localStorage.setItem('hp_characters', JSON.stringify(updated));
      const activeId = localStorage.getItem('hp_active_character_id');
      if (activeId === deleteTarget.id) {
        localStorage.removeItem('hp_active_character_id');
      }
    } catch (e) {
      console.error(e);
    }
    setDeleteTarget(null);
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
                style={styles.emptyButton}
                onPress={handleNewCharacter}
              >
                <Text style={styles.emptyButtonText}>Yeni Karakter Oluştur</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.characterList}>
              {characters.map((character) => (
                <View key={character.id} style={styles.characterCard}>
                  <Pressable
                    style={styles.characterCardContent}
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
                  <Pressable
                    style={styles.deleteButton}
                    onPress={() => handleDeleteCharacter(character)}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {characters.length < 3 && (
                <Pressable
                  style={styles.newCharacterButton}
                  onPress={handleNewCharacter}
                >
                  <Text style={styles.newCharacterButtonText}>+ Yeni Karakter</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>
      </View>
      </ImageBackground>
      {deleteTarget && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Karakteri Sil</Text>
            <Text style={styles.modalText}>
              "{deleteTarget.name}" ve tüm sohbet geçmişi silinecek. Emin misin?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDelete} onPress={confirmDelete}>
                <Text style={styles.modalDeleteText}>Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  characterCardContent: {
    flex: 1,
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
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 100, 100, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  deleteButtonText: {
    color: 'rgba(255, 150, 150, 0.8)',
    fontSize: 18,
    fontWeight: 'bold',
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
  emptyButton: {
    alignSelf: 'center',
    height: 52,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(120, 50, 8, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 220, 180, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  emptyButtonText: {
    color: '#F5E6C8',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: 'Cinzel, serif',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modalBox: {
    backgroundColor: 'rgba(15, 10, 5, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(245, 220, 180, 0.2)',
    borderRadius: 16,
    padding: 28,
    width: '85%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F5E6C8',
    fontFamily: 'Cinzel, serif',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: 'rgba(245, 220, 180, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 220, 180, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'rgba(245, 220, 180, 0.6)',
    fontSize: 15,
  },
  modalDelete: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(150, 20, 20, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDeleteText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
