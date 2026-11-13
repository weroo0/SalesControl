import { useEffect } from "react";
import { SplashScreen, Stack } from "expo-router";

import { AuthProvider, useAuth } from "@/context/AuthContext";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return(
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}

function RootNavigator() {
  const {token, isLoading} = useAuth();

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <Stack screenOptions={{headerShown: false}}>
      <Stack.Protected guard={Boolean(token)}>
        <Stack.Screen name="(app)"/>
      </Stack.Protected>

      <Stack.Protected guard={!token}>
        <Stack.Screen name="login"/>
      </Stack.Protected>      

    </Stack>
  )
}