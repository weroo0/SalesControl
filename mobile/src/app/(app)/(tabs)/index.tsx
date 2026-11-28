import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  Icon,
  Surface,
  Text,
  TouchableRipple,
} from 'react-native-paper';
import { Href, Link } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

interface OpcionMenu {
  titulo: string;
  ruta: Href;
  icono: string;
  colorIcono: string;
  fondoIcono: string;
  destacado?: boolean;
}

const OPCIONES_MENU: OpcionMenu[] = [
  {
    titulo: 'Nueva venta',
    ruta: '/ventas/nueva',
    icono: 'cart-plus',
    colorIcono: '#2563EB',
    fondoIcono: '#DBEAFE',
    destacado: true,
  },
  {
    titulo: 'Registrar un pago',
    ruta: '/pagos/nuevo',
    icono: 'cash-plus',
    colorIcono: '#059669',
    fondoIcono: '#D1FAE5',
    destacado: true
  },
  {
    titulo: 'Ver categorías',
    ruta: '/categorias',
    icono: 'tag-multiple-outline',
    colorIcono: '#D97706',
    fondoIcono: '#FEF3C7',
  },
  {
    titulo: 'Historial de pagos',
    ruta: '/pagos/historial',
    icono: 'receipt-text-clock-outline',
    colorIcono: '#0284C7',
    fondoIcono: '#E0F2FE',
  },
  {
    titulo: 'Registrar cuenta',
    ruta: '/register',
    icono: 'account-plus-outline',
    colorIcono: '#7C3AED',
    fondoIcono: '#EDE9FE',
  },
];

export default function HomeScreen() {
  const { signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que deseas salir de SalesControl?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          void signOut().catch((error: unknown) => {
            console.error('Error al cerrar sesión:', error);
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={styles.appbar}>
        <Appbar.Content
          title="SalesControl"
          titleStyle={styles.appbarTitle}
        />
        <Appbar.Action
          icon="logout"
          iconColor="#DC2626"
          accessibilityLabel="Cerrar sesión"
          onPress={handleSignOut}
        />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {OPCIONES_MENU.map((opcion) => (
            <Surface
              key={opcion.titulo}
              elevation={1}
              style={[
                styles.card,
                opcion.destacado && styles.cardDestacada,
              ]}
            >
              <Link href={opcion.ruta} asChild>
                <TouchableRipple style={styles.touchable} borderless>
                  <View style={styles.cardInner}>
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: opcion.fondoIcono },
                      ]}
                    >
                      <Icon
                        source={opcion.icono}
                        size={30}
                        color={opcion.colorIcono}
                      />
                    </View>

                    <Text variant="titleMedium" style={styles.cardText}>
                      {opcion.titulo}
                    </Text>
                  </View>
                </TouchableRipple>
              </Link>
            </Surface>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  appbar: {
    backgroundColor: '#FFFFFF',
  },
  appbarTitle: {
    fontWeight: '700',
    color: '#162033',
  },
  content: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  card: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  cardDestacada: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  touchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  cardInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    fontWeight: '600',
    textAlign: 'center',
    color: '#162033',
  },
});