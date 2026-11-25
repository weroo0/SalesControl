import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { clienteService } from '@/services/cliente.service';
import { pagoService } from '@/services/pago.service';

import type { Cliente } from '@/types/cliente.types';
import type { MetodoPago } from '@/types/pago.types';

const formatearMoneda = (cantidad: string | number) => {
    const valor = Number(cantidad);

    return valor.toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
    });
};

export default function NuevoPagoScreen() {
    const request = useAuthenticatedRequest();

    const [busqueda, setBusqueda] = useState('');
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [clienteSeleccionado, setClienteSeleccionado] =
        useState<Cliente | null>(null);

    const [estadoCuenta, setEstadoCuenta] = useState<
        Awaited<ReturnType<typeof clienteService.obtenerEstadoCuenta>> | null
    >(null);

    const [monto, setMonto] = useState('');
    const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO');
    const [notas, setNotas] = useState('');

    const [cargandoClientes, setCargandoClientes] = useState(false);
    const [cargandoEstadoCuenta, setCargandoEstadoCuenta] = useState(false);
    const [registrando, setRegistrando] = useState(false);

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            const cargarClientes = async () => {
                try {
                    setCargandoClientes(true);

                    const respuesta = await clienteService.listarPaginado(
                        request,
                        {
                            activo: true,
                            nombre: busqueda.trim() || undefined,
                            page: 1,
                            limit: 50,
                        },
                    );

                    if (vigente) {
                        setClientes(respuesta.data);
                    }
                } catch (error) {
                    if (vigente) {
                        Alert.alert(
                            'Error',
                            error instanceof Error
                                ? error.message
                                : 'No fue posible cargar los clientes.',
                        );
                    }
                } finally {
                    if (vigente) {
                        setCargandoClientes(false);
                    }
                }
            };

            cargarClientes();

            return () => {
                vigente = false;
            };
        }, [request, busqueda]),
    );

    const seleccionarCliente = async (cliente: Cliente) => {
        setClienteSeleccionado(cliente);
        setEstadoCuenta(null);
        setMonto('');

        try {
            setCargandoEstadoCuenta(true);

            const respuesta = await clienteService.obtenerEstadoCuenta(
                request,
                cliente.id,
            );

            setEstadoCuenta(respuesta);
        } catch (error) {
            setClienteSeleccionado(null);

            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No fue posible consultar el estado de cuenta.',
            );
        } finally {
            setCargandoEstadoCuenta(false);
        }
    };

    const limpiarCliente = () => {
        setClienteSeleccionado(null);
        setEstadoCuenta(null);
        setMonto('');
        setNotas('');
    };

    const registrarPago = async () => {
        if (!clienteSeleccionado || !estadoCuenta) {
            Alert.alert('Selecciona un cliente', 'Primero debes seleccionar un cliente.');
            return;
        }

        const montoNumerico = Number(monto.replace(',', '.'));
        const saldoPendiente = Number(estadoCuenta.saldo);

        if (!monto.trim() || !Number.isFinite(montoNumerico) || montoNumerico <= 0) {
            Alert.alert('Monto inválido', 'Ingresa un monto mayor a cero.');
            return;
        }

        if (montoNumerico > saldoPendiente) {
            Alert.alert(
                'Monto superior al saldo',
                `El cliente tiene un saldo pendiente de ${formatearMoneda(saldoPendiente)}.`,
            );
            return;
        }

        try {
            setRegistrando(true);

            await pagoService.crear(request, {
                clienteId: clienteSeleccionado.id,
                monto: montoNumerico,
                metodoPago,
                notas: notas.trim() || undefined,
            });

            Alert.alert(
                'Pago registrado',
                `Se registró el abono de ${formatearMoneda(montoNumerico)} para ${clienteSeleccionado.nombre}.`,
            );

            // Dejamos la pantalla lista para registrar otro pago.
            limpiarCliente();
            setBusqueda('');
        } catch (error) {
            Alert.alert(
                'No se pudo registrar el pago',
                error instanceof Error
                    ? error.message
                    : 'Ocurrió un error al registrar el pago.',
            );
        } finally {
            setRegistrando(false);
        }
    };

    return (

        <SafeAreaView style={styles.contenedor}>
            <ScrollView
                contentContainerStyle={styles.contenido}
                keyboardShouldPersistTaps="handled"
            >
            <View style={styles.encabezado}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.volver}>‹ Volver</Text>
                </Pressable>

                <Text style={styles.titulo}>Registrar pago</Text>
                <Text style={styles.subtitulo}>
                    Registra un abono a la cuenta de un cliente.
                </Text>
            </View>

            {!clienteSeleccionado ? (
                <View style={styles.seccion}>
                    <Text style={styles.etiqueta}>Buscar cliente</Text>

                    <TextInput
                        style={styles.input}
                        value={busqueda}
                        onChangeText={setBusqueda}
                        placeholder="Nombre del cliente"
                        autoCapitalize="words"
                    />

                    {cargandoClientes ? (
                        <ActivityIndicator style={styles.cargando} />
                    ) : clientes.length === 0 ? (
                        <Text style={styles.textoSecundario}>
                            No se encontraron clientes activos.
                        </Text>
                    ) : (
                        <View style={styles.lista}>
                            {clientes.map((cliente) => (
                                <Pressable
                                    key={cliente.id}
                                    style={styles.cliente}
                                    onPress={() => seleccionarCliente(cliente)}
                                >
                                    <View>
                                        <Text style={styles.nombreCliente}>
                                            {cliente.nombre}
                                        </Text>
                                        <Text style={styles.textoSecundario}>
                                            {cliente.telefono || 'Sin teléfono'}
                                        </Text>
                                    </View>
                                    <Text style={styles.seleccionar}>Seleccionar ›</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.seccion}>
                    <View style={styles.clienteSeleccionado}>
                        <View style={styles.flexible}>
                            <Text style={styles.etiqueta}>Cliente seleccionado</Text>
                            <Text style={styles.nombreCliente}>
                                {clienteSeleccionado.nombre}
                            </Text>
                            <Text style={styles.textoSecundario}>
                                {clienteSeleccionado.telefono || 'Sin teléfono'}
                            </Text>
                        </View>

                        <Pressable onPress={limpiarCliente}>
                            <Text style={styles.cambiar}>Cambiar</Text>
                        </Pressable>
                    </View>

                    {cargandoEstadoCuenta ? (
                        <ActivityIndicator style={styles.cargando} />
                    ) : estadoCuenta ? (
                        <View style={styles.saldo}>
                            <Text style={styles.etiqueta}>Saldo pendiente</Text>
                            <Text style={styles.montoSaldo}>
                                {formatearMoneda(estadoCuenta.saldo)}
                            </Text>
                            <Text style={styles.textoSecundario}>
                                Ventas: {formatearMoneda(estadoCuenta.totalVentas)}
                                {'  ·  '}
                                Pagos: {formatearMoneda(estadoCuenta.totalPagos)}
                            </Text>
                        </View>
                    ) : null}
                </View>
            )}

            {clienteSeleccionado && estadoCuenta && (
                <>
                    {Number(estadoCuenta.saldo) > 0 ? (
                        <>
                            <View style={styles.seccion}>
                                <Text style={styles.etiqueta}>Monto del abono</Text>

                                <TextInput
                                    style={styles.inputMonto}
                                    value={monto}
                                    onChangeText={(valor) => {
                                        setMonto(valor.replace(/[^0-9.,]/g, ''));
                                    }}
                                    placeholder="0.00"
                                    keyboardType="decimal-pad"
                                />

                                <Text style={styles.textoSecundario}>
                                    No puede superar el saldo pendiente.
                                </Text>
                            </View>

                            <View style={styles.seccion}>
                                <Text style={styles.etiqueta}>Método de pago</Text>

                                <View style={styles.opciones}>
                                    {(['EFECTIVO', 'TRANSFERENCIA'] as const).map(
                                        (metodo) => (
                                            <Pressable
                                                key={metodo}
                                                onPress={() => setMetodoPago(metodo)}
                                                style={[
                                                    styles.opcion,
                                                    metodoPago === metodo &&
                                                    styles.opcionActiva,
                                                ]}
                                            >
                                                <Text
                                                    style={[
                                                        styles.textoOpcion,
                                                        metodoPago === metodo &&
                                                        styles.textoOpcionActivo,
                                                    ]}
                                                >
                                                    {metodo === 'EFECTIVO'
                                                        ? 'Efectivo'
                                                        : 'Transferencia'}
                                                </Text>
                                            </Pressable>
                                        ),
                                    )}
                                </View>
                            </View>

                            <View style={styles.seccion}>
                                <Text style={styles.etiqueta}>
                                    Notas (opcional)
                                </Text>

                                <TextInput
                                    style={[styles.input, styles.inputNotas]}
                                    value={notas}
                                    onChangeText={setNotas}
                                    placeholder="Ej. Abono semanal"
                                    multiline
                                    maxLength={250}
                                />
                            </View>

                            <Pressable
                                style={[
                                    styles.boton,
                                    registrando && styles.botonDeshabilitado,
                                ]}
                                onPress={registrarPago}
                                disabled={registrando}
                            >
                                {registrando ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.textoBoton}>
                                        Registrar pago
                                    </Text>
                                )}
                            </Pressable>
                        </>
                    ) : (
                        <View style={styles.sinDeuda}>
                            <Text style={styles.sinDeudaTitulo}>
                                Cliente sin deuda pendiente
                            </Text>
                            <Text style={styles.textoSecundario}>
                                No es posible registrar un abono porque su saldo actual es cero.
                            </Text>
                        </View>
                    )}
                </>
            )}
            </ScrollView>
        </SafeAreaView>

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
    encabezado: {
        marginBottom: 24,
    },
    volver: {
        color: '#2563EB',
        fontSize: 16,
        marginBottom: 18,
    },
    titulo: {
        fontSize: 26,
        fontWeight: '700',
        color: '#171717',
    },
    subtitulo: {
        color: '#737373',
        fontSize: 14,
        marginTop: 6,
    },
    seccion: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
    },
    etiqueta: {
        fontSize: 14,
        fontWeight: '600',
        color: '#525252',
        marginBottom: 10,
    },
    input: {
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: '#171717',
    },
    inputMonto: {
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#D4D4D4',
        borderRadius: 10,
        padding: 14,
        fontSize: 26,
        fontWeight: '600',
        color: '#171717',
    },
    inputNotas: {
        minHeight: 85,
        textAlignVertical: 'top',
    },
    lista: {
        marginTop: 10,
    },
    cliente: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    nombreCliente: {
        fontSize: 16,
        fontWeight: '600',
        color: '#171717',
    },
    textoSecundario: {
        fontSize: 13,
        color: '#737373',
        marginTop: 5,
    },
    seleccionar: {
        color: '#2563EB',
        fontSize: 13,
        fontWeight: '600',
    },
    clienteSeleccionado: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    flexible: {
        flex: 1,
    },
    cambiar: {
        color: '#2563EB',
        fontWeight: '600',
    },
    saldo: {
        marginTop: 20,
        padding: 16,
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
    },
    montoSaldo: {
        fontSize: 30,
        fontWeight: '700',
        color: '#171717',
    },
    opciones: {
        flexDirection: 'row',
        gap: 10,
    },
    opcion: {
        flex: 1,
        paddingVertical: 13,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D4D4D4',
        borderRadius: 10,
    },
    opcionActiva: {
        backgroundColor: '#EFF6FF',
        borderColor: '#2563EB',
    },
    textoOpcion: {
        color: '#525252',
        fontWeight: '500',
    },
    textoOpcionActivo: {
        color: '#1D4ED8',
        fontWeight: '700',
    },
    boton: {
        backgroundColor: '#2563EB',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 4,
    },
    botonDeshabilitado: {
        opacity: 0.6,
    },
    textoBoton: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    sinDeuda: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 18,
        marginBottom: 16,
    },
    sinDeudaTitulo: {
        color: '#171717',
        fontSize: 16,
        fontWeight: '700',
    },
    cargando: {
        marginVertical: 20,
    },
});
