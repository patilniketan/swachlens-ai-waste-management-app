import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './AuthContext';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import Loading from '../components/Loading';

function RootSwitch() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    // App launch -> checking AsyncStorage for an existing token.
    return <Loading label="Starting up…" />;
  }

  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}

export default function RootNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootSwitch />
      </NavigationContainer>
    </AuthProvider>
  );
}
