import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthenticatedRequest } from "@/hooks/useAuthenticatedRequest";
import { clienteService } from "@/services/cliente.service";
import { ApiError } from "@/services/api";

import type { Cliente, ActualizarClienteInput } from "@/types/cliente.types";

export default function EditarClienteScreen() {
    const {id} = useLocalSearchParams<{id: string}>();
    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [clienteOriginal, setClienteOriginal] = useState<Cliente | null>(null);

    const [nombre, setNombre] = useState('');
    const [telefono, setTelefono] = useState('');

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
    
        let vigente = true;

        async function cargarCliente() {
            const clienteId = Number(id);

            if(!Number.isSafeInteger(clienteId) || clienteId <= 0) {
                setError('Identificador de cliente inválido');
                setCargando(false);
                return;
            }

            setCargando(true);
            setError(null);
            setClienteOriginal(null);

            try {
                const cliente = await clienteService.obtenerPorId(
                    request,
                    clienteId,
                );

                if (!vigente) return;

                setClienteOriginal(cliente);
                setNombre(cliente.nombre);
                setTelefono(cliente.telefono ?? '');
            } catch (err) {
                if (!vigente) return;

                if (err instanceof ApiError && err.status === 401) {
                    return;
                }

                if (err instanceof ApiError && err.status === 404) {
                    setError('El cliente no existe');
                } else {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'No se pudo cargar el cliente',
                    );
                }
            } finally {
                if (vigente) {
                    setCargando(false);
                }
            }
        }

        void cargarCliente();

        return () => {
            vigente = false;
        };
    }, [id, request, recarga]);

    async function guardarCambios() {
        if (!clienteOriginal || guardando) return;

        const nombreLimpio = nombre.trim();
        const telefonoLimpio = telefono.trim();

        if (!nombreLimpio) {
            setError('El nombre es obligatorio.')
            return;
        }

        const cambios: ActualizarClienteInput = {};

        if (nombreLimpio !== clienteOriginal.nombre) {
            cambios.nombre = nombreLimpio;
        }

        const telefonoOriginal = clienteOriginal.telefono ?? '';

        if(telefonoLimpio !== telefonoOriginal) {
            cambios.telefono = telefonoLimpio || null;
        }

        if (Object.keys(cambios).length === 0) {
            setError('No hay cambios para guardar');
            return;
        }

        setGuardando(true);
        setError(null);

        try {
            await clienteService.actualizar(
                request,
                clienteOriginal.id,
                cambios,
            );

            router.back();
        } catch (err) {
            if (err instanceof ApiError) {
                if(err.status === 401) {
                    return;
                }

                if(err.status === 403) {
                    setError('No tienes permiso para editar clientes');
                } else if (err.status === 404) {
                    setError('El cliente ya no existe');
                } else {
                    setError(err.message);
                }
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'No fue posible actualizar el cliente',
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

                <Text style={styles.title}>Editar cliente</Text>

                {cargando ? (
                    <View style={styles.center}>
                        <ActivityIndicator size='large' color="#2563EB"/>
                        <Text>Cargando cliente...</Text>
                    </View>
                ) : clienteOriginal ? (
                    <View style={styles.form}>
                        <Text style={styles.subtitle}>
                            Cliente #{clienteOriginal.id}
                        </Text>
                        <Text style={styles.label}>
                            Nombre completo
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={nombre}
                            onChangeText={setNombre}
                            autoCapitalize="words"
                            maxLength={150}
                            editable={!guardando}
                            placeholder="Nombre del cliente"
                        />

                        <Text style={styles.label}>Teléfono</Text>


                        <TextInput
                            style={styles.input}
                            value={telefono}
                            onChangeText={setTelefono}
                            keyboardType="phone-pad"
                            maxLength={20}
                            editable={!guardando}
                            placeholder="Nombre de teléfono"
                        />

                        {error ? (
                            <Text style={styles.error}>{error}</Text>
                        ): null}

                        <Pressable style={[styles.button, guardando && styles.disabled]} disabled={guardando} onPress={guardarCambios}>
                            {guardando ? (
                                <ActivityIndicator color="#FFFFFF"/>
                            ): (
                                <Text style={styles.buttonText}>
                                    Guardar cambios
                                </Text>
                            )}
                        </Pressable>
                    </View>
                ): (
                    <View style={styles.center}>
                        <Text style={styles.error}>
                            {error ?? 'No se encontró el cliente'}
                        </Text>

                        <Pressable style={styles.button} onPress={() => setRecarga((actual) => actual + 1)}>
                            <Text style={styles.buttonText}>Reintentar</Text>
                        </Pressable>
                    </View>
                )}
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
    flexGrow: 1,
    padding: 24,
    gap: 20,
  },
  back: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#162033',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 14,
    marginBottom: 12,
  },
  form: {
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
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  disabled: {
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
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 30,
  },
});