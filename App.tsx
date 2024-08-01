import React, { useEffect } from 'react';
import { StyleSheet, View, FlatList } from "react-native";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const state = observable({
  expenses: [],
  isOnline: true,
});

const STORAGE_KEY = '@expenses';

const App = observer(() => {
  const expenses = state.expenses.get();
  const isOnline = state.isOnline.get();

  useEffect(() => {
    loadExpensesFromStorage();
    setupFirebaseListener();
  }, []);

  const loadExpensesFromStorage = async () => {
    try {
      const storedExpenses = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedExpenses !== null) {
        state.expenses.set(JSON.parse(storedExpenses));
      }
    } catch (error) {
      console.error('Error loading expenses from storage:', error);
    }
  };

  const saveExpensesToStorage = async (expenses) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving expenses to storage:', error);
    }
  };

  const setupFirebaseListener = () => {
    const expensesRef = ref(database, 'expenses');
    onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const expensesArray = Object.entries(data).map(([key, value]) => ({
          id: key,
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
  };

  const addExpense = async () => {
    const newExpense = {
      id: Date.now().toString(),
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
  };

  const deleteExpense = async (id) => {
    const updatedExpenses = expenses.filter(expense => expense.id !== id);
    state.expenses.set(updatedExpenses);
    await saveExpensesToStorage(updatedExpenses);

    if (isOnline) {
      const expenseRef = ref(database, `expenses/${id}`);
      remove(expenseRef).catch((error) => {
        console.error('Error deleting expense from Firebase:', error);
      });
    }
  };

  const resetExpenses = async () => {
    state.expenses.set([]);
    await saveExpensesToStorage([]);

    if (isOnline) {
      const expensesRef = ref(database, 'expenses');
      set(expensesRef, null).catch((error) => {
        console.error('Error resetting expenses in Firebase:', error);
      });
    }
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 20,
  },
  resetButton: {
    backgroundColor: '#FF3B30', // iOS red color for the reset button
  },
});

export default App;