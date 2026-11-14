import { useState } from "react";
import { useRouter } from "expo-router";

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthenticatedRequest } from "@/hooks/useAuthenticatedRequest";
import { clienteService } from "@/services/cliente.service";
import { ApiError } from "@/services/api";

import type { CrearClienteInput } from "@/types/cliente.types";

export default function NuevoClienteScreen() {
    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');

    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function guardarCliente() {
        if (guardando) return;

        const nombreLimpio = nombre.trim();
        const telefonoLimpio = telefono.trim();

        if(!nombreLimpio) {
            setError('El nombre del cliente es obligatorio')
            return;
        }

        setGuardando(true);
        setError(null);

        try {
            const datos: CrearClienteInput = {
                nombre: nombreLimpio,
                ...(telefonoLimpio ? {telefono : telefonoLimpio} : {}),
            };

            await clienteService.crear(request, datos);

            router.back();
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 401) {
                    return;
                }

                if (err.status === 403) {
                    setError('No tienes permiso para registrar clientes');
                } else {
                    setError(err.message);
                }
            } else {
                setError(
                    err instanceof Error ? err.message : 'No fue posible registrar el cliente'
                );
            }
        } finally {
            setGuardando(false);
        }
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <Pressable onPress={() => router.back()} disabled={guardando}>
                    <Text style={styles.back}>Volver</Text>
                </Pressable>

                <Text style={styles.title}>Registrar cliente</Text>

                <Text style={styles.subtitle}>ingresa la información de un nuevo cliente</Text>

                <View style={styles.form}>
                    <Text style={styles.label}>Nombre completo</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Luis Enrique"
                        value={nombre}
                        onChangeText={setNombre}
                        autoCapitalize="words"
                        autoCorrect={false}
                        maxLength={150}
                        editable={!guardando}
                    />

                    <Text style={styles.label}>Teléfono (opcional)</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Ej. 7712345678"
                        value={telefono}
                        onChangeText={setTelefono}
                        keyboardType="phone-pad"
                        maxLength={20}
                        editable={!guardando}
                    />

                    {error ? (
                        <Text style={styles.error}>{error}</Text>
                    ) : null}

                    <Pressable style={[styles.button, guardando && styles.buttonDisabled]} onPress={guardarCliente} disabled={guardando}>
                        {guardando ? (
                            <ActivityIndicator color="#FFFFFF"/>
                        ) : (
                            <Text style={styles.buttonText}>Guardar cliente</Text>
                        )}
                    </Pressable>

                    <Text style={styles.helper}>Campo obligatorio</Text>

                </View>
            </ScrollView>
        </SafeAreaView>
    );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 24,
    gap: 16,
    flexGrow: 1,
  },
  back: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#162033',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  form: {
    marginTop: 12,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#162033',
  },
  button: {
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#2563EB',
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
    fontSize: 14,
  },
  helper: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
  },
});
