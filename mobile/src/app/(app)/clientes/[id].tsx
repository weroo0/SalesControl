import { useCallback, useState } from "react";

import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, Alert } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthenticatedRequest } from "@/hooks/useAuthenticatedRequest";
import { clienteService } from "@/services/cliente.service";
import { ApiError } from "@/services/api";

import type { Cliente } from "@/types/cliente.types";

export default function ClienteDetalleScreen() {
    const {id} = useLocalSearchParams<{id: string}>();

    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);

    const [cambiandoEstado, setCambiandoEstado] = useState(false);
    const [errorEstado, setErrorEstado] = useState<string | null>(null);


    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            async function cargarCliente() {
            const clienteId = Number(id);

            if (!Number.isSafeInteger(clienteId) || clienteId <= 0) {
                setError('Identificador de cliente inválido.');
                setCargando(false);
                return;
            }

            setCargando(true);
            setError(null);
            setCliente(null);

            try {
                const resultado = await clienteService.obtenerPorId(
                request,
                clienteId,
                );

                if (vigente) {
                setCliente(resultado);
                }
            } catch (err) {
                if (!vigente) return;

                if (err instanceof ApiError && err.status === 401) {
                return;
                }

                if (err instanceof ApiError && err.status === 404) {
                setError('El cliente no existe.');
                } else {
                setError(
                    err instanceof Error
                    ? err.message
                    : 'No fue posible cargar el cliente.',
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
        }, [id, request, recarga]),
    );

    async function actualizarEstado(
        clienteId: number,
        nuevoEstado: boolean,
    ) {
        if (cambiandoEstado) return;

        setCambiandoEstado(true);
        setErrorEstado(null);

        try {
            if (nuevoEstado) {
                await clienteService.activar(request, clienteId);
            } else {
                await clienteService.desactivar(request, clienteId);
            }

            setRecarga((actual) => actual + 1);
        } catch (err) {
            if(err instanceof ApiError) {
                if(err.status === 401) {
                    return;
                }

                if (err.status === 403) {
                    setError('No tienes permiso para cambiar el estado del cliente');
                } else if (err.status === 404) {
                    setErrorEstado('El cliente no existe');
                } else if (err.status === 409) {
                    setErrorEstado(err.message);
                } else {
                    setErrorEstado(err.message);
                }
            } else {
                setErrorEstado(
                    err instanceof Error
                        ? err.message
                        : 'No fue posible actualizar el estado',
                );
            }
        } finally {
            setCambiandoEstado(false);
        }
    }


    function confirmarCambioEstado() {
        if (!cliente || cambiandoEstado) return;

        const nuevoEstado = !cliente.activo;

        const titulo = nuevoEstado
            ? 'Activar cliente'
            : 'Desactivar cliente';

        const mensaje = nuevoEstado
            ? `¿Deseas activar nuevamente a ${cliente.nombre}?`
            : `¿Deseas desactivar a ${cliente.nombre}? Sus ventas, pagos y adeudos existentes se conservarán.`;

        const clienteId = cliente.id;

        Alert.alert(
            titulo,
            mensaje,
            [
            {
                text: 'Cancelar',
                style: 'cancel',
            },
            {
                text: 'Confirmar',
                style: nuevoEstado ? 'default' : 'destructive',
                onPress: () => {
                void actualizarEstado(clienteId, nuevoEstado);
                },
            },
            ],
            {
            cancelable: true,
            },
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.back}>Volver</Text>
                </Pressable>

                <Text style={styles.headerTitle}>Detalle del cliente</Text>
            </View>

            {cargando ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB"/>
                    <Text style={styles.subtitle}>Cargando información...</Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.error}>{error}</Text>

                    <Pressable style={styles.button} onPress={() => setRecarga((valor) => valor + 1)}>
                        <Text style={styles.buttonText}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : cliente ? (
                <ScrollView contentContainerStyle= {styles.content}>
                    <View style={styles.card}>
                        <Text style={styles.label}>Nombre completo</Text>
                        <Text style={styles.name}>{cliente.nombre}</Text>

                        <View style={styles.divider}/>

                        <Text style={styles.label}>Identificador</Text>
                        <Text style={styles.value}>#{cliente.id}</Text>

                        <View style={styles.divider}/>

                        <Text style={styles.label}>Teléfono</Text>
                        <Text style={styles.value}>{cliente.telefono || 'Sin teléfono registrado xd'}</Text>

                        <View style={styles.divider}/>

                        <Text style={styles.label}>Estado</Text>
                        <Text style={cliente.activo ? styles.active : styles.inactive}>{cliente.activo ? 'Activo' : 'Inactivo'}</Text>

                        <Text style={styles.label}>Notas</Text>
                        <Text style={styles.value}>{cliente.notas || 'No hay notas xd'}</Text>                        
                    </View>

                    <Pressable
                        style={styles.button}
                        onPress={() =>
                            router.push({
                            pathname: '/clientes/[id]/editar',
                            params: {
                                id: String(cliente.id),
                            },
                            })
                        }
                    >
                        <Text style={styles.buttonText}>
                            Editar cliente
                        </Text>
                    </Pressable>

                    {errorEstado ? (
                        <Text style={styles.estadoError}>
                            {errorEstado}
                        </Text>
                    ) : null}

                    <Pressable style={[
                        styles.estadoButton,
                        cliente.activo
                            ? styles.desactivarButton
                            : styles.activarButton,
                        cambiandoEstado && styles.estadoButtonDisabled,
                    ]}
                    onPress={confirmarCambioEstado}
                    disabled={cambiandoEstado}
                    >
                        {cambiandoEstado ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ): (
                            <Text style={styles.buttonText}>
                                {cliente.activo
                                    ? 'Desactivar cliente'
                                    : 'Activar cliente'}
                            </Text>
                        )}
                    </Pressable>

                    <Pressable style={styles.button} onPress={() => setRecarga((valor) => valor + 1)}>
                        <Text style={styles.buttonText}>Actualizar información</Text>
                    </Pressable>
                </ScrollView>
            ) : (
                <View style={styles.center}>
                    <Text>No se encontró información del cliente</Text>
                </View>
            )}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    padding: 20,
    gap: 14,
  },
  back: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#162033',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 13,
    color: '#64748B',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#162033',
  },
  value: {
    fontSize: 16,
    color: '#162033',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 6,
  },
  active: {
    fontSize: 16,
    color: '#16845D',
    fontWeight: '600',
  },
  inactive: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  error: {
    color: '#DC2626',
    fontSize: 15,
    textAlign: 'center',
  },
  estadoButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },

  activarButton: {
    backgroundColor: '#16845D',
  },

  desactivarButton: {
    backgroundColor: '#DC2626',
  },

  estadoButtonDisabled: {
    opacity: 0.6,
  },

  estadoError: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
});