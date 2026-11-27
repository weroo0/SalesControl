import { useEffect } from "react";
import { SplashScreen, Stack } from "expo-router";
import { MD3LightTheme, PaperProvider } from "react-native-paper";

import { AuthProvider, useAuth } from "@/context/AuthContext";

void SplashScreen.preventAutoHideAsync();

const paperTheme = {
  ...MD3LightTheme,
  roundness: 12,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#2563EB",
    background: "#F5F7FA",
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <PaperProvider theme={paperTheme}>
        <RootNavigator />
      </PaperProvider>
    </AuthProvider>
  );
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
      <Stack.Protected guard={!isLoading && Boolean(token)}>
        <Stack.Screen name="(app)"/>
      </Stack.Protected>

      <Stack.Protected guard={isLoading || !token}>
        <Stack.Screen name="login"/>
      </Stack.Protected>      

    </Stack>
  )
}
