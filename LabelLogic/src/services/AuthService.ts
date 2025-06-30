import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../utils/config";
import { User, LoginRequest, RegisterRequest, AuthResponse, ForgotPasswordRequest, ResetPasswordRequest, ForgotPasswordCodeRequest, ResetPasswordCodeRequest } from "../types";

class AuthService {
  private baseURL = API_BASE_URL;
  private isLoggingOut = false;
  private onLogoutCallback: (() => void) | null = null;

  constructor() {
    this.setupAxiosInterceptors();
  }

  setOnLogoutCallback(callback: () => void) {
    this.onLogoutCallback = callback;
  }

  private setupAxiosInterceptors() {
    axios.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync("access_token");
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    axios.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error) => {
        const refreshToken = await SecureStore.getItemAsync("refresh_token");

        if (error.response?.status === 401) {
          if (refreshToken) {
            try {
              const response = await axios.post(
                `${this.baseURL}/auth/refresh`,
                { refresh_token: refreshToken }
              );
              console.log(response.status);
              if (response.status !== 200) {
                throw new Error("Failed to refresh access token");
              }

              const { access_token } = response.data;

              if (!access_token) {
                throw new Error("No access token received from server");
              }

              await SecureStore.setItemAsync("access_token", access_token);

              error.config.headers["Authorization"] = `Bearer ${access_token}`;
              return axios(error.config);
            } catch (refreshError) {
              await this.logout();
              this.onLogoutCallback?.();
            }
          } else {
            if (
              !this.isLoggingOut &&
              !error.config?.url?.includes("/auth/logout")
            ) {
              await this.logout();
              this.onLogoutCallback?.();
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await axios.post(
        `${this.baseURL}/auth/login`,
        credentials
      );

      const { access_token, refresh_token, user } = response.data;

      if (!access_token) {
        throw new Error("No access token received from server");
      }

      await SecureStore.setItemAsync("access_token", access_token);
      if (refresh_token) {
        await SecureStore.setItemAsync("refresh_token", refresh_token);
      }
      await SecureStore.setItemAsync("user", JSON.stringify(user));

      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Login failed");
    }
  }

  async register(userData: RegisterRequest): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/auth/register`, userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Registration failed");
    }
  }

  async logout(): Promise<void> {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;

    try {
      await axios.post(`${this.baseURL}/auth/logout`);
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      try {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        await SecureStore.deleteItemAsync("user");
      } catch (error) {
        // Continue with logout
      }
      this.isLoggingOut = false;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userString = await SecureStore.getItemAsync("user");
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      return !!token;
    } catch (error) {
      return false;
    }
  }

  async requestPasswordReset(email: ForgotPasswordRequest): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/auth/request-password-reset`, email);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Failed to request password reset");
    }
  }

  async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/auth/reset-password`, resetData);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Failed to reset password");
    }
  }

  async requestPasswordResetCode(email: ForgotPasswordCodeRequest): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/auth/request-password-reset-code`, email);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Failed to request password reset code");
    }
  }

  async resetPasswordWithCode(resetData: ResetPasswordCodeRequest): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/auth/reset-password-with-code`, resetData);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || "Failed to reset password with code");
    }
  }
}

export default new AuthService();
