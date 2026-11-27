import { Tabs } from "expo-router";
import { BottomNavigation } from "react-native-paper";

const tabConfig = [
  {
    routeName: "index",
    title: "Inicio",
    focusedIcon: "home",
    unfocusedIcon: "home-outline",
  },
  {
    routeName: "clientes",
    title: "Clientes",
    focusedIcon: "account-group",
    unfocusedIcon: "account-group-outline",
  },
  {
    routeName: "productos",
    title: "Productos",
    focusedIcon: "package-variant",
    unfocusedIcon: "package-variant-closed",
  },
  {
    routeName: "ventas/index",
    title: "Ventas",
    focusedIcon: "cart",
    unfocusedIcon: "cart-outline",
  },
];

export default function MainTabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, insets, navigateToTab }) => {
        const routes = state.routes.flatMap((route) => {
          const config = tabConfig.find(
            (tab) => tab.routeName === route.name,
          );

          return config ? [{ ...config, key: route.key }] : [];
        });
        const selectedIndex = routes.findIndex(
          (route) => route.key === state.routes[state.index]?.key,
        );

        return (
          <BottomNavigation.Bar
            navigationState={{ index: Math.max(selectedIndex, 0), routes }}
            safeAreaInsets={insets}
            keyboardHidesNavigationBar
            activeColor="#2563EB"
            inactiveColor="#64748B"
            style={{ backgroundColor: "#FFFFFF" }}
            onTabPress={({ route }) => navigateToTab(route.key)}
          />
        );
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio" }} />
      <Tabs.Screen name="clientes" options={{ title: "Clientes" }} />
      <Tabs.Screen name="productos" options={{ title: "Productos" }} />
      <Tabs.Screen name="ventas" options={{ title: "Ventas" }} />
    </Tabs>
  );
}
