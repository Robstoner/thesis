import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import FoodService from '../../services/FoodService';

interface AddFoodScreenProps {
  navigation: any;
}

export default function AddFoodScreen({ navigation }: AddFoodScreenProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [nutritionImage, setNutritionImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [ingredientsImage, setIngredientsImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images.');
      return false;
    }
    return true;
  };

  const selectImage = async (type: 'nutrition' | 'ingredients') => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => openCamera(type) },
        { text: 'Gallery', onPress: () => openGallery(type) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const openCamera = async (type: 'nutrition' | 'ingredients') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
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
        setNutritionImage(result.assets[0]);
      } else {
        setIngredientsImage(result.assets[0]);
      }
    }
  };

  const openGallery = async (type: 'nutrition' | 'ingredients') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'nutrition') {
        setNutritionImage(result.assets[0]);
      } else {
        setIngredientsImage(result.assets[0]);
      }
    }
  };

  const removeImage = (type: 'nutrition' | 'ingredients') => {
    if (type === 'nutrition') {
      setNutritionImage(null);
    } else {
      setIngredientsImage(null);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a food name');
      return;
    }

    if (!nutritionImage && !ingredientsImage) {
      Alert.alert('Error', 'Please add at least one image');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      formData.append('name', name.trim());
      if (brand.trim()) {
        formData.append('brand', brand.trim());
      }
      
      if (nutritionImage) {
        formData.append('nutrition_image', {
          uri: nutritionImage.uri,
          type: 'image/jpeg',
          name: 'nutrition.jpg',
        } as any);
      }
      
      if (ingredientsImage) {
        formData.append('ingredients_image', {
          uri: ingredientsImage.uri,
          type: 'image/jpeg',
          name: 'ingredients.jpg',
        } as any);
      }

      await FoodService.createFood(formData);
      
      Alert.alert(
        'Success', 
        'Food added successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Food</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Food Information</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Food Name *"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Brand (optional)"
          value={brand}
          onChangeText={setBrand}
          autoCapitalize="words"
        />

        <Text style={styles.sectionTitle}>Nutrition Information</Text>
        
        <View style={styles.imageSection}>
          <Text style={styles.imageLabel}>Nutrition Label Photo</Text>
          {nutritionImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: nutritionImage.uri }} style={styles.imagePreview} />
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removeImage('nutrition')}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.imageButton}
              onPress={() => selectImage('nutrition')}
            >
              <Text style={styles.imageButtonText}>📸 Add Nutrition Photo</Text>
              <Text style={styles.imageButtonSubtext}>Tap to take photo or select from gallery</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Ingredients</Text>
        
        <View style={styles.imageSection}>
          <Text style={styles.imageLabel}>Ingredients List Photo</Text>
          {ingredientsImage ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: ingredientsImage.uri }} style={styles.imagePreview} />
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => removeImage('ingredients')}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.imageButton}
              onPress={() => selectImage('ingredients')}
            >
              <Text style={styles.imageButtonText}>📋 Add Ingredients Photo</Text>
              <Text style={styles.imageButtonSubtext}>Tap to take photo or select from gallery</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Add Food</Text>
          )}
        </TouchableOpacity>

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
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  imageSection: {
    marginBottom: 24,
  },
  imageLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  imageButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#27ae60',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageButtonText: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: '600',
    marginBottom: 4,
  },
  imageButtonSubtext: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  imageContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    resizeMode: 'cover',
  },
  removeButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});