import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { Food } from '../../types';
import FoodService from '../../services/FoodService';
import { StackScreenProps } from '@react-navigation/stack';

type RootStackParamList = {
  FoodList: undefined;
  AddFood: undefined;
  FoodDetail: { foodId: number };
};

// Use React Navigation's built-in types
type FoodDetailScreenProps = StackScreenProps<RootStackParamList, 'FoodDetail'>;

const { width } = Dimensions.get('window');

export default function FoodDetailScreen({ navigation, route }: FoodDetailScreenProps) {
  const { foodId } = route.params;
  const [food, setFood] = useState<Food | null>(null);
  const [nutritionImageUrl, setNutritionImageUrl] = useState<string | null>(null);
  const [ingredientsImageUrl, setIngredientsImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    loadFood();
  }, []);

  const loadFood = async () => {
    try {
      const foodData = await FoodService.getFoodById(foodId);
      setFood(foodData);
      
      // Load image URLs if images exist
      if (foodData.nutrition_image_path) {
        loadNutritionImage();
      }
      if (foodData.ingredients_image_path) {
        loadIngredientsImage();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const loadNutritionImage = async () => {
    try {
      setImageLoading(true);
      const url = await FoodService.getNutritionImageUrl(foodId);
      setNutritionImageUrl(url);
    } catch (error) {
      console.log('Failed to load nutrition image:', error);
    } finally {
      setImageLoading(false);
    }
  };

  const loadIngredientsImage = async () => {
    try {
      const url = await FoodService.getIngredientsImageUrl(foodId);
      setIngredientsImageUrl(url);
    } catch (error) {
      console.log('Failed to load ingredients image:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Food',
      'Are you sure you want to delete this food? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await FoodService.deleteFood(foodId);
              Alert.alert('Success', 'Food deleted successfully');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        },
      ]
    );
  };

  const getProcessingColor = (score: number) => {
    if (score <= 2) return '#27ae60';
    if (score <= 3) return '#f39c12';
    return '#e74c3c';
  };

  const getProcessingLabel = (score: number) => {
    if (score <= 2) return 'Minimally Processed';
    if (score <= 3) return 'Processed';
    return 'Ultra-Processed';
  };

  const renderNutritionInfo = () => {
    if (!food) return null;

    const nutritionData = [
      { label: 'Calories', value: food.calories_per_100g, unit: 'kcal' },
      { label: 'Protein', value: food.protein_per_100g, unit: 'g' },
      { label: 'Carbohydrates', value: food.carbs_per_100g, unit: 'g' },
      { label: 'Fat', value: food.fat_per_100g, unit: 'g' },
      { label: 'Saturated Fat', value: food.saturated_fat_per_100g, unit: 'g' },
      { label: 'Fiber', value: food.fiber_per_100g, unit: 'g' },
      { label: 'Sugar', value: food.sugar_per_100g, unit: 'g' },
      { label: 'Sodium', value: food.sodium_per_100g, unit: 'mg' },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition Information (per 100g)</Text>
        <View style={styles.nutritionGrid}>
          {nutritionData.map((item, index) => (
            item.value !== null && item.value !== undefined ? (
              <View key={index} style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>{item.label}</Text>
                <Text style={styles.nutritionValue}>
                  {typeof item.value === 'number' ? item.value.toFixed(1) : item.value} {item.unit}
                </Text>
              </View>
            ) : null
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading food details...</Text>
      </View>
    );
  }

  if (!food) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Food not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Food Details</Text>
        <TouchableOpacity 
          style={styles.deleteButton} 
          onPress={handleDelete}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.foodName}>{food.name}</Text>
          {food.brand && <Text style={styles.foodBrand}>{food.brand}</Text>}
          
          {food.processing_score && (
            <View style={styles.processingContainer}>
              <View 
                style={[
                  styles.processingDot, 
                  { backgroundColor: getProcessingColor(food.processing_score) }
                ]} 
              />
              <Text style={styles.processingText}>
                {getProcessingLabel(food.processing_score)} (Score: {food.processing_score}/5)
              </Text>
            </View>
          )}
        </View>

        {/* Nutrition Image */}
        {food.nutrition_image_path && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition Label</Text>
            {nutritionImageUrl ? (
              <Image 
                source={{ uri: nutritionImageUrl }} 
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                {imageLoading ? (
                  <ActivityIndicator color="#27ae60" />
                ) : (
                  <Text style={styles.imagePlaceholderText}>Failed to load image</Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Nutrition Information */}
        {renderNutritionInfo()}

        {/* Ingredients Image */}
        {food.ingredients_image_path && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients Photo</Text>
            {ingredientsImageUrl ? (
              <Image 
                source={{ uri: ingredientsImageUrl }} 
                style={styles.image}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <ActivityIndicator color="#27ae60" />
              </View>
            )}
          </View>
        )}

        {/* Raw Ingredients */}
        {food.ingredients_raw && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Raw Ingredients</Text>
            <View style={styles.textContainer}>
              <Text style={styles.ingredientsText}>{food.ingredients_raw}</Text>
            </View>
          </View>
        )}

        {/* Processed Ingredients */}
        {food.ingredients_processed && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients Analysis</Text>
            <View style={styles.textContainer}>
              <Text style={styles.processedIngredientsText}>{food.ingredients_processed}</Text>
            </View>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          <Text style={styles.timestampText}>
            Added: {new Date(food.created_at).toLocaleDateString()}
          </Text>
          {food.updated_at && (
            <Text style={styles.timestampText}>
              Updated: {new Date(food.updated_at).toLocaleDateString()}
            </Text>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 6,
  },
  deleteText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  foodName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  foodBrand: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  processingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  processingText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  image: {
    width: width - 64,
    height: 300,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: width - 64,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  imagePlaceholderText: {
    color: '#7f8c8d',
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nutritionItem: {
    width: '48%',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  textContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
  },
  ingredientsText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 20,
  },
  processedIngredientsText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 22,
  },
  timestampText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  bottomPadding: {
    height: 40,
  },
});