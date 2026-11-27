import { useState } from "react";

import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";

import { TextInput, Text } from "react-native-paper";

import { SafeAreaView } from "react-native-safe-area-context";

import { ApiError } from "@/services/api";
import { useRouter } from "expo-router";
import { authService } from "@/services/auth.service";
import { useAuthenticatedRequest } from "@/hooks/useAuthenticatedRequest";

export default function RegisterScreen() {

    const router = useRouter();
    const request = useAuthenticatedRequest();
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleRegister() {
        if (!email.trim() || !password || !nombre) {
            setError('Ingresa tus datos.');
            return;
        }
        setLoading(true);
        setError('');

        const passwordLimpio = password.trim(); 

        try {
            await authService.register(request, {
                nombre: nombre,
                email: email,
                password: passwordLimpio
            });
            Alert.alert('exito', 'usuario nuevo registrado', [{ text: 'ta bien' }]);
            router.back();
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 400) {
                    setError('Datos inválidos')
                } else if (err.status === 409) {
                    setError('El correo ya fue registrado');
                } else {
                    setError(err.message);
                }
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

                <Text style={styles.subtitle}>Registra una nueva cuenta</Text>


                <TextInput
                    style={styles.input}
                    placeholder="Nombre"
                    value={nombre}
                    onChangeText={setNombre}
                />

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
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.buttonText}>Registrar usuario</Text>
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
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFFFFF',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#111111',
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