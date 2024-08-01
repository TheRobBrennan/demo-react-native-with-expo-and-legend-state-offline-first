import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, SafeAreaView, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { observable } from "@legendapp/state";
import { observer } from "@legendapp/state/react";
// TODO: Web support for React Native is not included in the default package, so we need to install it separately
// TODO: Async-storage does not work for web, so we need to use a different storage plugin for web
// NOTE: Async-storage and MMKV (which has excellent encryption capabilities worth considering) are not supported on web, but are great for mobile apps
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, remove, set, onValue, off, get } from "firebase/database";
import NetInfo from "@react-native-community/netinfo";
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

const state$ = observable({
  expenses: [],
  isOnline: true,
  pendingSync: [],
});

const STORAGE_KEY = '@expenses';
const PENDING_SYNC_KEY = '@pendingSync';

const App = observer(() => {
  const [showDebug, setShowDebug] = useState(false);

  const loadExpensesFromStorage = useCallback(async () => {
    try {
      const storedExpenses = await AsyncStorage.getItem(STORAGE_KEY);
      const storedPendingSync = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      if (storedExpenses !== null) {
        state$.expenses.set(JSON.parse(storedExpenses));
      }
      if (storedPendingSync !== null) {
        state$.pendingSync.set(JSON.parse(storedPendingSync));
      }
      console.log('Loaded from storage:', { 
        expenses: state$.expenses.get().length, 
        pendingSync: state$.pendingSync.get().length 
      });
    } catch (error) {
      console.error('Error loading data from storage:', error);
    }
  }, []);

  const saveExpensesToStorage = useCallback(async (expenses: any[], pendingSync: any[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingSync));
      console.log('Data saved to AsyncStorage:', { 
        expenses: expenses.length, 
        pendingSync: pendingSync.length 
      });
    } catch (error) {
      console.error('Error saving data to storage:', error);
    }
  }, []);

  const syncPendingChanges = useCallback(async () => {
    console.log('Starting syncPendingChanges');
    const pendingItems = state$.pendingSync.get();
    console.log('Pending items to sync:', pendingItems.length);
    
    const expensesRef = ref(database, 'expenses');
    
    const updatedPendingSync = [...pendingItems];
    let localExpenses = state$.expenses.get();
    
    for (let i = 0; i < updatedPendingSync.length; i++) {
      const item = updatedPendingSync[i];
      try {
        console.log('Processing item:', item);
        if (item.action === 'add') {
          const newRef = await push(expensesRef, item.data);
          console.log('Added item to Firebase:', item.data.id);
          // Update the local expense with the Firebase key
          localExpenses = localExpenses.map(e => 
            e.id === item.data.id ? { ...e, firebaseKey: newRef.key } : e
          );
          updatedPendingSync.splice(i, 1);
          i--; // Adjust index after removal
        } else if (item.action === 'delete') {
          const snapshot = await get(expensesRef);
          const data = snapshot.val();
          if (data) {
            const firebaseKey = Object.keys(data).find(key => data[key].id === item.data.id);
            if (firebaseKey) {
              await remove(ref(database, `expenses/${firebaseKey}`));
              console.log('Deleted item from Firebase:', item.data.id);
              // Remove from local expenses if it still exists
              localExpenses = localExpenses.filter(e => e.id !== item.data.id);
              updatedPendingSync.splice(i, 1);
              i--; // Adjust index after removal
            } else {
              console.log('Item not found in Firebase:', item.data.id);
            }
          }
        }
      } catch (error) {
        console.error('Error syncing item:', item, error);
      }
    }

    // Sort expenses in descending order of date
    localExpenses = localExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    state$.pendingSync.set(updatedPendingSync);
    state$.expenses.set(localExpenses);
    console.log('Sync complete. Remaining pending items:', updatedPendingSync.length);
    
    // Save the updated state to storage
    await saveExpensesToStorage(localExpenses, updatedPendingSync);
  }, [saveExpensesToStorage]);

  const setupFirebaseListener = useCallback(() => {
    const expensesRef = ref(database, 'expenses');
    const handleValueChange = (snapshot: any) => {
      const data = snapshot.val();
      const firebaseExpenses = data ? Object.entries(data).map(([key, value]: [string, any]) => ({
        id: value.id,
        firebaseKey: key,
        ...value,
      })) : [];

      // Merge Firebase expenses with local expenses
      state$.expenses.set(prevExpenses => {
        const mergedExpenses = [...prevExpenses];
        
        firebaseExpenses.forEach(fbExpense => {
          const localIndex = mergedExpenses.findIndex(e => e.id === fbExpense.id);
          if (localIndex === -1) {
            mergedExpenses.push(fbExpense);
          } else {
            mergedExpenses[localIndex] = { ...mergedExpenses[localIndex], ...fbExpense };
          }
        });

        // Remove expenses that no longer exist in Firebase
        const filteredExpenses = mergedExpenses.filter(expense => 
          firebaseExpenses.some(fbExpense => fbExpense.id === expense.id) || 
          state$.pendingSync.get().some(item => item.data.id === expense.id)
        );

        // Sort expenses in descending order of date
        return filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });

      saveExpensesToStorage(state$.expenses.get(), state$.pendingSync.get());
    };

    onValue(expensesRef, handleValueChange, (error) => {
      console.error('Firebase connection error:', error);
      state$.isOnline.set(false);
    });

    return () => off(expensesRef, 'value', handleValueChange);
  }, [saveExpensesToStorage]);

  const addExpense = useCallback(async () => {
    const newExpense = {
      id: Date.now().toString(),
      title: randomExpenseNames[Math.floor(Math.random() * randomExpenseNames.length)],
      amount: Math.floor(Math.random() * 100),
      color: getRandomPastelColor(),
      date: new Date().toISOString(), // Store date as ISO string for easy sorting
    };

    const updatedExpenses = [...state$.expenses.get(), newExpense].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    state$.expenses.set(updatedExpenses);

    if (state$.isOnline.get()) {
      const expensesRef = ref(database, 'expenses');
      await push(expensesRef, newExpense);
    } else {
      const updatedPendingSync = [...state$.pendingSync.get(), { action: 'add', data: newExpense }];
      state$.pendingSync.set(updatedPendingSync);
      await saveExpensesToStorage(updatedExpenses, updatedPendingSync);
    }
  }, [saveExpensesToStorage]);

  const deleteExpense = useCallback(async (id: string) => {
    // Immediately update local state
    state$.expenses.set(prevExpenses => prevExpenses.filter(expense => expense.id !== id));

    if (state$.isOnline.get()) {
      const expensesRef = ref(database, 'expenses');
      const snapshot = await get(expensesRef);
      const data = snapshot.val();
      if (data) {
        const firebaseKey = Object.keys(data).find(key => data[key].id === id);
        if (firebaseKey) {
          await remove(ref(database, `expenses/${firebaseKey}`));
        }
      }
    } else {
      const updatedPendingSync = [...state$.pendingSync.get(), { action: 'delete', data: { id } }];
      state$.pendingSync.set(updatedPendingSync);
    }
    
    // Save the updated state to storage
    await saveExpensesToStorage(state$.expenses.get(), state$.pendingSync.get());
  }, [saveExpensesToStorage]);

  const resetExpenses = useCallback(async () => {
    state$.expenses.set([]);
    state$.pendingSync.set([]);
    await saveExpensesToStorage([], []);

    if (state$.isOnline.get()) {
      const expensesRef = ref(database, 'expenses');
      await set(expensesRef, null);
    }
  }, [saveExpensesToStorage]);

  const toggleDebugScreen = useCallback(() => {
    setShowDebug(!showDebug);
  }, [showDebug]);

  useEffect(() => {
    loadExpensesFromStorage().then(() => {
      if (state$.isOnline.get()) {
        syncPendingChanges();
      }
    });
    const unsubscribe = setupFirebaseListener();

    // Set up network status listener
    const unsubscribeNetInfo = NetInfo.addEventListener(networkState => {
      const online = networkState.isConnected && networkState.isInternetReachable;
      console.log('Network status changed. Online:', online);
      state$.isOnline.set(online);
      if (online) {
        console.log('Device is online. Attempting to sync pending changes.');
        syncPendingChanges();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeNetInfo();
    };
  }, [loadExpensesFromStorage, setupFirebaseListener, syncPendingChanges]);

  if (showDebug) {
    return <DebugScreen onClose={toggleDebugScreen} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Header />
      <FlatList
        data={state$.expenses.get()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Expense item={item} onDelete={deleteExpense} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No expenses yet. Add some!</Text>}
      />
      <View style={styles.buttonContainer}>
        <CustomButton title="Add Expense" onPress={addExpense} />
        <CustomButton title="Reset" onPress={resetExpenses} style={styles.resetButton} />
      </View>
      <CustomButton title="Debug AsyncStorage" onPress={toggleDebugScreen} style={styles.debugButton} />
      <CustomButton title="Force Sync" onPress={syncPendingChanges} style={styles.syncButton} />
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
    backgroundColor: '#FF3B30',
  },
  debugButton: {
    backgroundColor: '#9C27B0',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  syncButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
});

export default App;