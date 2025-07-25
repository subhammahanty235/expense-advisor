import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { setAuth, clearAuth, setLoading } from '@/store/slices/authSlice';
import { setProfile } from '@/store/slices/profileSlice';
import { RootState } from '@/store/store';
import Auth from '@/pages/Auth';

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const dispatch = useDispatch();
  const { user, session, loading } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          dispatch(setAuth({ user: session.user, session }));
          // Fetch user profile
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            if (profile) {
              dispatch(setProfile(profile));
            }
          }, 0);
        } else {
          dispatch(clearAuth());
          dispatch(setProfile(null));
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        dispatch(setAuth({ user: session.user, session }));
      } else {
        dispatch(setLoading(false));
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !session) {
    return <Auth />;
  }

  return <>{children}</>;
};

export default AuthWrapper;