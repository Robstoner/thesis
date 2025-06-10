import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../utils/config";
import { User, LoginRequest, RegisterRequest, AuthResponse } from "../types";

class AuthService {
  private baseURL = API_BASE_URL;
  private isLoggingOut = false;

  constructor() {
    this.setupAxiosInterceptors();
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
console.log(refreshToken);
        if (error.response?.status === 401) {
          console.log("Unauthorized request");
          if (refreshToken) {
            console.log("Attempting to refresh token");
            try {
              const response = await axios.post(
                `${this.baseURL}/auth/refresh`,
                { refresh_token: refreshToken }
              );
              const { access_token, user } = response.data;

              if (!access_token) {
                throw new Error("No access token received from server");
              }

              await SecureStore.setItemAsync("access_token", access_token);
              await SecureStore.setItemAsync("user", JSON.stringify(user));

              error.config.headers["Authorization"] = `Bearer ${access_token}`;
              return axios(error.config);
            } catch (refreshError) {
              await this.logout();
            }
          } else {
            console.log("No refresh token available, logging out");
            if (
              !this.isLoggingOut &&
              !error.config?.url?.includes("/auth/logout")
            ) {
              await this.logout();
            }
          }
        }
        console.log("Error response:", error.response);

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
}

export default new AuthService();
