import { useCallback, useState } from 'react';

import {
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from 'expo-router';

import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { clienteService } from '@/services/cliente.service';
import { ApiError } from '@/services/api';

import type {
    EstadoCuentaResponse,
    MovimientoEstadoCuenta,
} from '@/types/estado-cuenta.types';

const monedaMXN = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
});

function formatearDinero(valor: string): string {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return valor;
    }

    return monedaMXN.format(numero);
}

function formatearFecha(valor: string): string {
    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return valor;
    }

    return fecha.toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Mexico_City',
    });
}

function MovimientoCard({
    movimiento,
}: {
    movimiento: MovimientoEstadoCuenta;
}) {
    const esVenta = movimiento.tipo === 'VENTA';

    return (
        <View style={styles.movementCard}>
            <View style={styles.movementHeader}>
                <View style={styles.movementInfo}>
                    <Text
                        style={[
                            styles.movementTitle,
                            !esVenta && styles.paymentText,
                        ]}
                    >
                        {esVenta ? 'Venta' : 'Pago'} #{movimiento.id}
                    </Text>

                    <Text style={styles.secondaryText}>
                        {formatearFecha(movimiento.fecha)}
                    </Text>
                </View>

                <Text
                    style={[
                        styles.movementAmount,
                        !esVenta && styles.paymentText,
                    ]}
                >
                    {formatearDinero(movimiento.monto)}
                </Text>
            </View>

            <View style={styles.divider} />

            {movimiento.tipo === 'VENTA' ? (
                <View style={styles.details}>
                    <Text style={styles.sectionLabel}>
                        Productos vendidos
                    </Text>

                    {movimiento.detalle.map((detalle, indice) => (
                        <View
                            key={`${detalle.producto.id}-${indice}`}
                            style={styles.productRow}
                        >
                            <Text style={styles.productName}>
                                {detalle.producto.nombre}
                            </Text>

                            <Text style={styles.secondaryText}>
                                {detalle.cantidad} ×{' '}
                                {formatearDinero(detalle.precioUnitario)}
                            </Text>

                            <Text style={styles.value}>
                                Subtotal: {formatearDinero(detalle.subtotal)}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : (
                <View style={styles.details}>
                    <Text style={styles.sectionLabel}>
                        Información del pago
                    </Text>

                    <Text style={styles.value}>
                        Método: {movimiento.metodoPago}
                    </Text>

                    {movimiento.notas ? (
                        <Text style={styles.secondaryText}>
                            Notas: {movimiento.notas}
                        </Text>
                    ) : null}
                </View>
            )}

            <View style={styles.divider} />

            <View style={styles.balanceRow}>
                <Text style={styles.secondaryText}>
                    Saldo después del movimiento
                </Text>

                <Text style={styles.balanceValue}>
                    {formatearDinero(movimiento.saldo)}
                </Text>
            </View>
        </View>
    );
}

export default function EstadoCuentaScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [estadoCuenta, setEstadoCuenta] =
        useState<EstadoCuentaResponse | null>(null);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            async function cargarEstadoCuenta() {
                const clienteId = Number(id);

                setCargando(true);
                setError(null);
                setEstadoCuenta(null);

                if (
                    !Number.isSafeInteger(clienteId) ||
                    clienteId <= 0
                ) {
                    setError('Identificador de cliente inválido.');
                    setCargando(false);
                    return;
                }

                try {
                    const resultado =
                        await clienteService.obtenerEstadoCuenta(
                            request,
                            clienteId,
                        );

                    if (vigente) {
                        setEstadoCuenta(resultado);
                    }
                } catch (err) {
                    if (!vigente) return;

                    if (err instanceof ApiError) {
                        if (err.status === 401) {
                            return;
                        }

                        if (err.status === 403) {
                            setError(
                                'No tienes permiso para consultar este estado de cuenta.',
                            );
                        } else if (err.status === 404) {
                            setError('El cliente no existe.');
                        } else {
                            setError(err.message);
                        }
                    } else {
                        setError(
                            err instanceof Error
                                ? err.message
                                : 'No fue posible consultar el estado de cuenta.',
                        );
                    }
                } finally {
                    if (vigente) {
                        setCargando(false);
                    }
                }
            }

            void cargarEstadoCuenta();

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
                    Estado de cuenta
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
                    <Text style={styles.refreshText}>
                        Actualizar
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
                        Consultando movimientos...
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
                        <Text style={styles.refreshText}>
                            Reintentar
                        </Text>
                    </Pressable>
                </View>
            ) : estadoCuenta ? (
                <FlatList
                    data={estadoCuenta.movimientos}
                    keyExtractor={(item) =>
                        `${item.tipo}-${item.id}`
                    }
                    contentContainerStyle={styles.list}

                    ListHeaderComponent={
                        <View style={styles.summary}>
                            <View style={styles.clientCard}>
                                <Text style={styles.clientName}>
                                    {estadoCuenta.cliente.nombre}
                                </Text>

                                <Text style={styles.secondaryText}>
                                    Cliente #{estadoCuenta.cliente.id}
                                </Text>

                                <Text style={styles.secondaryText}>
                                    {estadoCuenta.cliente.telefono ||
                                        'Sin teléfono'}
                                </Text>

                                <Text
                                    style={
                                        estadoCuenta.cliente.activo
                                            ? styles.active
                                            : styles.inactive
                                    }
                                >
                                    {estadoCuenta.cliente.activo
                                        ? 'Activo'
                                        : 'Inactivo'}
                                </Text>
                            </View>

                            <View style={styles.balanceCard}>
                                <Text style={styles.secondaryText}>
                                    Saldo pendiente
                                </Text>

                                <Text style={styles.totalBalance}>
                                    {formatearDinero(estadoCuenta.saldo)}
                                </Text>
                            </View>

                            <View style={styles.totalsRow}>
                                <View style={styles.totalCard}>
                                    <Text style={styles.secondaryText}>
                                        Total ventas
                                    </Text>

                                    <Text style={styles.totalValue}>
                                        {formatearDinero(
                                            estadoCuenta.totalVentas,
                                        )}
                                    </Text>
                                </View>

                                <View style={styles.totalCard}>
                                    <Text style={styles.secondaryText}>
                                        Total pagos
                                    </Text>

                                    <Text style={styles.totalPaid}>
                                        {formatearDinero(
                                            estadoCuenta.totalPagos,
                                        )}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.sectionTitle}>
                                Historial de movimientos
                            </Text>

                            <Text style={styles.secondaryText}>
                                {estadoCuenta.movimientos.length}
                                {' movimiento(s) registrado(s)'}
                            </Text>
                        </View>
                    }

                    ListEmptyComponent={
                        <Text style={styles.empty}>
                            Este cliente todavía no tiene movimientos.
                        </Text>
                    }

                    renderItem={({ item }) => (
                        <MovimientoCard movimiento={item} />
                    )}
                />
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
        padding: 16,
        gap: 12,
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
        padding: 12,
        alignItems: 'center',
    },
    refreshText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.5,
    },
    list: {
        padding: 16,
        paddingBottom: 32,
        gap: 12,
        flexGrow: 1,
    },
    summary: {
        gap: 12,
        marginBottom: 12,
    },
    clientCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 18,
        gap: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    clientName: {
        fontSize: 21,
        fontWeight: '700',
        color: '#162033',
    },
    active: {
        color: '#16845D',
        fontWeight: '600',
        fontSize: 13,
    },
    inactive: {
        color: '#DC2626',
        fontWeight: '600',
        fontSize: 13,
    },
    balanceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        gap: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    totalBalance: {
        fontSize: 30,
        fontWeight: '700',
        color: '#162033',
    },
    totalsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    totalCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        gap: 8,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#162033',
    },
    totalPaid: {
        fontSize: 18,
        fontWeight: '700',
        color: '#16845D',
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: '700',
        color: '#162033',
        marginTop: 8,
    },
    secondaryText: {
        fontSize: 13,
        color: '#64748B',
    },
    movementCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 12,
    },
    movementHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'flex-start',
    },
    movementInfo: {
        flex: 1,
        gap: 4,
    },
    movementTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#162033',
    },
    movementAmount: {
        fontSize: 17,
        fontWeight: '700',
        color: '#162033',
    },
    paymentText: {
        color: '#16845D',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    details: {
        gap: 10,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    productRow: {
        padding: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        gap: 4,
    },
    productName: {
        fontWeight: '600',
        fontSize: 14,
        color: '#162033',
    },
    value: {
        color: '#162033',
        fontSize: 14,
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    balanceValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#162033',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 16,
    },
    error: {
        color: '#DC2626',
        fontSize: 14,
        textAlign: 'center',
    },
    empty: {
        textAlign: 'center',
        color: '#64748B',
        padding: 24,
    },
});
