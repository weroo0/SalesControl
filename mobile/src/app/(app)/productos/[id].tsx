import { useCallback, useState } from 'react';

import {
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from 'expo-router';

import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Alert
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { productoService } from '@/services/producto.service';
import { ApiError } from '@/services/api';

import type { Producto } from '@/types/producto.types';

const monedaMXN = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
});

function formatearPrecio(valor: string): string {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return valor;
    }

    return monedaMXN.format(numero);
}

export default function ProductoDetalleScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [producto, setProducto] = useState<Producto | null>(
        null,
    );

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    const [guardando, setGuardando] = useState(true);

    const cambiarEstado = () => {
        if (!producto || cargando) return;

        const accion = producto.activo ? 'desactivar' : 'activar';

        Alert.alert(
            `${accion === 'desactivar' ? 'Desactivar' : 'Activar'} producto`,
            `¿Estás seguro de que deseas ${accion} este producto?`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Confirmar',
                    onPress: async () => {
                        try {
                            setCargando(true);

                            const productoActualizado =
                                accion === 'desactivar'
                                    ? await productoService.desactivar(request, producto.id)
                                    : await productoService.activar(request, producto.id);

                            setProducto(productoActualizado);
                        } catch (error) {
                            if (error instanceof ApiError) {
                                if (error.status === 401) return;

                                Alert.alert(
                                    'Error',
                                    error.status === 403
                                        ? 'No tienes permisos para realizar esta acción.'
                                        : error.message,
                                );
                            } else {
                                Alert.alert('Error', 'No se pudo actualizar el estado del producto.');
                            }
                        } finally {
                            setCargando(false);
                        }
                    },
                },
            ],
        );
    };

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            async function cargarProducto() {
                const productoId = Number(id);

                setCargando(true);
                setError(null);
                setProducto(null);

                if (
                    !Number.isSafeInteger(productoId) ||
                    productoId <= 0
                ) {
                    setError('Identificador de producto inválido.');
                    setCargando(false);
                    return;
                }

                try {
                    const resultado =
                        await productoService.obtenerPorId(
                            request,
                            productoId,
                        );

                    if (vigente) {
                        setProducto(resultado);
                    }
                } catch (err) {
                    if (!vigente) return;

                    if (err instanceof ApiError) {
                        if (err.status === 401) {
                            return;
                        }

                        if (err.status === 403) {
                            setError(
                                'No tienes permiso para consultar este producto.',
                            );
                        } else if (err.status === 404) {
                            setError('El producto solicitado no existe.');
                        } else {
                            setError(err.message);
                        }
                    } else {
                        setError(
                            err instanceof Error
                                ? err.message
                                : 'No fue posible consultar el producto.',
                        );
                    }
                } finally {
                    if (vigente) {
                        setCargando(false);
                    }
                }
            }

            void cargarProducto();

            return () => {
                vigente = false;
            };
        }, [id, request, recarga]),
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.back}>← Volver</Text>
                </Pressable>

                <Text style={styles.title}>
                    Detalle del producto
                </Text>

                <Pressable
                    style={[
                        styles.refreshButton,
                        cargando && styles.disabled,
                    ]}
                    disabled={cargando}
                    onPress={() =>
                        setRecarga((actual) => actual + 1)
                    }
                >
                    <Text style={styles.buttonText}>
                        Actualizar información
                    </Text>
                </Pressable>
            </View>

            {cargando ? (
                <View style={styles.center}>
                    <ActivityIndicator
                        size="large"
                        color="#2563EB"
                    />

                    <Text style={styles.secondaryText}>
                        Consultando producto...
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.error}>
                        {error}
                    </Text>

                    <Pressable
                        style={styles.refreshButton}
                        onPress={() =>
                            setRecarga((actual) => actual + 1)
                        }
                    >
                        <Text style={styles.buttonText}>
                            Reintentar
                        </Text>
                    </Pressable>
                </View>
            ) : producto ? (
                <ScrollView
                    contentContainerStyle={styles.content}
                >
                    <View style={styles.card}>
                        <Text style={styles.label}>
                            Nombre del producto
                        </Text>

                        <Text style={styles.productName}>
                            {producto.nombre}
                        </Text>

                        <Text style={styles.productId}>
                            Producto #{producto.id}
                        </Text>

                        <View style={styles.divider} />

                        <Text style={styles.label}>
                            Precio de venta
                        </Text>

                        <Text style={styles.price}>
                            {formatearPrecio(producto.precio)}
                        </Text>

                        <View style={styles.divider} />

                        <Text style={styles.label}>
                            Estado
                        </Text>

                        <Text
                            style={
                                producto.activo
                                    ? styles.active
                                    : styles.inactive
                            }
                        >
                            {producto.activo
                                ? 'Activo'
                                : 'Inactivo'}
                        </Text>

                        <Pressable
                            style={styles.editButton}
                            onPress={() =>
                                router.push({
                                    pathname: '/productos/[id]/editar',
                                    params: {
                                        id: String(producto.id),
                                    },
                                })
                            }
                        >
                            <Text style={styles.editButtonText}>
                                Editar producto
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.statusButton,
                                producto.activo ? styles.desactivateButton : styles.activateButton,
                            ]}
                            onPress={cambiarEstado}
                            disabled={cargando}
                        >
                            {cargando ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.statusButtonText}>
                                    {producto.activo ? 'Desactivar producto' : 'Activar producto'}
                                </Text>
                            )}
                        </Pressable>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>
                            Categoría
                        </Text>

                        <Text style={styles.value}>
                            {producto.categoria?.nombre ??
                                'Categoría sin nombre disponible'}
                        </Text>

                        <Text style={styles.secondaryText}>
                            ID de categoría: {producto.categoriaId}
                        </Text>
                    </View>
                </ScrollView>
            ) : (
                <View style={styles.center}>
                    <Text style={styles.secondaryText}>
                        No hay información disponible.
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
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
        color: '#2563EB',
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#162033',
    },
    refreshButton: {
        backgroundColor: '#2563EB',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.5,
    },
    content: {
        padding: 20,
        paddingBottom: 32,
        gap: 16,
        flexGrow: 1,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 20,
        gap: 12,
    },
    label: {
        fontSize: 13,
        color: '#64748B',
    },
    productName: {
        fontSize: 23,
        fontWeight: '700',
        color: '#162033',
    },
    productId: {
        fontSize: 13,
        color: '#64748B',
    },
    price: {
        fontSize: 28,
        fontWeight: '700',
        color: '#162033',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#162033',
    },
    value: {
        fontSize: 16,
        color: '#162033',
        fontWeight: '600',
    },
    secondaryText: {
        fontSize: 14,
        color: '#64748B',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 4,
    },
    active: {
        color: '#16845D',
        fontSize: 15,
        fontWeight: '600',
    },
    inactive: {
        color: '#DC2626',
        fontSize: 15,
        fontWeight: '600',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
    },
    error: {
        fontSize: 14,
        color: '#DC2626',
        textAlign: 'center',
    },
    editButton: {
        backgroundColor: '#2563EB',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
    },

    editButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },

    statusButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
    },

    desactivateButton: {
        backgroundColor: '#DC2626',
    },

    activateButton: {
        backgroundColor: '#16A34A',
    },

    statusButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 15,
    },
});
