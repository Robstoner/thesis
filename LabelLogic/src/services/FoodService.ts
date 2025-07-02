import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { Food, FoodListResponse } from '../types';

class FoodService {
  private baseURL = API_BASE_URL;

  async getFoods(
    page = 1, 
    pageSize = 20, 
    search?: string,
    sortBy?: string,
    sortOrder = 'desc',
    showAllUsers = false
  ): Promise<FoodListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...(search && { search }),
        ...(sortBy && { sort_by: sortBy }),
        sort_order: sortOrder,
      });

      const endpoint = showAllUsers ? '/foods/all' : '/foods/';
      const response = await axios.get(`${this.baseURL}${endpoint}?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch foods');
    }
  }

  async getAllFoods(page = 1, pageSize = 20, search?: string): Promise<FoodListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...(search && { search }),
      });

      const response = await axios.get(`${this.baseURL}/foods/all/?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch all foods');
    }
  }

  async createFood(formData: FormData): Promise<Food> {
    try {
      const response = await axios.post(`${this.baseURL}/foods/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to create food');
    }
  }

  async getFoodById(id: number): Promise<Food> {
    try {
      const response = await axios.get(`${this.baseURL}/foods/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to fetch food');
    }
  }

  async getProcessingStatus(id: number): Promise<{
    food_id: number;
    status: 'processing' | 'analyzing_nutrition' | 'analyzing_ingredients' | 'completed' | 'error';
    progress_message?: string;
    has_nutrition_data: boolean;
    has_ingredients_processed: boolean;
    has_nutrition_ocr: boolean;
    has_ingredients_ocr: boolean;
    last_updated: string;
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/foods/${id}/processing-status`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get processing status');
    }
  }

  async getNutritionImageUrl(id: number): Promise<string> {
    try {
      const response = await axios.get(`${this.baseURL}/foods/${id}/nutrition-image`);
      return response.data.url;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get nutrition image');
    }
  }

  async getIngredientsImageUrl(id: number): Promise<string> {
    try {
      const response = await axios.get(`${this.baseURL}/foods/${id}/ingredients-image`);
      return response.data.url;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get ingredients image');
    }
  }

  async updateFood(id: number, formData: FormData): Promise<Food> {
    try {
      const response = await axios.put(`${this.baseURL}/foods/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to update food');
    }
  }

  async deleteFood(id: number): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/foods/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to delete food');
    }
  }

  async searchFoods(query: string, page = 1, pageSize = 20): Promise<FoodListResponse> {
    return this.getFoods(page, pageSize, query);
  }

  async getFoodsByRanking(
    criteria = 'processing_score',
    ascending = true,
    page = 1,
    pageSize = 20
  ): Promise<FoodListResponse> {
    try {
      const params = new URLSearchParams({
        criteria,
        ascending: ascending.toString(),
        page: page.toString(),
        page_size: pageSize.toString(),
      });

      const response = await axios.get(`${this.baseURL}/foods/ranking/by-criteria?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get ranked foods');
    }
  }

  async getFoodStats(): Promise<{
    total_foods: number;
    avg_calories_per_100g: number;
    avg_protein_per_100g: number;
    processing_score_distribution: { [key: string]: number };
    top_healthiest_foods: Food[];
  }> {
    try {
      const response = await axios.get(`${this.baseURL}/foods/stats/summary`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get food statistics');
    }
  }

  async getFilteredFoods(filters: {
    min_protein?: number;
    max_calories?: number;
    max_sodium?: number;
    max_processing_score?: number;
    has_ingredients?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<FoodListResponse> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await axios.get(`${this.baseURL}/foods/filter/advanced?${params}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to filter foods');
    }
  }
}

export default new FoodService();