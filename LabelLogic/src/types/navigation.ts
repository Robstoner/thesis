export type RootStackParamList = {
  // Stack Navigator
  Main: undefined;
  Auth: undefined;

  // Auth Stack
  Login: undefined;
  Register: undefined;
  
  // Main Stack
  FoodList: undefined;
  AddFood: undefined;
  FoodDetail: { foodId: number };
};