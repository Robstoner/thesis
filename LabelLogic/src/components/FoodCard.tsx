import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Food } from '../types';

interface FoodCardProps {
  food: Food;
  onPress: () => void;
}

export default function FoodCard({ food, onPress }: FoodCardProps) {
  const getProcessingColor = (score?: number) => {
    if (!score) return '#95a5a6';
    if (score <= 2) return '#27ae60';
    if (score <= 3) return '#f39c12';
    return '#e74c3c';
  };

  const getProcessingLabel = (score?: number) => {
    if (!score) return 'Unknown';
    if (score <= 2) return 'Minimally Processed';
    if (score <= 3) return 'Processed';
    return 'Ultra-Processed';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.name}>{food.name}</Text>
        {food.brand && <Text style={styles.brand}>{food.brand}</Text>}
        
        {food.processing_status === 'processing' && (
          <View style={styles.processingBadge}>
            <ActivityIndicator size="small" color="#f39c12" />
            <Text style={styles.processingBadgeText}>Analyzing...</Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.nutritionRow}>
          {food.calories_per_100g && (
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{Math.round(food.calories_per_100g)}</Text>
              <Text style={styles.nutritionLabel}>kcal</Text>
            </View>
          )}
          
          {food.protein_per_100g && (
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{food.protein_per_100g.toFixed(1)}g</Text>
              <Text style={styles.nutritionLabel}>protein</Text>
            </View>
          )}
          
          {food.carbs_per_100g && (
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{food.carbs_per_100g.toFixed(1)}g</Text>
              <Text style={styles.nutritionLabel}>carbs</Text>
            </View>
          )}
          
          {food.fat_per_100g && (
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionValue}>{food.fat_per_100g.toFixed(1)}g</Text>
              <Text style={styles.nutritionLabel}>fat</Text>
            </View>
          )}
        </View>
        
        {food.processing_score && (
          <View style={styles.processingBadge}>
            <View 
              style={[
                styles.processingDot, 
                { backgroundColor: getProcessingColor(food.processing_score) }
              ]} 
            />
            <Text style={styles.processingText}>
              {getProcessingLabel(food.processing_score)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  header: {
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  brand: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  content: {
    gap: 12,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  processingText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  processingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  processingBadgeText: {
    color: '#856404',
    fontSize: 12,
    marginLeft: 4,
  },
});