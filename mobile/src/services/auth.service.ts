import * as SecureStore from 'expo-secure-store';
import { apiRequest } from './api';

const TOKEN_KEY = 'salescontrol_access_token';

interface LoginResponse {
  access_token?: string;
  accessToken?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<string> {
    const response = await apiRequest<LoginResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      },
    );

    const token = response.access_token ?? response.accessToken;

    if (!token) {
      throw new Error(
        'El backend no devolvió un token JWT válido.',
      );
    }

    await SecureStore.setItemAsync(TOKEN_KEY, token);

    return token;
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async logout(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
