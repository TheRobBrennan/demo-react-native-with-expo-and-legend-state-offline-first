import { Button, StyleSheet, View, FlatList } from "react-native";
import { StatusBar } from "expo-status-bar";
import { observable } from "@legendapp/state";
import {
  configureObservablePersistence
} from "@legendapp/state/persist";
import { ObservablePersistAsyncStorage } from "@legendapp/state/persist-plugins/async-storage";
// TODO: Async-storage does not work for web, so we need to use a different storage plugin for web
// NOTE: Async-storage and MMKV (which has excellent encryption capabilities worth considering) are not supported on web, but are great for mobile apps
import AsyncStorage from "@react-native-async-storage/async-storage";
import { observer } from "@legendapp/state/react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, remove, set, onValue } from "firebase/database";
import { useEffect } from "react";
import Expense from "./components/Expense";
import { getRandomPastelColor } from "./utils/getRandomColor";
import Header from "./components/Header";
import { randomExpenseNames } from "./constants/expenses";
import { firebaseConfig } from "./constants/firebase";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

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
  expenses: [],
});

const App = observer(() => {
  const expenses = state.expenses.get();

  useEffect(() => {
    const expensesRef = ref(database, 'expenses');
    const unsubscribe = onValue(expensesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const expensesArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
        }));
        state.expenses.set(expensesArray);
      } else {
        state.expenses.set([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const addExpense = () => {
    const expensesRef = ref(database, 'expenses');
    const newExpenseRef = push(expensesRef);
    const expenseIndex = Math.floor(Math.random() * randomExpenseNames.length);
    const newExpense = {
      title: randomExpenseNames[expenseIndex],
      amount: Math.floor(Math.random() * 100),
      color: getRandomPastelColor(),
      date: new Date().toLocaleString(),
    };
    set(newExpenseRef, newExpense).catch((error) => {
      console.error('Error adding new expense: ', error);
    });
  };

  const deleteExpense = (id) => {
    const expenseRef = ref(database, `expenses/${id}`);
    remove(expenseRef).catch((error) => {
      console.error('Error deleting expense: ', error);
    });
  };

  const resetExpenses = () => {
    const expensesRef = ref(database, 'expenses');
    set(expensesRef, null).catch((error) => {
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