import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { observable } from "@legendapp/state";
import { observer } from "@legendapp/state/react";
// TODO: Async-storage does not work for web, so we need to use a different storage plugin for web
// NOTE: Async-storage and MMKV (which has excellent encryption capabilities worth considering) are not supported on web, but are great for mobile apps
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, remove, set, onValue } from "firebase/database";
import Expense from "./components/Expense";
import { getRandomPastelColor } from "./utils/getRandomColor";
import Header from "./components/Header";
import { randomExpenseNames } from "./constants/expenses";
import { firebaseConfig } from "./constants/firebase";
import CustomButton from "./components/CustomButton";
import DebugScreen from "./components/DebugScreen";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const state = observable({
  expenses: [],
  isOnline: true,
});

const STORAGE_KEY = '@expenses';

const App = observer(() => {
  const [showDebug, setShowDebug] = useState(false);
  const expenses = state.expenses.get();
  const isOnline = state.isOnline.get();

  const loadExpensesFromStorage = useCallback(async () => {
    try {
      const storedExpenses = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedExpenses !== null) {
        state.expenses.set(JSON.parse(storedExpenses));
      }
    } catch (error) {
      console.error('Error loading expenses from storage:', error);
    }
  }, []);

  const saveExpensesToStorage = useCallback(async (expenses: any[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      console.log('Expenses saved to AsyncStorage:', expenses);
    } catch (error) {
      console.error('Error saving expenses to storage:', error);
    }
  }, []);

  const setupFirebaseListener = useCallback(() => {
    const expensesRef = ref(database, 'expenses');
    onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const expensesArray = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: value.id,
          ...value,
        }));
        state.expenses.set(expensesArray);
        saveExpensesToStorage(expensesArray);
      } else {
        state.expenses.set([]);
        saveExpensesToStorage([]);
      }
    }, (error) => {
      console.error('Firebase connection error:', error);
      state.isOnline.set(false);
    });
  }, [saveExpensesToStorage]);

  const addExpense = useCallback(async () => {
    const newExpense = {
      id: Date.now().toString(), // Local ID
      title: randomExpenseNames[Math.floor(Math.random() * randomExpenseNames.length)],
      amount: Math.floor(Math.random() * 100),
      color: getRandomPastelColor(),
      date: new Date().toLocaleString(),
    };

    const updatedExpenses = [...expenses, newExpense];
    state.expenses.set(updatedExpenses);
    await saveExpensesToStorage(updatedExpenses);

    if (isOnline) {
      const expensesRef = ref(database, 'expenses');
      const newExpenseRef = push(expensesRef);
      set(newExpenseRef, newExpense).catch((error) => {
        console.error('Error adding new expense to Firebase:', error);
      });
    }
  }, [expenses, isOnline, saveExpensesToStorage]);

  const deleteExpense = useCallback(async (id: string) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== id);
    state.expenses.set(updatedExpenses);
    await saveExpensesToStorage(updatedExpenses);

    if (isOnline) {
      const expensesRef = ref(database, 'expenses');
      // First, find the Firebase key for this expense
      onValue(expensesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const firebaseKey = Object.keys(data).find(key => data[key].id === id);
          if (firebaseKey) {
            const expenseRef = ref(database, `expenses/${firebaseKey}`);
            remove(expenseRef).catch((error) => {
              console.error('Error deleting expense from Firebase:', error);
            });
          }
        }
      }, {
        onlyOnce: true // This ensures the callback is only called once
      });
    }
  }, [expenses, isOnline, saveExpensesToStorage]);

  const resetExpenses = useCallback(async () => {
    state.expenses.set([]);
    await saveExpensesToStorage([]);

    if (isOnline) {
      const expensesRef = ref(database, 'expenses');
      set(expensesRef, null).catch((error) => {
        console.error('Error resetting expenses in Firebase:', error);
      });
    }
  }, [isOnline, saveExpensesToStorage]);

  const toggleDebugScreen = useCallback(() => {
    setShowDebug(!showDebug);
  }, [showDebug]);

  useEffect(() => {
    loadExpensesFromStorage();
    setupFirebaseListener();
  }, [loadExpensesFromStorage, setupFirebaseListener]);

  if (showDebug) {
    return <DebugScreen onClose={toggleDebugScreen} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Header />
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Expense item={item} onDelete={deleteExpense} />}
      />
      <View style={styles.buttonContainer}>
        <CustomButton title="Add Expense" onPress={addExpense} />
        <CustomButton title="Reset" onPress={resetExpenses} style={styles.resetButton} />
      </View>
      <CustomButton title="Debug AsyncStorage" onPress={toggleDebugScreen} style={styles.debugButton} />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 20,
  },
  resetButton: {
    backgroundColor: '#FF3B30', // iOS red color for the reset button
  },
  debugButton: {
    backgroundColor: '#9C27B0',
    marginHorizontal: 20,
    marginBottom: 20,
  },
});

export default App;