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
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { pagoService } from '@/services/pago.service';

import type { PagoDetalle } from '@/types/pago.types';

const formatearMoneda = (cantidad: string | number) =>
    Number(cantidad).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
    });

const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

export default function DetallePagoScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const request = useAuthenticatedRequest();

    const [pago, setPago] = useState<PagoDetalle | null>(null);
    const [cargando, setCargando] = useState(true);
    const [cancelando, setCancelando] = useState(false);

    const cargarPago = useCallback(async () => {
        try {
            setCargando(true);

            const respuesta = await pagoService.obtenerPorId(
                request,
                Number(id),
            );

            setPago(respuesta);
        } catch (error) {
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No fue posible consultar el pago.',
                [{ text: 'Volver', onPress: () => router.back() }],
            );
        } finally {
            setCargando(false);
        }
    }, [request, id]);

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            const cargar = async () => {
                try {
                    setCargando(true);

                    const respuesta = await pagoService.obtenerPorId(
                        request,
                        Number(id),
                    );

                    if (vigente) {
                        setPago(respuesta);
                    }
                } catch (error) {
                    if (vigente) {
                        Alert.alert(
                            'Error',
                            error instanceof Error
                                ? error.message
                                : 'No fue posible consultar el pago.',
                            [{ text: 'Volver', onPress: () => router.back() }],
                        );
                    }
                } finally {
                    if (vigente) {
                        setCargando(false);
                    }
                }
            };

            cargar();

            return () => {
                vigente = false;
            };
        }, [request, id]),
    );

    const confirmarCancelacion = () => {
        if (!pago || pago.estado !== 'ACTIVA') return;

        Alert.alert(
            'Cancelar pago',
            `¿Deseas cancelar el pago de ${formatearMoneda(pago.monto)} registrado para ${pago.cliente.nombre}?\n\nEsta acción modificará el saldo pendiente del cliente.`,
            [
                {
                    text: 'No, conservar',
                    style: 'cancel',
                },
                {
                    text: 'Sí, cancelar pago',
                    style: 'destructive',
                    onPress: cancelarPago,
                },
            ],
        );
    };

    const cancelarPago = async () => {
        if (!pago || pago.estado !== 'ACTIVA') return;

        try {
            setCancelando(true);

            await pagoService.cancelar(request, pago.id);

            Alert.alert(
                'Pago cancelado',
                'El pago se canceló correctamente. El saldo del cliente se actualizará al consultar su estado de cuenta.',
            );

            await cargarPago();
        } catch (error) {
            Alert.alert(
                'No se pudo cancelar',
                error instanceof Error
                    ? error.message
                    : 'Ocurrió un error al cancelar el pago.',
            );
        } finally {
            setCancelando(false);
        }
    };

    if (cargando) {
        return (
            <View style={styles.centrado}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.textoCargando}>Cargando pago...</Text>
            </View>
        );
    }

    if (!pago) {
        return (
            <View style={styles.centrado}>
                <Text style={styles.tituloVacio}>
                    No se encontró el pago
                </Text>

                <Pressable
                    style={styles.botonVolver}
                    onPress={() => router.back()}
                >
                    <Text style={styles.textoBotonVolver}>Volver</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.contenedor}
            contentContainerStyle={styles.contenido}
        >
            <View style={styles.encabezado}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.volver}>‹ Volver</Text>
                </Pressable>

                <Text style={styles.titulo}>Detalle del pago</Text>
                <Text style={styles.subtitulo}>
                    Folio #{pago.id}
                </Text>
            </View>

            <View style={styles.tarjetaMonto}>
                <Text style={styles.etiquetaMonto}>Monto registrado</Text>

                <Text style={styles.monto}>
                    {formatearMoneda(pago.monto)}
                </Text>

                <View
                    style={[
                        styles.estadoBadge,
                        pago.estado === 'ACTIVA'
                            ? styles.estadoActivo
                            : styles.estadoCancelado,
                    ]}
                >
                    <Text
                        style={[
                            styles.textoEstado,
                            pago.estado === 'ACTIVA'
                                ? styles.textoActivo
                                : styles.textoCancelado,
                        ]}
                    >
                        {pago.estado === 'ACTIVA'
                            ? 'Pago activo'
                            : 'Pago cancelado'}
                    </Text>
                </View>
            </View>

            <View style={styles.tarjeta}>
                <Text style={styles.tituloSeccion}>
                    Información del pago
                </Text>

                <Fila
                    etiqueta="Fecha"
                    valor={formatearFecha(pago.fechaPago)}
                />

                <Fila
                    etiqueta="Método de pago"
                    valor={
                        pago.metodoPago === 'EFECTIVO'
                            ? 'Efectivo'
                            : 'Transferencia'
                    }
                />

                <Fila
                    etiqueta="Estado"
                    valor={
                        pago.estado === 'ACTIVA'
                            ? 'Activo'
                            : 'Cancelado'
                    }
                />

                <Fila
                    etiqueta="Notas"
                    valor={pago.notas?.trim() || 'Sin notas'}
                    ultima
                />
            </View>

            <View style={styles.tarjeta}>
                <Text style={styles.tituloSeccion}>
                    Cliente
                </Text>

                <Fila
                    etiqueta="Nombre"
                    valor={pago.cliente.nombre}
                />

                <Fila
                    etiqueta="Identificador"
                    valor={`#${pago.cliente.id}`}
                    ultima
                />
            </View>

            <View style={styles.tarjeta}>
                <Text style={styles.tituloSeccion}>
                    Registro
                </Text>

                <Fila
                    etiqueta="Usuario"
                    valor={pago.usuario.nombre}
                />

                <Fila
                    etiqueta="Identificador"
                    valor={`#${pago.usuario.id}`}
                    ultima
                />
            </View>

            {pago.estado === 'ACTIVA' && (
                <View style={styles.seccionAcciones}>
                    <Text style={styles.avisoCancelacion}>
                        La cancelación dejará de considerar este pago en el saldo
                        del cliente. El registro histórico se conservará.
                    </Text>

                    <Pressable
                        style={[
                            styles.botonCancelar,
                            cancelando && styles.botonDeshabilitado,
                        ]}
                        onPress={confirmarCancelacion}
                        disabled={cancelando}
                    >
                        {cancelando ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.textoBotonCancelar}>
                                Cancelar pago
                            </Text>
                        )}
                    </Pressable>
                </View>
            )}
        </ScrollView>
    );
}

function Fila({
    etiqueta,
    valor,
    ultima = false,
}: {
    etiqueta: string;
    valor: string;
    ultima?: boolean;
}) {
    return (
        <View
            style={[
                styles.fila,
                ultima && styles.ultimaFila,
            ]}
        >
            <Text style={styles.etiquetaFila}>{etiqueta}</Text>
            <Text style={styles.valorFila}>{valor}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: '#F7F7F7',
    },
    contenido: {
        padding: 20,
        paddingBottom: 40,
    },
    centrado: {
        flex: 1,
        backgroundColor: '#F7F7F7',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    textoCargando: {
        color: '#737373',
        marginTop: 12,
    },
    tituloVacio: {
        fontSize: 18,
        fontWeight: '700',
        color: '#171717',
    },
    botonVolver: {
        marginTop: 18,
        backgroundColor: '#2563EB',
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 9,
    },
    textoBotonVolver: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    encabezado: {
        marginBottom: 20,
    },
    volver: {
        color: '#2563EB',
        fontSize: 16,
        marginBottom: 18,
    },
    titulo: {
        color: '#171717',
        fontSize: 26,
        fontWeight: '700',
    },
    subtitulo: {
        color: '#737373',
        marginTop: 5,
        fontSize: 14,
    },
    tarjetaMonto: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 22,
        alignItems: 'center',
        marginBottom: 16,
    },
    etiquetaMonto: {
        color: '#737373',
        fontSize: 14,
    },
    monto: {
        color: '#171717',
        fontSize: 34,
        fontWeight: '700',
        marginVertical: 12,
    },
    estadoBadge: {
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    estadoActivo: {
        backgroundColor: '#DCFCE7',
    },
    estadoCancelado: {
        backgroundColor: '#FEE2E2',
    },
    textoEstado: {
        fontSize: 13,
        fontWeight: '700',
    },
    textoActivo: {
        color: '#166534',
    },
    textoCancelado: {
        color: '#991B1B',
    },
    tarjeta: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
    },
    tituloSeccion: {
        color: '#171717',
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 8,
    },
    fila: {
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        gap: 5,
    },
    ultimaFila: {
        borderBottomWidth: 0,
    },
    etiquetaFila: {
        color: '#737373',
        fontSize: 13,
    },
    valorFila: {
        color: '#171717',
        fontSize: 15,
        fontWeight: '600',
    },
    seccionAcciones: {
        marginTop: 6,
    },
    avisoCancelacion: {
        color: '#737373',
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 12,
    },
    botonCancelar: {
        backgroundColor: '#DC2626',
        borderRadius: 10,
        padding: 15,
        alignItems: 'center',
    },
    botonDeshabilitado: {
        opacity: 0.6,
    },
    textoBotonCancelar: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
});
