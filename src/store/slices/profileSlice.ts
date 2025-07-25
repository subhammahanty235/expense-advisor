import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  monthly_salary?: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Profile | null>) => {
      state.profile = action.payload;
    },
    updateProfile: (state, action: PayloadAction<Partial<Profile>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setProfile, updateProfile, setLoading } = profileSlice.actions;
export default profileSlice.reducer;