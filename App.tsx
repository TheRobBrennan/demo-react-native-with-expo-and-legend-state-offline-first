import { Button, StyleSheet, View, FlatList } from "react-native";
import { StatusBar } from "expo-status-bar";
import { observable } from "@legendapp/state";
import {
  configureObservablePersistence,
  persistObservable,
} from "@legendapp/state/persist";
import { ObservablePersistFirebase } from "@legendapp/state/persist-plugins/firebase";
import { ObservablePersistAsyncStorage } from "@legendapp/state/persist-plugins/async-storage";
// TODO: Async-storage does not work for web, so we need to use a different storage plugin for web
// NOTE: Async-storage and MMKV (which has excellent encryption capabilities worth considering) are not supported on web, but are great for mobile apps
import AsyncStorage from "@react-native-async-storage/async-storage";
import { observer } from "@legendapp/state/react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, remove, set } from "firebase/database"; // Import Firebase Realtime Database methods
import Expense from "./components/Expense";
import { getRandomPastelColor } from "./utils/getRandomColor";
import Header from "./components/Header";
import { randomExpenseNames } from "./constants/expenses";
import { firebaseConfig } from "./constants/firebase";

// Initialize Firebase
const app = initializeApp(firebaseConfig); // Ensure Firebase is initialized properly
const database = getDatabase(app); // Ensure database instance is created

configureObservablePersistence({
  // Use AsyncStorage in React Native
  pluginLocal: ObservablePersistAsyncStorage,
  localOptions: {
    asyncStorage: {
      // The AsyncStorage plugin needs to be given the implementation of AsyncStorage
      // TODO: Create a method to return the appropriate AsyncStorage implementation based on the platform - https://chatgpt.com/c/668dd801-a01d-431f-8636-7938c9d3f0f7
      AsyncStorage,
    },
  },
});

const state = observable({
  expenses: [], // Ensure initial state is an empty array
});

persistObservable(state, {
  local: "persist-demo",
  pluginRemote: ObservablePersistFirebase,
  remote: {
    onSetError: (err) => console.error(err),
    firebase: {
      refPath: () => `/expenses/`,
      mode: "realtime",
    },
  },
});

const App = observer(() => {
  const expenses = state.expenses.get() || []; // Ensure expenses is always an array

  const addExpense = () => {
    const expensesRef = ref(database, 'expenses'); // Use the database instance
    const newExpenseRef = push(expensesRef); // Generate a new reference with a unique key
    const expenseIndex = expenses.length % randomExpenseNames.length;
    const newExpense = {
      id: newExpenseRef.key, // Use the generated key as the ID
      title: randomExpenseNames[expenseIndex],
      amount: Math.floor(Math.random() * 100),
      color: getRandomPastelColor(),
      date: new Date().toLocaleString(),
    };
    newExpenseRef
      .then(() => {
        return set(newExpenseRef, newExpense); // Set the new expense in the database
      })
      .then(() => {
        state.expenses.set((currentExpenses) => [...currentExpenses, newExpense]);
      })
      .catch((error) => {
        console.error('Error adding new expense: ', error);
      });
  };

  const deleteExpense = (id) => {
    const expenseRef = ref(database, `expenses/${id}`); // Get reference to the specific expense
    remove(expenseRef) // Remove the expense from the database
      .then(() => {
        state.expenses.set((currentExpenses) => currentExpenses.filter(expense => expense.id !== id));
      })
      .catch((error) => {
        console.error('Error deleting expense: ', error);
      });
  };

  const resetExpenses = () => {
    const expensesRef = ref(database, 'expenses'); // Get reference to the expenses list
    set(expensesRef, null) // Clear all expenses from the database
      .then(() => {
        state.expenses.set([]); // Clear local state
      })
      .catch((error) => {
        console.error('Error resetting expenses: ', error);
      });
  };

  return (
    <View style={styles.container}>
      <StatusBar />
      <Header />
      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Expense item={item} onDelete={deleteExpense} />}
      />
      <View style={styles.buttonContainer}>
        <Button title="Add Expense" onPress={addExpense} />
        <Button title="Reset" onPress={resetExpenses} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 50,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 20,
  },
});

export default App;