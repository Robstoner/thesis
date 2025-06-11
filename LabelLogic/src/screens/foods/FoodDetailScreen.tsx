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
  RefreshControl,
} from 'react-native';
import { Food } from '../../types';
import FoodService from '../../services/FoodService';
import { StackScreenProps } from '@react-navigation/stack';
import { useProcessingStatus } from '../../hooks/useProcessingStatus';

type RootStackParamList = {
  FoodList: undefined;
  AddFood: undefined;
  FoodDetail: { foodId: number };
};

// Use React Navigation's built-in types
type FoodDetailScreenProps = StackScreenProps<RootStackParamList, 'FoodDetail'>;

const { width } = Dimensions.get('window');

const ProcessingProgress = ({ status, progressMessage, progressPercentage, detailedSteps, hasError }: any) => {
  if (!status) return null;

  return (
    <View style={styles.processingCard}>
      <View style={styles.processingHeader}>
        <ActivityIndicator size="small" color={hasError ? '#e74c3c' : '#f39c12'} />
        <Text style={styles.processingTitle}>
          {hasError ? 'Analysis Failed' : 'Analyzing Images'}
        </Text>
      </View>
      
      {/* Overall Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${progressPercentage}%`,
                backgroundColor: hasError ? '#e74c3c' : '#f39c12'
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{progressPercentage}%</Text>
      </View>
      
      {/* Current Status Message */}
      <Text style={styles.progressMessage}>
        {progressMessage}
      </Text>
      
      {/* Detailed Steps */}
      <View style={styles.stepsContainer}>
        {detailedSteps.map((step: any, index: number) => (
          <View key={index} style={styles.stepItem}>
            <View style={[
              styles.stepIndicator,
              {
                backgroundColor: step.completed ? '#27ae60' : 
                               step.active ? '#f39c12' : '#e9ecef'
              }
            ]}>
              {step.completed ? (
                <Text style={styles.stepCheckmark}>✓</Text>
              ) : step.active ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.stepNumber}>{index + 1}</Text>
              )}
            </View>
            <View style={styles.stepContent}>
              <Text style={[
                styles.stepName,
                { color: step.completed || step.active ? '#2c3e50' : '#6c757d' }
              ]}>
                {step.name}
              </Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>
      
      <Text style={styles.progressSubtext}>
        This process uses both OCR and AI for maximum accuracy. It usually takes 30-90 seconds.
      </Text>
    </View>
  );
};

export default function FoodDetailScreen({ navigation, route }: FoodDetailScreenProps) {
  const { foodId } = route.params;
  const [food, setFood] = useState<Food | null>(null);
  const [nutritionImageUrl, setNutritionImageUrl] = useState<string | null>(null);
  const [ingredientsImageUrl, setIngredientsImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const {
    status,
    isProcessing,
    isCompleted,
    hasError,
    progressMessage,
    progressPercentage,
    detailedSteps
  } = useProcessingStatus(
    food?.processing_status && ['processing', 'analyzing_nutrition', 'analyzing_ingredients'].includes(food.processing_status) ? foodId : null,
    {
      pollInterval: 3000,
      maxRetries: 30, // 90 seconds
      enabled: true
    }
  );

  useEffect(() => {
    loadFood();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadFood();
    } catch (error) {
      // Error handling is already done in loadFood
    } finally {
      setRefreshing(false);
    }
  };

  const loadFood = async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
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
      if (!food) {
        navigation.goBack();
      }
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

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#27ae60']} // Android
            tintColor={'#27ae60'} // iOS
            title="Pull to refresh" // iOS
            titleColor={'#27ae60'} // iOS
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {isProcessing && (
          <ProcessingProgress 
            status={status}
            progressMessage={progressMessage}
            progressPercentage={progressPercentage}
            detailedSteps={detailedSteps}
            hasError={hasError}
          />
        )}

        {hasError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorMessage}>
              {status?.progress_message || progressMessage}
            </Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                // You could implement a retry mechanism here
                Alert.alert('Retry', 'Please try uploading the images again from the edit screen.');
              }}
            >
              <Text style={styles.retryButtonText}>Upload New Images</Text>
            </TouchableOpacity>
          </View>
        )}

        {isCompleted && food?.processing_status !== 'completed' && (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Analysis Complete!</Text>
            <Text style={styles.successMessage}>
              Your food has been analyzed using both OCR and AI for maximum accuracy.
            </Text>
          </View>
        )}

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
        {/* {food.ingredients_raw && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Raw Ingredients</Text>
            <View style={styles.textContainer}>
              <Text style={styles.ingredientsText}>{food.ingredients_raw}</Text>
            </View>
          </View>
        )} */}

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

const additionalStyles = StyleSheet.create({
  // Enhanced processing card styles
  stepsContainer: {
    marginTop: 16,
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepCheckmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepNumber: {
    color: '#6c757d',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },

  // OCR section styles
  ocrSubsection: {
    marginBottom: 16,
  },
  ocrSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  ocrTextContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    maxHeight: 150,
  },
  ocrText: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    fontFamily: 'monospace', // Use monospace for better readability of OCR text
  },
  ocrDisclaimer: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },

  // Enhanced error/success cards
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  // Enhanced progress indicators
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    // transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
    minWidth: 40,
  },
  progressMessage: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressSubtext: {
    fontSize: 12,
    color: '#6c757d',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },

  // Processing card enhancements
  processingCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  processingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 8,
  },

  // Error and success card enhancements
  errorCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  successCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#27ae60',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
  },
});

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
  ...additionalStyles
});