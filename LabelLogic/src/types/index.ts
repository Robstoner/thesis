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
  
  nutrition_ocr_text?: string;
  ingredients_raw?: string;
  
  // AI processed content
  ingredients_processed?: string;
  
  processing_score?: number;
  nutrition_image_path?: string;
  ingredients_image_path?: string;
  created_at: string;
  updated_at?: string;
  processing_status?: 'processing' | 'analyzing_nutrition' | 'analyzing_ingredients' | 'completed' | 'error';
  progress_message?: string;
}

export interface FoodListResponse {
  items: Food[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
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