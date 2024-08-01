import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomButton from './CustomButton';

interface DebugScreenProps {
  onClose: () => void;
}

const DebugScreen: React.FC<DebugScreenProps> = ({ onClose }) => {
  const [storageContents, setStorageContents] = useState('');

  const fetchStorageContents = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const result = await AsyncStorage.multiGet(keys);
      setStorageContents(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error fetching AsyncStorage contents:', error);
      setStorageContents('Error fetching contents');
    }
  };

  const clearAsyncStorage = async () => {
    Alert.alert(
      "Clear AsyncStorage",
      "Are you sure you want to clear all data from AsyncStorage?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "OK", 
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setStorageContents('AsyncStorage cleared');
              console.log('AsyncStorage has been cleared');
            } catch (error) {
              console.error('Error clearing AsyncStorage:', error);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchStorageContents();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>AsyncStorage Contents:</Text>
      <ScrollView style={styles.scrollView}>
        <Text>{storageContents}</Text>
      </ScrollView>
      <View style={styles.buttonContainer}>
        <CustomButton title="Refresh" onPress={fetchStorageContents} style={styles.button} />
        <CustomButton title="Clear" onPress={clearAsyncStorage} style={[styles.button, styles.clearButton]} />
        <CustomButton title="Back" onPress={onClose} style={styles.button} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: 20,
  },
  scrollView: {
    flex: 1,
    margin: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  clearButton: {
    backgroundColor: '#FF3B30', // iOS red color for the clear button
  },
});

export default DebugScreen;