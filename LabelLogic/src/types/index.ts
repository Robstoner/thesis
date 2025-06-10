export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_verified: boolean;
}

export interface Food {
  id: number;
  name: string;
  brand?: string;
  calories_per_100g?: number;
  protein_per_100g?: number;
  carbs_per_100g?: number;
  fat_per_100g?: number;
  saturated_fat_per_100g?: number;
  fiber_per_100g?: number;
  sugar_per_100g?: number;
  sodium_per_100g?: number;
  ingredients_raw?: string;
  ingredients_processed?: string;
  processing_score?: number;
  nutrition_image_path?: string;
  ingredients_image_path?: string;
  created_at: string;
  updated_at?: string;
}

export interface FoodListResponse {
  items: Food[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  user: User;
}