import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { clienteService } from '@/services/cliente.service';
import { productoService } from '@/services/producto.service';
import { ventaService } from '@/services/venta.service';

import type { Cliente } from '@/types/cliente.types';
import type { Producto } from '@/types/producto.types';
import type { TipoVenta } from '@/types/venta.types';

interface ProductoCarrito {
    producto: Producto;
    cantidad: number;
}

const LIMITE_RESULTADOS = 50;

function obtenerCentavos(precio: string): number {
    const [entero, decimal = ''] = precio.split('.');

    return (
        Number(entero) * 100 +
        Number(decimal.padEnd(2, '0').slice(0, 2))
    );
}

function formatoMoneda(centavos: number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(centavos / 100);
}

export default function NuevaVentaScreen() {
    const request = useAuthenticatedRequest();

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);

    const [clienteSeleccionado, setClienteSeleccionado] =
        useState<Cliente | null>(null);

    const [busquedaCliente, setBusquedaCliente] = useState('');
    const [busquedaProducto, setBusquedaProducto] = useState('');

    const [carrito, setCarrito] = useState<ProductoCarrito[]>([]);

    const [tipoVenta, setTipoVenta] = useState<TipoVenta>('FIADO');

    const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [mensajeExito, setMensajeExito] = useState('');

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            const cargarCatalogos = async () => {
                try {
                    setCargandoCatalogo(true);
                    setError('');

                    const [respuestaClientes, respuestaProductos] =
                        await Promise.all([
                            clienteService.listarPaginado(request, {
                                activo: true,
                                page: 1,
                                limit: LIMITE_RESULTADOS,
                            }),
                            productoService.listarPaginado(request, {
                                activo: true,
                                page: 1,
                                limit: LIMITE_RESULTADOS,
                            }),
                        ]);

                    if (!vigente) return;

                    setClientes(respuestaClientes.data);
                    setProductos(respuestaProductos.data);
                } catch (err) {
                    if (!vigente) return;

                    setError(
                        err instanceof Error
                            ? err.message
                            : 'No se pudieron cargar los catálogos.',
                    );
                } finally {
                    if (vigente) {
                        setCargandoCatalogo(false);
                    }
                }
            };

            cargarCatalogos();

            return () => {
                vigente = false;
            };
        }, [request]),
    );

    useEffect(() => {
        const termino = busquedaCliente.trim();

        if (termino.length < 2) return;

        let vigente = true;

        const timeout = setTimeout(async () => {
            try {
                const respuesta = await clienteService.listarPaginado(
                    request,
                    {
                        activo: true,
                        nombre: termino,
                        page: 1,
                        limit: LIMITE_RESULTADOS,
                    },
                );

                if (vigente) {
                    setClientes(respuesta.data);
                }
            } catch (err) {
                if (vigente) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'No se pudo buscar el cliente.',
                    );
                }
            }
        }, 300);

        return () => {
            vigente = false;
            clearTimeout(timeout);
        };
    }, [busquedaCliente, request]);

    useEffect(() => {
        const termino = busquedaProducto.trim();

        if (termino.length < 2) return;

        let vigente = true;

        const timeout = setTimeout(async () => {
            try {
                const respuesta = await productoService.listarPaginado(
                    request,
                    {
                        activo: true,
                        nombre: termino,
                        page: 1,
                        limit: LIMITE_RESULTADOS,
                    },
                );

                if (vigente) {
                    setProductos(respuesta.data);
                }
            } catch (err) {
                if (vigente) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'No se pudieron buscar los productos.',
                    );
                }
            }
        }, 300);

        return () => {
            vigente = false;
            clearTimeout(timeout);
        };
    }, [busquedaProducto, request]);

    const agregarProducto = (producto: Producto) => {
        setMensajeExito('');
        setError('');

        setCarrito(actual => {
            const existente = actual.find(
                item => item.producto.id === producto.id,
            );

            if (existente) {
                return actual.map(item =>
                    item.producto.id === producto.id
                        ? { ...item, cantidad: item.cantidad + 1 }
                        : item,
                );
            }

            return [
                ...actual,
                {
                    producto,
                    cantidad: 1,
                },
            ];
        });
    };

    const cambiarCantidad = (productoId: number, cambio: number) => {
        setMensajeExito('');

        setCarrito(actual =>
            actual
                .map(item =>
                    item.producto.id === productoId
                        ? {
                              ...item,
                              cantidad: item.cantidad + cambio,
                          }
                        : item,
                )
                .filter(item => item.cantidad > 0),
        );
    };

    const eliminarProducto = (productoId: number) => {
        setMensajeExito('');

        setCarrito(actual =>
            actual.filter(item => item.producto.id !== productoId),
        );
    };

    const totalCentavos = carrito.reduce(
        (total, item) =>
            total +
            obtenerCentavos(item.producto.precio) * item.cantidad,
        0,
    );

    const registrarVenta = async () => {
        setError('');
        setMensajeExito('');

        if (!clienteSeleccionado) {
            setError('Selecciona un cliente antes de registrar la venta.');
            return;
        }

        if (carrito.length === 0) {
            setError('Agrega al menos un producto a la venta.');
            return;
        }

        if (carrito.some(item => item.cantidad <= 0)) {
            setError('Todas las cantidades deben ser mayores que cero.');
            return;
        }

        if (guardando) return;

        try {
            setGuardando(true);

            const venta = await ventaService.crear(request, {
                clienteId: clienteSeleccionado.id,
                tipoVenta,
                detalles: carrito.map(item => ({
                    productoId: item.producto.id,
                    cantidad: item.cantidad,
                })),
            });

            setCarrito([]);
            setClienteSeleccionado(null);
            setBusquedaCliente('');
            setBusquedaProducto('');

            setMensajeExito(
                `Venta #${venta.id} registrada correctamente. Total: ${formatoMoneda(
                    obtenerCentavos(venta.total),
                )}`,
            );

        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudo registrar la venta.',
            );
        } finally {
            setGuardando(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <Text style={styles.title}>Nueva venta</Text>
                <Text style={styles.subtitle}>
                    Registra una venta sin salir de esta pantalla.
                </Text>

                {mensajeExito ? (
                    <View style={styles.successBox}>
                        <Text style={styles.successText}>
                            {mensajeExito}
                        </Text>
                    </View>
                ) : null}

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {cargandoCatalogo ? (
                    <View style={styles.loading}>
                        <ActivityIndicator size="large" />
                        <Text style={styles.muted}>
                            Cargando clientes y productos...
                        </Text>
                    </View>
                ) : (
                    <>
                        {/* CLIENTE */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                1. Cliente
                            </Text>

                            {clienteSeleccionado ? (
                                <View style={styles.selectedBox}>
                                    <View style={styles.flex}>
                                        <Text style={styles.selectedName}>
                                            {clienteSeleccionado.nombre}
                                        </Text>
                                        {clienteSeleccionado.telefono ? (
                                            <Text style={styles.muted}>
                                                {clienteSeleccionado.telefono}
                                            </Text>
                                        ) : null}
                                    </View>

                                    <Pressable
                                        onPress={() => {
                                            setClienteSeleccionado(null);
                                            setMensajeExito('');
                                        }}
                                    >
                                        <Text style={styles.changeText}>
                                            Cambiar
                                        </Text>
                                    </Pressable>
                                </View>
                            ) : (
                                <>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Buscar por nombre o teléfono..."
                                        value={busquedaCliente}
                                        onChangeText={value => {
                                            setBusquedaCliente(value);
                                            setMensajeExito('');
                                        }}
                                    />

                                    {busquedaCliente.trim().length < 2 ? (
                                        <Text style={styles.hint}>
                                            Escribe al menos 2 caracteres para
                                            buscar.
                                        </Text>
                                    ) : (
                                        <View style={styles.resultsBox}>
                                            {clientes.length === 0 ? (
                                                <Text style={styles.emptyText}>
                                                    No se encontraron clientes.
                                                </Text>
                                            ) : (
                                                clientes.map(cliente => (
                                                    <Pressable
                                                        key={cliente.id}
                                                        style={styles.resultItem}
                                                        onPress={() => {
                                                            setClienteSeleccionado(
                                                                cliente,
                                                            );
                                                            setBusquedaCliente('');
                                                            setMensajeExito('');
                                                        }}
                                                    >
                                                        <View style={styles.flex}>
                                                            <Text style={styles.itemName}>
                                                                {cliente.nombre}
                                                            </Text>
                                                            {cliente.telefono ? (
                                                                <Text style={styles.muted}>
                                                                    {cliente.telefono}
                                                                </Text>
                                                            ) : null}
                                                        </View>
                                                        <Text style={styles.addText}>
                                                            Seleccionar
                                                        </Text>
                                                    </Pressable>
                                                ))
                                            )}
                                        </View>
                                    )}
                                </>
                            )}
                        </View>

                        {/* PRODUCTOS */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                2. Productos
                            </Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Buscar producto..."
                                value={busquedaProducto}
                                onChangeText={value => {
                                    setBusquedaProducto(value);
                                    setMensajeExito('');
                                }}
                            />

                            {busquedaProducto.trim().length < 2 ? (
                                <Text style={styles.hint}>
                                    Escribe al menos 2 caracteres para buscar.
                                </Text>
                            ) : (
                                <View style={styles.resultsBox}>
                                    {productos.length === 0 ? (
                                        <Text style={styles.emptyText}>
                                            No se encontraron productos.
                                        </Text>
                                    ) : (
                                        productos.map(producto => (
                                            <View
                                                key={producto.id}
                                                style={styles.resultItem}
                                            >
                                                <View style={styles.flex}>
                                                    <Text style={styles.itemName}>
                                                        {producto.nombre}
                                                    </Text>
                                                    <Text style={styles.muted}>
                                                        {formatoMoneda(
                                                            obtenerCentavos(
                                                                producto.precio,
                                                            ),
                                                        )}
                                                    </Text>
                                                </View>

                                                <Pressable
                                                    style={styles.addButton}
                                                    onPress={() =>
                                                        agregarProducto(producto)
                                                    }
                                                >
                                                    <Text style={styles.addButtonText}>
                                                        + Agregar
                                                    </Text>
                                                </Pressable>
                                            </View>
                                        ))
                                    )}
                                </View>
                            )}
                        </View>

                        {/* CARRITO */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                3. Venta actual ({carrito.length})
                            </Text>

                            {carrito.length === 0 ? (
                                <Text style={styles.emptyText}>
                                    Todavía no has agregado productos.
                                </Text>
                            ) : (
                                carrito.map(item => (
                                    <View
                                        key={item.producto.id}
                                        style={styles.cartItem}
                                    >
                                        <View style={styles.flex}>
                                            <Text style={styles.itemName}>
                                                {item.producto.nombre}
                                            </Text>
                                            <Text style={styles.muted}>
                                                {formatoMoneda(
                                                    obtenerCentavos(
                                                        item.producto.precio,
                                                    ),
                                                )}{' '}
                                                por unidad
                                            </Text>

                                            <Text style={styles.subtotal}>
                                                Subtotal:{' '}
                                                {formatoMoneda(
                                                    obtenerCentavos(
                                                        item.producto.precio,
                                                    ) * item.cantidad,
                                                )}
                                            </Text>
                                        </View>

                                        <View style={styles.quantityArea}>
                                            <View style={styles.quantityControls}>
                                                <Pressable
                                                    style={styles.quantityButton}
                                                    onPress={() =>
                                                        cambiarCantidad(
                                                            item.producto.id,
                                                            -1,
                                                        )
                                                    }
                                                >
                                                    <Text style={styles.quantityButtonText}>
                                                        −
                                                    </Text>
                                                </Pressable>

                                                <Text style={styles.quantity}>
                                                    {item.cantidad}
                                                </Text>

                                                <Pressable
                                                    style={styles.quantityButton}
                                                    onPress={() =>
                                                        cambiarCantidad(
                                                            item.producto.id,
                                                            1,
                                                        )
                                                    }
                                                >
                                                    <Text style={styles.quantityButtonText}>
                                                        +
                                                    </Text>
                                                </Pressable>
                                            </View>

                                            <Pressable
                                                onPress={() =>
                                                    eliminarProducto(
                                                        item.producto.id,
                                                    )
                                                }
                                            >
                                                <Text style={styles.removeText}>
                                                    Quitar
                                                </Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))
                            )}

                            <View style={styles.totalBox}>
                                <Text style={styles.totalLabel}>
                                    Total estimado
                                </Text>
                                <Text style={styles.totalAmount}>
                                    {formatoMoneda(totalCentavos)}
                                </Text>
                            </View>
                        </View>

                        {/* TIPO DE VENTA */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                4. Tipo de venta
                            </Text>

                            <View style={styles.typeContainer}>
                                <Pressable
                                    style={[
                                        styles.typeButton,
                                        tipoVenta === 'FIADO' &&
                                            styles.typeSelected,
                                    ]}
                                    onPress={() => {
                                        setTipoVenta('FIADO');
                                        setMensajeExito('');
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.typeText,
                                            tipoVenta === 'FIADO' &&
                                                styles.typeTextSelected,
                                        ]}
                                    >
                                        FIADO
                                    </Text>
                                    <Text style={styles.typeDescription}>
                                        Se suma a la deuda
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={[
                                        styles.typeButton,
                                        tipoVenta === 'CONTADO' &&
                                            styles.typeSelected,
                                    ]}
                                    onPress={() => {
                                        setTipoVenta('CONTADO');
                                        setMensajeExito('');
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.typeText,
                                            tipoVenta === 'CONTADO' &&
                                                styles.typeTextSelected,
                                        ]}
                                    >
                                        CONTADO
                                    </Text>
                                    <Text style={styles.typeDescription}>
                                        No genera adeudo
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* REGISTRAR */}
                        <Pressable
                            style={[
                                styles.submitButton,
                                (guardando ||
                                    !clienteSeleccionado ||
                                    carrito.length === 0) &&
                                    styles.submitDisabled,
                            ]}
                            onPress={registrarVenta}
                            disabled={
                                guardando ||
                                !clienteSeleccionado ||
                                carrito.length === 0
                            }
                        >
                            {guardando ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitText}>
                                    Registrar venta ·{' '}
                                    {formatoMoneda(totalCentavos)}
                                </Text>
                            )}
                        </Pressable>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    container: {
        padding: 18,
        paddingBottom: 40,
    },
    title: {
        fontSize: 25,
        fontWeight: '700',
        color: '#172033',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
        marginBottom: 20,
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#172033',
        marginBottom: 12,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 9,
        paddingHorizontal: 13,
        fontSize: 15,
        backgroundColor: '#FFFFFF',
        color: '#172033',
    },
    hint: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 8,
    },
    resultsBox: {
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 9,
        overflow: 'hidden',
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    flex: {
        flex: 1,
    },
    itemName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#172033',
    },
    muted: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 3,
    },
    addText: {
        color: '#2563EB',
        fontWeight: '600',
        fontSize: 13,
    },
    addButton: {
        backgroundColor: '#EFF6FF',
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    addButtonText: {
        color: '#2563EB',
        fontWeight: '700',
    },
    selectedBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: 9,
        padding: 13,
        borderWidth: 1,
        borderColor: '#BBF7D0',
    },
    selectedName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#166534',
    },
    changeText: {
        color: '#2563EB',
        fontWeight: '600',
        paddingLeft: 10,
    },
    emptyText: {
        fontSize: 13,
        color: '#64748B',
        padding: 12,
        textAlign: 'center',
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        gap: 8,
    },
    subtotal: {
        fontSize: 13,
        color: '#172033',
        fontWeight: '600',
        marginTop: 5,
    },
    quantityArea: {
        alignItems: 'center',
        gap: 8,
    },
    quantityControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    quantityButton: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonText: {
        fontSize: 19,
        color: '#2563EB',
        fontWeight: '700',
    },
    quantity: {
        fontSize: 15,
        fontWeight: '700',
        color: '#172033',
        minWidth: 15,
        textAlign: 'center',
    },
    removeText: {
        color: '#DC2626',
        fontSize: 12,
        fontWeight: '600',
    },
    totalBox: {
        marginTop: 15,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        color: '#475569',
        fontSize: 15,
        fontWeight: '600',
    },
    totalAmount: {
        color: '#172033',
        fontSize: 22,
        fontWeight: '800',
    },
    typeContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    typeButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    typeSelected: {
        borderColor: '#2563EB',
        backgroundColor: '#EFF6FF',
    },
    typeText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#475569',
    },
    typeTextSelected: {
        color: '#2563EB',
    },
    typeDescription: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 5,
        textAlign: 'center',
    },
    submitButton: {
        backgroundColor: '#2563EB',
        padding: 17,
        borderRadius: 11,
        alignItems: 'center',
        marginTop: 3,
    },
    submitDisabled: {
        opacity: 0.45,
    },
    submitText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    loading: {
        padding: 35,
        alignItems: 'center',
        gap: 12,
    },
    errorBox: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 9,
        padding: 12,
        marginBottom: 12,
    },
    errorText: {
        color: '#B91C1C',
        fontSize: 13,
    },
    successBox: {
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        borderRadius: 9,
        padding: 12,
        marginBottom: 12,
    },
    successText: {
        color: '#166534',
        fontSize: 13,
        fontWeight: '600',
    },
});
