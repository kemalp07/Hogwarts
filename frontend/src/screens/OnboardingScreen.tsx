import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  SafeAreaView,
  Platform,
  ImageBackground,
  Image,
} from 'react-native';
import { useAppContext } from '../context/AppContext';

type OnboardingScreenProps = {
  navigation: any;
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [inputValue, setInputValue] = useState('');
  const { setUserName } = useAppContext();

  useEffect(() => {
    if (Platform.OS === 'web') {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('hp_user_name')) {
      navigation.navigate('Chat');
    }
  }, []);

  const handleStartPress = () => {
    const trimmedName = inputValue.trim();
    if (trimmedName.length > 0) {
      setUserName(trimmedName);
      navigation.navigate('Chat');
    }
  };

  const isButtonDisabled = inputValue.trim().length === 0;

  const WEB_INPUT_RESET =
    Platform.OS === 'web'
      ? ({ outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none' } as any)
      : undefined;

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

        <Text style={styles.subtitle}>Adın ne, genç büyücü?</Text>

        <TextInput
          style={[styles.input, WEB_INPUT_RESET]}
          placeholder="Adını gir..."
          placeholderTextColor="rgba(245, 220, 180, 0.4)"
          value={inputValue}
          onChangeText={setInputValue}
          editable={true}
        />

        <Pressable
          style={[
            styles.button,
            isButtonDisabled && styles.buttonDisabled,
          ]}
          onPress={handleStartPress}
          disabled={isButtonDisabled}
        >
          <Text
            style={[
              styles.buttonText,
              isButtonDisabled && styles.buttonTextDisabled,
            ]}
          >
            Hogwarts'a Başla
          </Text>
        </Pressable>
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
  input: {
    width: '72%',
    maxWidth: 360,
    alignSelf: 'center',
    height: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(245, 220, 180, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#F5E6C8',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    width: '72%',
    maxWidth: 360,
    alignSelf: 'center',
    height: 48,
    backgroundColor: 'rgba(120, 50, 8, 0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 220, 180, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
