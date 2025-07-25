import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import expenseSlice from './slices/expenseSlice';
import profileSlice from './slices/profileSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    expenses: expenseSlice,
    profile: profileSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;