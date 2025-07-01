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
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedBrand, setEditedBrand] = useState('');
  const [newNutritionImage, setNewNutritionImage] = useState<string | null>(null);
  const [newIngredientsImage, setNewIngredientsImage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [editedNutrition, setEditedNutrition] = useState({
    calories_per_100g: '',
    protein_per_100g: '',
    carbs_per_100g: '',
    fat_per_100g: '',
    saturated_fat_per_100g: '',
    fiber_per_100g: '',
    sugar_per_100g: '',
    sodium_per_100g: '',
  });
  
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
      setEditedName(foodData.name);
      setEditedBrand(foodData.brand || '');
      
      // Initialize nutrition values
      setEditedNutrition({
        calories_per_100g: foodData.calories_per_100g?.toString() || '',
        protein_per_100g: foodData.protein_per_100g?.toString() || '',
        carbs_per_100g: foodData.carbs_per_100g?.toString() || '',
        fat_per_100g: foodData.fat_per_100g?.toString() || '',
        saturated_fat_per_100g: foodData.saturated_fat_per_100g?.toString() || '',
        fiber_per_100g: foodData.fiber_per_100g?.toString() || '',
        sugar_per_100g: foodData.sugar_per_100g?.toString() || '',
        sodium_per_100g: foodData.sodium_per_100g?.toString() || '',
      });

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

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedName(food?.name || '');
    setEditedBrand(food?.brand || '');
    setNewNutritionImage(null);
    setNewIngredientsImage(null);
    
    // Reset nutrition values to current food data
    if (food) {
      setEditedNutrition({
        calories_per_100g: food.calories_per_100g?.toString() || '',
        protein_per_100g: food.protein_per_100g?.toString() || '',
        carbs_per_100g: food.carbs_per_100g?.toString() || '',
        fat_per_100g: food.fat_per_100g?.toString() || '',
        saturated_fat_per_100g: food.saturated_fat_per_100g?.toString() || '',
        fiber_per_100g: food.fiber_per_100g?.toString() || '',
        sugar_per_100g: food.sugar_per_100g?.toString() || '',
        sodium_per_100g: food.sodium_per_100g?.toString() || '',
      });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedName(food?.name || '');
    setEditedBrand(food?.brand || '');
    setNewNutritionImage(null);
    setNewIngredientsImage(null);
    
    // Reset nutrition values
    if (food) {
      setEditedNutrition({
        calories_per_100g: food.calories_per_100g?.toString() || '',
        protein_per_100g: food.protein_per_100g?.toString() || '',
        carbs_per_100g: food.carbs_per_100g?.toString() || '',
        fat_per_100g: food.fat_per_100g?.toString() || '',
        saturated_fat_per_100g: food.saturated_fat_per_100g?.toString() || '',
        fiber_per_100g: food.fiber_per_100g?.toString() || '',
        sugar_per_100g: food.sugar_per_100g?.toString() || '',
        sodium_per_100g: food.sodium_per_100g?.toString() || '',
      });
    }
  };

  const handleImagePicker = async (type: 'nutrition' | 'ingredients') => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        {
          text: 'Take Photo',
          onPress: () => openCamera(type),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => openGallery(type),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCamera = async (type: 'nutrition' | 'ingredients') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'nutrition') {
          setNewNutritionImage(result.assets[0].uri);
        } else {
          setNewIngredientsImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const openGallery = async (type: 'nutrition' | 'ingredients') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant photo library permissions to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        if (type === 'nutrition') {
          setNewNutritionImage(result.assets[0].uri);
        } else {
          setNewIngredientsImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleSaveEdit = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Food name is required');
      return;
    }

    setUpdating(true);
    try {
      const formData = new FormData();
      
      // Add text fields
      formData.append('name', editedName.trim());
      if (editedBrand.trim()) {
        formData.append('brand', editedBrand.trim());
      }
      
      // Add nutrition fields if they have values
      Object.entries(editedNutrition).forEach(([key, value]) => {
        if (value.trim()) {
          const numValue = parseFloat(value.trim());
          if (!isNaN(numValue) && numValue >= 0) {
            formData.append(key, numValue.toString());
          }
        }
      });

      // Add image files if new ones were selected
      if (newNutritionImage) {
        formData.append('nutrition_image', {
          uri: newNutritionImage,
          type: 'image/jpeg',
          name: 'nutrition.jpg',
        } as any);
      }

      if (newIngredientsImage) {
        formData.append('ingredients_image', {
          uri: newIngredientsImage,
          type: 'image/jpeg',
          name: 'ingredients.jpg',
        } as any);
      }

      const updatedFood = await FoodService.updateFood(foodId, formData);
      setFood(updatedFood);
      
      // Reload images if they were updated
      if (newNutritionImage && updatedFood.nutrition_image_path) {
        await loadNutritionImage();
      }
      if (newIngredientsImage && updatedFood.ingredients_image_path) {
        await loadIngredientsImage();
      }

      setIsEditing(false);
      setNewNutritionImage(null);
      setNewIngredientsImage(null);
      
      Alert.alert('Success', 'Food updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setUpdating(false);
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

  const renderEditableNutritionInfo = () => {
    const nutritionFields = [
      { key: 'calories_per_100g', label: 'Calories', unit: 'kcal', placeholder: '0' },
      { key: 'protein_per_100g', label: 'Protein', unit: 'g', placeholder: '0.0' },
      { key: 'carbs_per_100g', label: 'Carbohydrates', unit: 'g', placeholder: '0.0' },
      { key: 'fat_per_100g', label: 'Fat', unit: 'g', placeholder: '0.0' },
      { key: 'saturated_fat_per_100g', label: 'Saturated Fat', unit: 'g', placeholder: '0.0' },
      { key: 'fiber_per_100g', label: 'Fiber', unit: 'g', placeholder: '0.0' },
      { key: 'sugar_per_100g', label: 'Sugar', unit: 'g', placeholder: '0.0' },
      { key: 'sodium_per_100g', label: 'Sodium', unit: 'mg', placeholder: '0' },
    ];

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nutrition Information (per 100g)</Text>
        <Text style={styles.editSubtitle}>Edit values extracted by AI or leave blank to keep current</Text>
        <View style={styles.nutritionEditGrid}>
          {nutritionFields.map((field) => (
            <View key={field.key} style={styles.nutritionEditItem}>
              <Text style={styles.nutritionEditLabel}>{field.label}</Text>
              <View style={styles.nutritionInputContainer}>
                <TextInput
                  style={styles.nutritionInput}
                  value={editedNutrition[field.key as keyof typeof editedNutrition]}
                  onChangeText={(text) => setEditedNutrition(prev => ({
                    ...prev,
                    [field.key]: text
                  }))}
                  placeholder={field.placeholder}
                  keyboardType="numeric"
                />
                <Text style={styles.nutritionUnit}>{field.unit}</Text>
              </View>
            </View>
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
        <View style={styles.headerButtons}>
          {isEditing ? (
            <>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, updating && styles.buttonDisabled]} 
                onPress={handleSaveEdit}
                disabled={updating}
              >
                <Text style={styles.saveText}>
                  {updating ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={handleStartEdit}
              >
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={handleDelete}
              >
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#27ae60']}
            tintColor="#27ae60"
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
          {isEditing ? (
            <>
              <Text style={styles.editLabel}>Food Name</Text>
              <TextInput
                style={styles.editInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter food name"
              />
              <Text style={styles.editLabel}>Brand (Optional)</Text>
              <TextInput
                style={styles.editInput}
                value={editedBrand}
                onChangeText={setEditedBrand}
                placeholder="Enter brand name"
              />
            </>
          ) : (
            <>
              <Text style={styles.foodName}>{food.name}</Text>
              {food.brand && <Text style={styles.foodBrand}>{food.brand}</Text>}
            </>
          )}
          
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
        {(food.nutrition_image_path || newNutritionImage || isEditing) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nutrition Label</Text>
              {isEditing && (
                <TouchableOpacity 
                  style={styles.imageEditButton}
                  onPress={() => handleImagePicker('nutrition')}
                >
                  <Text style={styles.imageEditText}>Change Image</Text>
                </TouchableOpacity>
              )}
            </View>
            {newNutritionImage ? (
              <Image 
                source={{ uri: newNutritionImage }} 
                style={styles.image}
                resizeMode="contain"
              />
            ) : nutritionImageUrl ? (
              <Image 
                source={{ uri: nutritionImageUrl }} 
                style={styles.image}
                resizeMode="contain"
              />
            ) : isEditing ? (
              <TouchableOpacity 
                style={styles.imageUploadPlaceholder}
                onPress={() => handleImagePicker('nutrition')}
              >
                <Text style={styles.imageUploadText}>+ Add Nutrition Image</Text>
              </TouchableOpacity>
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
        {isEditing ? renderEditableNutritionInfo() : renderNutritionInfo()}

        {/* Ingredients Image */}
        {(food.ingredients_image_path || newIngredientsImage || isEditing) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ingredients Photo</Text>
              {isEditing && (
                <TouchableOpacity 
                  style={styles.imageEditButton}
                  onPress={() => handleImagePicker('ingredients')}
                >
                  <Text style={styles.imageEditText}>Change Image</Text>
                </TouchableOpacity>
              )}
            </View>
            {newIngredientsImage ? (
              <Image 
                source={{ uri: newIngredientsImage }} 
                style={styles.image}
                resizeMode="contain"
              />
            ) : ingredientsImageUrl ? (
              <Image 
                source={{ uri: ingredientsImageUrl }} 
                style={styles.image}
                resizeMode="contain"
              />
            ) : isEditing ? (
              <TouchableOpacity 
                style={styles.imageUploadPlaceholder}
                onPress={() => handleImagePicker('ingredients')}
              >
                <Text style={styles.imageUploadText}>+ Add Ingredients Image</Text>
              </TouchableOpacity>
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
  // Edit mode styles
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#27ae60',
    borderRadius: 6,
  },
  editText: {
    color: 'white',
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#6c757d',
    borderRadius: 6,
  },
  cancelText: {
    color: 'white',
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#27ae60',
    borderRadius: 6,
  },
  saveText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 12,
  },
  editInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  imageEditButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#007bff',
    borderRadius: 4,
  },
  imageEditText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  imageUploadPlaceholder: {
    width: width - 64,
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#27ae60',
    borderStyle: 'dashed',
  },
  imageUploadText: {
    color: '#27ae60',
    fontSize: 16,
    fontWeight: '600',
  },
  // Nutrition editing styles
  editSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  nutritionEditGrid: {
    gap: 12,
  },
  nutritionEditItem: {
    marginBottom: 12,
  },
  nutritionEditLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 6,
  },
  nutritionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  nutritionInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  nutritionUnit: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    marginLeft: 8,
  },
  ...additionalStyles
});