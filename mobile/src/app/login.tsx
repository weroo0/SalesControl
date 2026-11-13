import { useState } from "react";

import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/services/api";

export default function LoginScreen() {
    const {signIn} = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleLogin() {
        if(!email.trim() || !password){
            setError('Ingresa tu correo y contraseña.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            await signIn(email, password);
            setPassword('');
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setError('Correo o contraseña incorrectos');
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Ocurrió un error inesperado.',
                );
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>SalesControl</Text>

                <Text style={styles.subtitle}>Inicia sesion para continuar</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Correo electrónico"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />   

                {error ? (
                    <Text style={styles.error}>{error}</Text>
                ) : null}     

                <Pressable
                    style={[
                        styles.button,
                        loading && styles.buttonDisabled,
                    ]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF"/>
                    ) : (
                        <Text style={styles.buttonText}>Iniciar sesión</Text>
                    )

                    }
                    
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
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
    color: '#162033',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  input: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
  },
});