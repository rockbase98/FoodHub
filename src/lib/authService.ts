import { supabase } from './supabase';
import { UserRole } from '../types';

export class AuthService {
  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }

  async verifyOtpAndSetup(
    email: string,
    token: string,
    password: string,
    username: string,
    role: UserRole,
    phone?: string
  ) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
    if (error) throw error;

    const { data: updateData, error: updateError } = await supabase.auth.updateUser({
      password,
      data: { username, role, phone },
    });
    if (updateError) throw updateError;

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ role, phone })
      .eq('id', updateData.user.id);

    if (profileError) throw profileError;

    return updateData.user;
  }

  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data.user;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async updateProfile(userId: string, updates: { username?: string; phone?: string; avatar_url?: string }) {
    const { error } = await supabase.auth.updateUser({
      data: updates,
    });
    if (error) throw error;

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (profileError) throw profileError;
  }
}

export const authService = new AuthService();
