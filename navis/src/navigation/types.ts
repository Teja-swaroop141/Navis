/**
 * Navigation type definitions for React Navigation
 */

export type RootStackParamList = {
  Home: undefined;
  ModeSelection: undefined;
  Navigation: { mode: 'LIVE' | 'DEMO' };
  Performance: undefined;
  Simulation: undefined;
  UrbanCanyon: undefined;
  ScenarioSelect: undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  SimulationTab: undefined;
  SensorsTab: undefined;
  AnalysisTab: undefined;
  FusionTab: undefined;
};

