import axios from 'axios';
import { API_BASE_URL } from '../utils/config';
import { Food, FoodListResponse } from '../types';

class FoodService {
  private baseURL = API_BASE_URL;

  async getFoods(page = 1, pageSize = 20, search?: string): Promise<FoodListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...(search && { search }),
      });

      const response = await axios.get(`${this.baseURL}/foods/?${params}`);
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

  async getNutritionImageUrl(id: number): Promise<string> {
    try {
      const response = await axios.get(`${this.baseURL}/foods/${id}/nutrition-image`);
      console.log('Nutrition image URL:', response.data.url);
      return response.data.url;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get nutrition image');
    }
  }

  async getIngredientsImageUrl(id: number): Promise<string> {
    try {
      const response = await axios.get(`${this.baseURL}/foods/${id}/ingredients-image`);
      console.log('Ingredients image URL:', response.data.url);
      return response.data.url;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to get ingredients image');
    }
  }

  async deleteFood(id: number): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/foods/${id}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to delete food');
    }
  }
}

export default new FoodService();