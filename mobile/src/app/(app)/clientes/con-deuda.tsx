import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

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
    ClientesConDeudaResponse,
    ClienteConDeuda,
} from '@/types/deuda.types';

const formatoMoneda = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
});

function formatearDinero(valor: string): string {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return valor;
    }

    return formatoMoneda.format(numero);
}

function formatearFecha(valor: string): string {
    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return valor;
    }

    return fecha.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'America/Mexico_City',
    });
}

export default function ClientesConDeudaScreen() {
    const router = useRouter();
    const request = useAuthenticatedRequest();

    
    const [respuesta, setRespuesta] =
        useState<ClientesConDeudaResponse | null>(null);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            async function cargarDeudas() {
                setCargando(true);
                setError(null);

                try {
                    const resultado =
                        await clienteService.listarConDeuda(request);

                    if (vigente) {
                        setRespuesta(resultado);
                    }
                } catch (err) {
                    if (!vigente) return;

                    if (err instanceof ApiError) {
                        if (err.status === 401) {
                            return;
                        }

                        if (err.status === 403) {
                            setError(
                                'No tienes permiso para consultar los adeudos.',
                            );
                        } else {
                            setError(err.message);
                        }
                    } else {
                        setError(
                            err instanceof Error
                                ? err.message
                                : 'No se pudieron consultar los adeudos.',
                        );
                    }
                } finally {
                    if (vigente) {
                        setCargando(false);
                    }
                }
            }

            void cargarDeudas();

            return () => {
                vigente = false;
            };
        }, [request, recarga]),
    );

    function abrirCliente(cliente: ClienteConDeuda) {
        router.push({
            pathname: '/clientes/[id]',
            params: {
                id: String(cliente.id),
            },
        });
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.back}>← Volver</Text>
                </Pressable>

                <Text style={styles.title}>
                    Clientes con deuda
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
                        Consultando información financiera...
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.error}>{error}</Text>

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
            ) : respuesta ? (
                <FlatList
                    data={respuesta.clientes}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        <View style={styles.summary}>
                            <Text style={styles.sectionTitle}>
                                Resumen de cobranza
                            </Text>

                            <Text style={styles.secondaryText}>
                                Periodo: {formatearFecha(respuesta.periodo.inicio)}
                                {' - '}
                                {formatearFecha(respuesta.periodo.fin)}
                            </Text>

                            <View style={styles.summaryCard}>
                                <Text style={styles.secondaryText}>
                                    Total por cobrar
                                </Text>

                                <Text style={styles.totalAmount}>
                                    {formatearDinero(
                                        respuesta.resumen.totalPorCobrar,
                                    )}
                                </Text>
                            </View>

                            <View style={styles.summaryCard}>
                                <Text style={styles.secondaryText}>
                                    Total cobrado esta semana
                                </Text>

                                <Text style={styles.collectedAmount}>
                                    {formatearDinero(
                                        respuesta.resumen.totalCobradoEstaSemana,
                                    )}
                                </Text>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.statCard}>
                                    <Text style={styles.statNumber}>
                                        {respuesta.resumen.clientesConDeuda}
                                    </Text>
                                    <Text style={styles.statLabel}>
                                        Con deuda
                                    </Text>
                                </View>

                                <View style={styles.statCard}>
                                    <Text style={styles.statNumber}>
                                        {respuesta.resumen.clientesConDeudaQuePagaron}
                                    </Text>
                                    <Text style={styles.statLabel}>
                                        Abonaron
                                    </Text>
                                </View>

                                <View style={styles.statCard}>
                                    <Text style={styles.statNumber}>
                                        {respuesta.resumen.clientesConDeudaQueNoPagaron}
                                    </Text>
                                    <Text style={styles.statLabel}>
                                        Sin abonos
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.sectionTitle}>
                                Clientes con saldo pendiente
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <Text style={styles.empty}>
                            No se encontraron clientes con deuda.
                        </Text>
                    }
                    renderItem={({ item }) => (
                        <Pressable
                            style={styles.clientCard}
                            onPress={() => abrirCliente(item)}
                        >
                            <View style={styles.clientHeader}>
                                <View style={styles.clientInfo}>
                                    <Text style={styles.clientName}>
                                        {item.nombre}
                                    </Text>

                                    <Text style={styles.secondaryText}>
                                        {item.telefono || 'Sin teléfono'}
                                    </Text>

                                    <Text
                                        style={
                                            item.activo
                                                ? styles.active
                                                : styles.inactive
                                        }
                                    >
                                        {item.activo ? 'Activo' : 'Inactivo'}
                                    </Text>
                                </View>

                                <Text style={styles.openDetail}>
                                    Ver →
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            <Text style={styles.secondaryText}>
                                Saldo pendiente
                            </Text>

                            <Text style={styles.clientBalance}>
                                {formatearDinero(item.saldo)}
                            </Text>

                            <View style={styles.financialRow}>
                                <Text style={styles.secondaryText}>
                                    Total ventas
                                </Text>
                                <Text style={styles.value}>
                                    {formatearDinero(item.totalVentas)}
                                </Text>
                            </View>

                            <View style={styles.financialRow}>
                                <Text style={styles.secondaryText}>
                                    Total pagos
                                </Text>
                                <Text style={styles.value}>
                                    {formatearDinero(item.totalPagos)}
                                </Text>
                            </View>

                            <View style={styles.divider} />

                            <Text
                                style={
                                    item.pagoEstaSemana
                                        ? styles.paidThisWeek
                                        : styles.notPaidThisWeek
                                }
                            >
                                {item.pagoEstaSemana
                                    ? 'Abonó esta semana'
                                    : 'Sin abonos esta semana'}
                            </Text>

                            <View style={styles.financialRow}>
                                <Text style={styles.secondaryText}>
                                    Abonado esta semana
                                </Text>

                                <Text style={styles.value}>
                                    {formatearDinero(
                                        item.totalPagadoEstaSemana,
                                    )}
                                </Text>
                            </View>
                        </Pressable>
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
        padding: 12,
        borderRadius: 10,
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
        marginBottom: 8,
    },
    sectionTitle: {
        color: '#162033',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 6,
    },
    secondaryText: {
        color: '#64748B',
        fontSize: 13,
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        padding: 18,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    totalAmount: {
        color: '#162033',
        fontSize: 28,
        fontWeight: '700',
    },
    collectedAmount: {
        color: '#16845D',
        fontSize: 26,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        gap: 6,
    },
    statNumber: {
        fontSize: 23,
        fontWeight: '700',
        color: '#162033',
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
    },
    clientCard: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
    },
    clientHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    clientInfo: {
        flex: 1,
        gap: 4,
    },
    clientName: {
        color: '#162033',
        fontSize: 17,
        fontWeight: '700',
    },
    active: {
        color: '#16845D',
        fontSize: 12,
        fontWeight: '600',
    },
    inactive: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '600',
    },
    openDetail: {
        color: '#2563EB',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 4,
    },
    clientBalance: {
        fontSize: 25,
        fontWeight: '700',
        color: '#162033',
    },
    financialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    value: {
        color: '#162033',
        fontSize: 14,
        fontWeight: '600',
    },
    paidThisWeek: {
        color: '#16845D',
        fontWeight: '600',
        fontSize: 13,
    },
    notPaidThisWeek: {
        color: '#D97706',
        fontWeight: '600',
        fontSize: 13,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        gap: 14,
    },
    error: {
        color: '#DC2626',
        fontSize: 14,
        textAlign: 'center',
    },
    empty: {
        color: '#64748B',
        fontSize: 14,
        textAlign: 'center',
        padding: 30,
    },
});
