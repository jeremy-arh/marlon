import { supabase } from '@/lib/supabase/client';

interface SignUpData {
  email: string;
  password: string;
  organizationName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  profession?: string;
}

export async function signUp(data: SignUpData) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok) {
    return { data: null, error: { message: result.error } };
  }

  // Sign in after registration
  const signInResult = await signIn(data.email, data.password);
  return signInResult;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function resetPassword(email: string) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback`,
  });
  return { data, error };
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}
