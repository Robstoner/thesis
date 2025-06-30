export type RootStackParamList = {
  // Stack Navigator
  Main: undefined;
  Auth: undefined;

  // Auth Stack
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  CodeVerification: { email: string };
  ResetPassword: { token: string };
  
  // Main Stack
  FoodList: undefined;
  AddFood: undefined;
  FoodDetail: { foodId: number };
};