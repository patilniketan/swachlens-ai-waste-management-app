import React from 'react';
import { Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/home/HomeScreen';
import ReportWasteScreen from '../screens/complaints/ReportWasteScreen';
import MyComplaintsScreen from '../screens/complaints/MyComplaintsScreen';
import ComplaintDetailsScreen from '../screens/complaints/ComplaintDetailsScreen';
import NearbyComplaintsScreen from '../screens/complaints/NearbyComplaintsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SubmissionResultScreen from '../screens/complaints/SubmissionResultScreen';
import type { CreateComplaintResponse } from '../services/complaint';
import { colors } from '../constants/colors';

export type ComplaintsStackParamList = {
  ComplaintDetails: { id: string };
};

export type HomeStackParamList = {
  HomeMain: undefined;
  ReportWaste: undefined;
  // What the AI made of a just-submitted report.
  SubmissionResult: { result: CreateComplaintResponse };
} & ComplaintsStackParamList;

export type MyComplaintsStackParamList = {
  MyComplaintsMain: undefined;
} & ComplaintsStackParamList;

export type NearbyStackParamList = {
  NearbyMain: undefined;
} & ComplaintsStackParamList;

const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const MyComplaintsStack = createNativeStackNavigator<MyComplaintsStackParamList>();
const NearbyStack = createNativeStackNavigator<NearbyStackParamList>();
const ProfileStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackHeaderOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerShadowVisible: false,
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '700' as const },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackHeaderOptions}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen
        name="ReportWaste"
        component={ReportWasteScreen}
        options={{ title: 'Report Waste' }}
      />
      <HomeStack.Screen
        name="SubmissionResult"
        component={SubmissionResultScreen}
        options={{ title: 'Report Submitted', headerBackVisible: false, gestureEnabled: false }}
      />
      <HomeStack.Screen
        name="ComplaintDetails"
        component={ComplaintDetailsScreen}
        options={{ title: 'Complaint Details' }}
      />
    </HomeStack.Navigator>
  );
}

function MyComplaintsStackNavigator() {
  return (
    <MyComplaintsStack.Navigator screenOptions={stackHeaderOptions}>
      <MyComplaintsStack.Screen
        name="MyComplaintsMain"
        component={MyComplaintsScreen}
        options={{ title: 'My Complaints' }}
      />
      <MyComplaintsStack.Screen
        name="ComplaintDetails"
        component={ComplaintDetailsScreen}
        options={{ title: 'Complaint Details' }}
      />
    </MyComplaintsStack.Navigator>
  );
}

function NearbyStackNavigator() {
  return (
    <NearbyStack.Navigator screenOptions={stackHeaderOptions}>
      <NearbyStack.Screen
        name="NearbyMain"
        component={NearbyComplaintsScreen}
        options={{ title: 'Nearby Complaints' }}
      />
      <NearbyStack.Screen
        name="ComplaintDetails"
        component={ComplaintDetailsScreen}
        options={{ title: 'Complaint Details' }}
      />
    </NearbyStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackHeaderOptions}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
    </ProfileStack.Navigator>
  );
}

const TAB_ICON: Record<string, string> = {
  Home: '⌂',
  MyComplaints: '☰',
  Nearby: '◎',
  Profile: '☺',
};

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 18, color }}>{TAB_ICON[route.name] ?? '•'}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} options={{ title: 'Home' }} />
      <Tab.Screen
        name="MyComplaints"
        component={MyComplaintsStackNavigator}
        options={{ title: 'Complaints' }}
      />
      <Tab.Screen name="Nearby" component={NearbyStackNavigator} options={{ title: 'Nearby' }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
