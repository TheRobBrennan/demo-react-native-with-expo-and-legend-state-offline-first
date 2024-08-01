import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import CustomButton from './CustomButton';

interface ExpenseProps {
  item: any;
  onDelete: (id: string) => void;
}

const Expense = ({ item, onDelete }: ExpenseProps) => {
  return (
    <View style={[styles.container, { backgroundColor: item.color }]}>
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.amount}>${item.amount}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <CustomButton 
        title="Delete" 
        onPress={() => onDelete(item.id)}
        style={styles.deleteButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 10,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  amount: {
    fontSize: 16,
    marginTop: 4,
  },
  date: {
    fontSize: 14,
    marginTop: 4,
    color: '#666',
  },
  deleteButton: {
    backgroundColor: '#FF3B30', // iOS red color for delete action
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});

export default Expense;