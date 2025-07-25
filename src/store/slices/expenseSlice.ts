import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Expense {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface ExpenseState {
  expenses: Expense[];
  loading: boolean;
  currentFilter: 'daily' | 'weekly' | 'monthly';
}

const initialState: ExpenseState = {
  expenses: [],
  loading: false,
  currentFilter: 'daily',
};

const expenseSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {
    setExpenses: (state, action: PayloadAction<Expense[]>) => {
      state.expenses = action.payload;
    },
    addExpense: (state, action: PayloadAction<Expense>) => {
      state.expenses.push(action.payload);
    },
    updateExpense: (state, action: PayloadAction<Expense>) => {
      const index = state.expenses.findIndex(exp => exp.id === action.payload.id);
      if (index !== -1) {
        state.expenses[index] = action.payload;
      }
    },
    deleteExpense: (state, action: PayloadAction<string>) => {
      state.expenses = state.expenses.filter(exp => exp.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setFilter: (state, action: PayloadAction<'daily' | 'weekly' | 'monthly'>) => {
      state.currentFilter = action.payload;
    },
  },
});

export const { setExpenses, addExpense, updateExpense, deleteExpense, setLoading, setFilter } = expenseSlice.actions;
export default expenseSlice.reducer;