import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'expo-router';

export default function HomeScreen() {
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Bienvenido a SalesControl
        </Text>

        <Text style={styles.subtitle}>
          Has iniciado sesión correctamente.
        </Text>

        <Text style={styles.description}>
          Esta pantalla está protegida mediante Expo Router.
        </Text>

        <Link href="/categorias" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Ver categorias</Text>
          </Pressable>
        </Link>

        <Link href="/ventas/nueva" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>
              Hacer venta
            </Text>
          </Pressable>
        </Link>

        <Link href="/pagos/nuevo" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>
              Registrar un pago
            </Text>
          </Pressable>
        </Link>

        <Link href="/pagos/historial" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>
              Historial de pagos
            </Text>
          </Pressable>
        </Link>

        <Link href="/register" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Registra tu cuenta</Text>
          </Pressable>
        </Link>

        <Pressable
          style={styles.button}
          onPress={() => {
            void signOut().catch((error: unknown) => {
              console.error('Error al cerrar sesión:', error);
            });
          }}
        >
          <Text style={styles.buttonText}>
            Cerrar sesión
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: '#162033',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#16845D',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: '#64748B',
  },
  button: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
