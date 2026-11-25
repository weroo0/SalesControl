import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { ventaService } from '@/services/venta.service';

import type { VentaDetalle } from '@/types/venta.types';

const formatoMoneda = (valor: string) =>
    Number(valor).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
    });

const formatoFecha = (fecha: string) =>
    new Date(fecha).toLocaleString('es-MX', {
        dateStyle: 'long',
        timeStyle: 'short',
    });

export default function VentaDetalleScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const request = useAuthenticatedRequest();

    const [venta, setVenta] = useState<VentaDetalle | null>(null);
    const [cargando, setCargando] = useState(true);
    const [cancelando, setCancelando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ventaId = Number(id);

    const cargarVenta = useCallback(async () => {
        if (!Number.isInteger(ventaId) || ventaId <= 0) {
            setError('El identificador de la venta no es válido.');
            setCargando(false);
            return;
        }

        setCargando(true);
        setError(null);

        try {
            const respuesta = await ventaService.obtenerPorId(
                request,
                ventaId,
            );

            setVenta(respuesta);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No fue posible cargar el detalle de la venta.',
            );
        } finally {
            setCargando(false);
        }
    }, [request, ventaId]);

    useFocusEffect(
        useCallback(() => {
            void cargarVenta();
        }, [cargarVenta]),
    );

    const ejecutarCancelacion = async () => {
        setCancelando(true);
        setError(null);

        try {
            const respuesta = await ventaService.cancelar(
                request,
                ventaId,
            );

            setVenta((actual) =>
                actual
                    ? { ...actual, ...respuesta }
                    : actual,
            );

            Alert.alert(
                'Venta cancelada',
                `La venta #${ventaId} se canceló correctamente.`,
            );
        } catch (err) {
            const mensaje =
                err instanceof Error
                    ? err.message
                    : 'No fue posible cancelar la venta.';

            setError(mensaje);
            Alert.alert('No se pudo cancelar', mensaje);
        } finally {
            setCancelando(false);
        }
    };

    const confirmarCancelacion = () => {
        Alert.alert(
            'Cancelar venta',
            `¿Estás seguro de cancelar la venta #${ventaId}? Esta acción cambiará su estado a CANCELADA.`,
            [
                {
                    text: 'Volver',
                    style: 'cancel',
                },
                {
                    text: 'Cancelar venta',
                    style: 'destructive',
                    onPress: () => void ejecutarCancelacion(),
                },
            ],
        );
    };

    if (cargando) {
        return (
            <SafeAreaView style={styles.centrado}>
                <ActivityIndicator size="large" />
                <Text style={styles.textoCarga}>
                    Cargando venta...
                </Text>
            </SafeAreaView>
        );
    }

    if (!venta) {
        return (
            <SafeAreaView style={styles.container}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.volver}>‹ Volver</Text>
                </Pressable>

                <View style={styles.centrado}>
                    <Text style={styles.errorTexto}>
                        {error ?? 'No se encontró la venta.'}
                    </Text>

                    <Pressable
                        style={styles.botonReintentar}
                        onPress={() => void cargarVenta()}
                    >
                        <Text style={styles.botonReintentarTexto}>
                            Reintentar
                        </Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.contenido}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.volver}>‹ Volver a ventas</Text>
                </Pressable>

                <View style={styles.encabezado}>
                    <View>
                        <Text style={styles.titulo}>
                            Venta #{venta.id}
                        </Text>
                        <Text style={styles.fecha}>
                            {formatoFecha(venta.fecha)}
                        </Text>
                    </View>

                    <Text
                        style={[
                            styles.estado,
                            venta.estado === 'ACTIVA'
                                ? styles.estadoActiva
                                : styles.estadoCancelada,
                        ]}
                    >
                        {venta.estado}
                    </Text>
                </View>

                {/* Información general */}
                <View style={styles.card}>
                    <Text style={styles.seccionTitulo}>
                        Información de la venta
                    </Text>

                    <Fila
                        etiqueta="Tipo de venta"
                        valor={venta.tipoVenta}
                    />

                    <Fila
                        etiqueta="Número de venta"
                        valor={`#${venta.id}`}
                    />

                    <Fila
                        etiqueta="Fecha"
                        valor={formatoFecha(venta.fecha)}
                    />
                </View>

                {/* Cliente */}
                <View style={styles.card}>
                    <Text style={styles.seccionTitulo}>Cliente</Text>

                    <Text style={styles.nombre}>
                        {venta.cliente.nombre}
                    </Text>

                    <Fila
                        etiqueta="ID"
                        valor={String(venta.cliente.id)}
                    />

                    <Fila
                        etiqueta="Teléfono"
                        valor={venta.cliente.telefono ?? 'No registrado'}
                    />
                </View>

                {/* Vendedor */}
                <View style={styles.card}>
                    <Text style={styles.seccionTitulo}>
                        Registró la venta
                    </Text>

                    <Text style={styles.nombre}>
                        {venta.usuario.nombre}
                    </Text>

                    <Fila
                        etiqueta="Correo"
                        valor={venta.usuario.email}
                    />

                    <Fila
                        etiqueta="ID de usuario"
                        valor={String(venta.usuario.id)}
                    />
                </View>

                {/* Productos */}
                <View style={styles.card}>
                    <Text style={styles.seccionTitulo}>
                        Productos vendidos
                    </Text>

                    {venta.detalleVentas.map((detalle) => (
                        <View
                            key={detalle.id}
                            style={styles.producto}
                        >
                            <View style={styles.productoInfo}>
                                <Text style={styles.productoNombre}>
                                    {detalle.producto.nombre}
                                </Text>

                                <Text style={styles.productoDetalle}>
                                    {detalle.cantidad} ×{' '}
                                    {formatoMoneda(detalle.precioUnitario)}
                                </Text>
                            </View>

                            <Text style={styles.subtotal}>
                                {formatoMoneda(detalle.subtotal)}
                            </Text>
                        </View>
                    ))}

                    <View style={styles.divisor} />

                    <View style={styles.totalFila}>
                        <Text style={styles.totalEtiqueta}>
                            Total de la venta
                        </Text>

                        <Text style={styles.total}>
                            {formatoMoneda(venta.total)}
                        </Text>
                    </View>
                </View>

                {venta.estado === 'ACTIVA' && (
                    <Pressable
                        disabled={cancelando}
                        style={[
                            styles.botonCancelar,
                            cancelando && styles.botonDeshabilitado,
                        ]}
                        onPress={confirmarCancelacion}
                    >
                        {cancelando ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.botonCancelarTexto}>
                                Cancelar venta
                            </Text>
                        )}
                    </Pressable>
                )}

                {venta.estado === 'CANCELADA' && (
                    <View style={styles.avisoCancelada}>
                        <Text style={styles.avisoCanceladaTexto}>
                            Esta venta se encuentra cancelada.
                        </Text>
                    </View>
                )}

                {!!error && (
                    <Text style={styles.errorTexto}>{error}</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function Fila({
    etiqueta,
    valor,
}: {
    etiqueta: string;
    valor: string;
}) {
    return (
        <View style={styles.fila}>
            <Text style={styles.etiqueta}>{etiqueta}</Text>
            <Text style={styles.valor}>{valor}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F6FA',
    },
    contenido: {
        padding: 18,
        paddingBottom: 35,
        gap: 14,
    },
    centrado: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        gap: 12,
    },
    textoCarga: {
        color: '#64748B',
    },
    volver: {
        color: '#2563EB',
        fontSize: 15,
        fontWeight: '600',
        paddingVertical: 8,
    },
    encabezado: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
    },
    titulo: {
        fontSize: 25,
        fontWeight: '700',
        color: '#172033',
    },
    fecha: {
        color: '#64748B',
        fontSize: 12,
        marginTop: 5,
    },
    estado: {
        overflow: 'hidden',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        fontSize: 11,
        fontWeight: '700',
    },
    estadoActiva: {
        color: '#166534',
        backgroundColor: '#DCFCE7',
    },
    estadoCancelada: {
        color: '#991B1B',
        backgroundColor: '#FEE2E2',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        gap: 12,
    },
    seccionTitulo: {
        color: '#172033',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 2,
    },
    nombre: {
        color: '#172033',
        fontSize: 16,
        fontWeight: '600',
    },
    fila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    etiqueta: {
        color: '#64748B',
        flex: 1,
    },
    valor: {
        color: '#334155',
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
    },
    producto: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 8,
    },
    productoInfo: {
        flex: 1,
        gap: 4,
    },
    productoNombre: {
        color: '#172033',
        fontWeight: '600',
    },
    productoDetalle: {
        color: '#64748B',
        fontSize: 12,
    },
    subtotal: {
        color: '#172033',
        fontWeight: '600',
    },
    divisor: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 4,
    },
    totalFila: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalEtiqueta: {
        fontWeight: '700',
        color: '#334155',
    },
    total: {
        color: '#172033',
        fontSize: 21,
        fontWeight: '700',
    },
    botonCancelar: {
        backgroundColor: '#DC2626',
        borderRadius: 11,
        padding: 15,
        alignItems: 'center',
    },
    botonCancelarTexto: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    botonDeshabilitado: {
        opacity: 0.6,
    },
    avisoCancelada: {
        backgroundColor: '#FEE2E2',
        padding: 14,
        borderRadius: 10,
    },
    avisoCanceladaTexto: {
        color: '#991B1B',
        fontWeight: '600',
        textAlign: 'center',
    },
    errorTexto: {
        color: '#B91C1C',
        textAlign: 'center',
    },
    botonReintentar: {
        backgroundColor: '#2563EB',
        borderRadius: 9,
        paddingHorizontal: 18,
        paddingVertical: 11,
    },
    botonReintentarTexto: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
});