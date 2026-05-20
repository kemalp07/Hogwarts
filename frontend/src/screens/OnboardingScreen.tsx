import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useAppContext } from '../context/AppContext';

type OnboardingScreenProps = {
  navigation: any;
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [inputValue, setInputValue] = useState('');
  const { setUserName } = useAppContext();

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
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>⚡</Text>
        </View>

        <Text style={styles.title}>Hogwarts'a Hoş Geldin</Text>

        <Text style={styles.subtitle}>Adın ne, genç büyücü?</Text>

        <TextInput
          style={[styles.input, WEB_INPUT_RESET]}
          placeholder="Adını gir..."
          placeholderTextColor="#AAA"
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    color: '#000',
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  input: {
    width: '72%',
    maxWidth: 360,
    alignSelf: 'center',
    height: 44,
    borderWidth: 0.5,
    borderColor: '#D1D1D1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
    color: '#000',
  },
  button: {
    width: '72%',
    maxWidth: 360,
    alignSelf: 'center',
    height: 44,
    backgroundColor: '#D97706',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#999',
  },
});
