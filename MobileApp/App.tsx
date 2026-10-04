/**
 * SwachhLens AI — citizen mobile app
 * App.tsx stays intentionally thin: it only mounts the safe-area provider
 * and the RootNavigator, which itself decides between AuthNavigator and
 * AppNavigator based on whether a session exists.
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
