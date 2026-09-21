/**
 * Navigation type definitions for React Navigation
 */

export type RootStackParamList = {
  Home: undefined;
  ModeSelection: undefined;
  Navigation: { mode: 'LIVE' | 'DEMO' };
  Performance: undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  SensorsTab: undefined;
  AnalysisTab: undefined;
  FusionTab: undefined;
};
