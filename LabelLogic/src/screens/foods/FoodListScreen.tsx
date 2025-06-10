import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Food } from "../../types";
import FoodService from "../../services/FoodService";
import { useAuth } from "../../context/AuthContext";

interface FoodListScreenProps {
  navigation: any;
}

export default function FoodListScreen({ navigation }: FoodListScreenProps) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout, user } = useAuth();

  useEffect(() => {
    // Listen for focus to reload foods when returning from AddFood
    const unsubscribe = navigation.addListener("focus", () => {
      loadFoods();
    });

    return unsubscribe;
  }, [navigation]);

  const loadFoods = async () => {
    try {
      const response = await FoodService.getFoods();
      setFoods(response.items);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  const renderFood = ({ item }: { item: Food }) => (
    <TouchableOpacity
      style={styles.foodCard}
      onPress={() => navigation.navigate("FoodDetail", { foodId: item.id })}
    >
      <Text style={styles.foodName}>{item.name}</Text>
      {item.brand && <Text style={styles.foodBrand}>{item.brand}</Text>}

      <View style={styles.nutritionRow}>
        {item.calories_per_100g && (
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>
              {Math.round(item.calories_per_100g)}
            </Text>
            <Text style={styles.nutritionLabel}>kcal</Text>
          </View>
        )}
        {item.protein_per_100g && (
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>
              {item.protein_per_100g.toFixed(1)}g
            </Text>
            <Text style={styles.nutritionLabel}>protein</Text>
          </View>
        )}
        {item.carbs_per_100g && (
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>
              {item.carbs_per_100g.toFixed(1)}g
            </Text>
            <Text style={styles.nutritionLabel}>carbs</Text>
          </View>
        )}
        {item.fat_per_100g && (
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>
              {item.fat_per_100g.toFixed(1)}g
            </Text>
            <Text style={styles.nutritionLabel}>fat</Text>
          </View>
        )}
      </View>

      {item.processing_score && (
        <View style={styles.processingBadge}>
          <View
            style={[
              styles.processingDot,
              { backgroundColor: getProcessingColor(item.processing_score) },
            ]}
          />
          <Text style={styles.processingText}>
            Processing Score: {item.processing_score}/5
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const getProcessingColor = (score: number) => {
    if (score <= 2) return "#27ae60";
    if (score <= 3) return "#f39c12";
    return "#e74c3c";
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No foods yet</Text>
      <Text style={styles.emptySubtext}>
        Add your first food to get started!
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.loadingText}>Loading your foods...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Foods</Text>
        <Text style={styles.userText}>Hello, {user?.username}!</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={foods}
        renderItem={renderFood}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          foods.length === 0 ? styles.emptyList : undefined
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("AddFood")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  userText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 4,
    marginBottom: 12,
  },
  logoutButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#e74c3c",
    borderRadius: 6,
  },
  logoutText: {
    color: "white",
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#7f8c8d",
  },
  foodCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  foodName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 4,
  },
  foodBrand: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 12,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2c3e50",
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    marginTop: 2,
  },
  processingBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  processingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  processingText: {
    fontSize: 12,
    color: "#7f8c8d",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#7f8c8d",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#95a5a6",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#27ae60",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 24,
    color: "white",
    fontWeight: "bold",
  },
});
