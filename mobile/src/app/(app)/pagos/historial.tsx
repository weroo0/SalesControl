import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { pagoService } from '@/services/pago.service';

import type {
    EstadoPago,
    FiltrosPagos,
    MetodoPago,
    PagoListado,
} from '@/types/pago.types';

type FiltrosAplicados = Omit<FiltrosPagos, 'page' | 'limit'>;

const LIMITE = 10;

const formatearMoneda = (cantidad: string | number) =>
    Number(cantidad).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
    });

const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

export default function HistorialPagosScreen() {
    const request = useAuthenticatedRequest();

    const [pagos, setPagos] = useState<PagoListado[]>([]);
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [totalRegistros, setTotalRegistros] = useState(0);
    const [cargando, setCargando] = useState(true);

    // Valores temporales de los filtros.
    const [clienteId, setClienteId] = useState('');
    const [usuarioId, setUsuarioId] = useState('');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [metodoPago, setMetodoPago] = useState<
        MetodoPago | 'TODOS'
    >('TODOS');
    const [estado, setEstado] = useState<EstadoPago | 'TODOS'>('TODOS');

    // Filtros que actualmente se están utilizando en la consulta.
    const [filtrosAplicados, setFiltrosAplicados] =
        useState<FiltrosAplicados>({});

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            const cargarPagos = async () => {
                try {
                    setCargando(true);

                    const respuesta = await pagoService.listar(request, {
                        ...filtrosAplicados,
                        page: pagina,
                        limit: LIMITE,
                    });

                    if (!vigente) return;

                    setPagos(respuesta.data);
                    setTotalPaginas(respuesta.totalPages);
                    setTotalRegistros(respuesta.total);
                } catch (error) {
                    if (vigente) {
                        Alert.alert(
                            'Error',
                            error instanceof Error
                                ? error.message
                                : 'No fue posible cargar los pagos.',
                        );
                    }
                } finally {
                    if (vigente) {
                        setCargando(false);
                    }
                }
            };

            cargarPagos();

            return () => {
                vigente = false;
            };
        }, [request, pagina, filtrosAplicados]),
    );

    const aplicarFiltros = () => {
        const idCliente = clienteId.trim()
            ? Number(clienteId)
            : undefined;

        const idUsuario = usuarioId.trim()
            ? Number(usuarioId)
            : undefined;

        if (
            (idCliente !== undefined &&
                (!Number.isInteger(idCliente) || idCliente <= 0)) ||
            (idUsuario !== undefined &&
                (!Number.isInteger(idUsuario) || idUsuario <= 0))
        ) {
            Alert.alert(
                'Identificador inválido',
                'Los identificadores deben ser números enteros positivos.',
            );
            return;
        }

        if (
            fechaDesde.trim() &&
            !/^\d{4}-\d{2}-\d{2}$/.test(fechaDesde.trim())
        ) {
            Alert.alert(
                'Fecha inválida',
                'La fecha inicial debe tener el formato AAAA-MM-DD.',
            );
            return;
        }

        if (
            fechaHasta.trim() &&
            !/^\d{4}-\d{2}-\d{2}$/.test(fechaHasta.trim())
        ) {
            Alert.alert(
                'Fecha inválida',
                'La fecha final debe tener el formato AAAA-MM-DD.',
            );
            return;
        }

        const nuevosFiltros: FiltrosAplicados = {
            clienteId: idCliente,
            usuarioId: idUsuario,
            fechaDesde: fechaDesde.trim() || undefined,
            fechaHasta: fechaHasta.trim() || undefined,
            metodoPago:
                metodoPago === 'TODOS' ? undefined : metodoPago,
            estado: estado === 'TODOS' ? undefined : estado,
        };

        setPagina(1);
        setFiltrosAplicados(nuevosFiltros);
    };

    const limpiarFiltros = () => {
        setClienteId('');
        setUsuarioId('');
        setFechaDesde('');
        setFechaHasta('');
        setMetodoPago('TODOS');
        setEstado('TODOS');
        setPagina(1);
        setFiltrosAplicados({});
    };

    const cambiarPagina = (nuevaPagina: number) => {
        if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
        setPagina(nuevaPagina);
    };

    const abrirDetalle = (pago: PagoListado) => {
        router.push({
            pathname: '/pagos/[id]',
            params: { id: String(pago.id) },
        });
    };

    return (
        <ScrollView
            style={styles.contenedor}
            contentContainerStyle={styles.contenido}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.encabezado}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.volver}>‹ Volver</Text>
                </Pressable>

                <Text style={styles.titulo}>Historial de pagos</Text>
                <Text style={styles.subtitulo}>
                    Consulta los abonos registrados.
                </Text>

                <Pressable
                    style={styles.botonNuevo}
                    onPress={() => router.push('/pagos/nuevo')}
                >
                    <Text style={styles.textoBotonNuevo}>
                        + Registrar pago
                    </Text>
                </Pressable>
            </View>

            <View style={styles.tarjeta}>
                <Text style={styles.tituloSeccion}>Filtros</Text>

                <Text style={styles.etiqueta}>ID del cliente</Text>
                <TextInput
                    style={styles.input}
                    value={clienteId}
                    onChangeText={setClienteId}
                    placeholder="Ej. 10"
                    keyboardType="number-pad"
                />

                <Text style={styles.etiqueta}>ID del usuario</Text>
                <TextInput
                    style={styles.input}
                    value={usuarioId}
                    onChangeText={setUsuarioId}
                    placeholder="Ej. 2"
                    keyboardType="number-pad"
                />

                <Text style={styles.etiqueta}>Método de pago</Text>
                <View style={styles.opciones}>
                    {(['TODOS', 'EFECTIVO', 'TRANSFERENCIA'] as const).map(
                        (metodo) => (
                            <Pressable
                                key={metodo}
                                onPress={() => setMetodoPago(metodo)}
                                style={[
                                    styles.opcion,
                                    metodoPago === metodo && styles.opcionActiva,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.textoOpcion,
                                        metodoPago === metodo &&
                                            styles.textoOpcionActivo,
                                    ]}
                                >
                                    {metodo === 'TODOS'
                                        ? 'Todos'
                                        : metodo === 'EFECTIVO'
                                          ? 'Efectivo'
                                          : 'Transferencia'}
                                </Text>
                            </Pressable>
                        ),
                    )}
                </View>

                <Text style={styles.etiqueta}>Estado</Text>
                <View style={styles.opciones}>
                    {(['TODOS', 'ACTIVA', 'CANCELADA'] as const).map(
                        (valor) => (
                            <Pressable
                                key={valor}
                                onPress={() => setEstado(valor)}
                                style={[
                                    styles.opcion,
                                    estado === valor && styles.opcionActiva,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.textoOpcion,
                                        estado === valor &&
                                            styles.textoOpcionActivo,
                                    ]}
                                >
                                    {valor === 'TODOS'
                                        ? 'Todos'
                                        : valor === 'ACTIVA'
                                          ? 'Activos'
                                          : 'Cancelados'}
                                </Text>
                            </Pressable>
                        ),
                    )}
                </View>

                <Text style={styles.etiqueta}>Fecha desde</Text>
                <TextInput
                    style={styles.input}
                    value={fechaDesde}
                    onChangeText={setFechaDesde}
                    placeholder="AAAA-MM-DD"
                    autoCapitalize="none"
                />

                <Text style={styles.etiqueta}>Fecha hasta</Text>
                <TextInput
                    style={styles.input}
                    value={fechaHasta}
                    onChangeText={setFechaHasta}
                    placeholder="AAAA-MM-DD"
                    autoCapitalize="none"
                />

                <Pressable
                    style={styles.botonAplicar}
                    onPress={aplicarFiltros}
                >
                    <Text style={styles.textoBotonAplicar}>
                        Aplicar filtros
                    </Text>
                </Pressable>

                <Pressable
                    style={styles.botonLimpiar}
                    onPress={limpiarFiltros}
                >
                    <Text style={styles.textoBotonLimpiar}>
                        Limpiar filtros
                    </Text>
                </Pressable>
            </View>

            <View style={styles.encabezadoLista}>
                <Text style={styles.tituloSeccion}>Pagos registrados</Text>
                <Text style={styles.total}>
                    {totalRegistros} registros
                </Text>
            </View>

            {cargando ? (
                <ActivityIndicator
                    size="large"
                    color="#2563EB"
                    style={styles.cargando}
                />
            ) : pagos.length === 0 ? (
                <View style={styles.vacio}>
                    <Text style={styles.vacioTitulo}>
                        No hay pagos registrados
                    </Text>
                    <Text style={styles.subtitulo}>
                        No se encontraron resultados con los filtros actuales.
                    </Text>
                </View>
            ) : (
                <View style={styles.lista}>
                    {pagos.map((pago) => (
                        <Pressable
                            key={pago.id}
                            style={styles.pago}
                            onPress={() => abrirDetalle(pago)}
                        >
                            <View style={styles.filaPrincipal}>
                                <View style={styles.flexible}>
                                    <Text style={styles.nombreCliente}>
                                        {pago.cliente.nombre}
                                    </Text>
                                    <Text style={styles.fecha}>
                                        {formatearFecha(pago.fechaPago)}
                                    </Text>
                                </View>

                                <Text style={styles.monto}>
                                    {formatearMoneda(pago.monto)}
                                </Text>
                            </View>

                            <View style={styles.filaSecundaria}>
                                <Text style={styles.metodo}>
                                    {pago.metodoPago === 'EFECTIVO'
                                        ? 'Efectivo'
                                        : 'Transferencia'}
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
                                            ? 'Activo'
                                            : 'Cancelado'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.filaInferior}>
                                <Text style={styles.usuario}>
                                    Registró: {pago.usuario.nombre}
                                </Text>
                                <Text style={styles.verDetalle}>
                                    Ver detalle ›
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            )}

            <View style={styles.paginacion}>
                <Pressable
                    style={[
                        styles.botonPagina,
                        pagina <= 1 && styles.botonPaginaDeshabilitado,
                    ]}
                    disabled={pagina <= 1 || cargando}
                    onPress={() => cambiarPagina(pagina - 1)}
                >
                    <Text style={styles.textoPagina}>Anterior</Text>
                </Pressable>

                <Text style={styles.textoPaginacion}>
                    {pagina} de {totalPaginas}
                </Text>

                <Pressable
                    style={[
                        styles.botonPagina,
                        pagina >= totalPaginas &&
                            styles.botonPaginaDeshabilitado,
                    ]}
                    disabled={pagina >= totalPaginas || cargando}
                    onPress={() => cambiarPagina(pagina + 1)}
                >
                    <Text style={styles.textoPagina}>Siguiente</Text>
                </Pressable>
            </View>
        </ScrollView>
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
        fontSize: 14,
        marginTop: 5,
    },
    botonNuevo: {
        backgroundColor: '#2563EB',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 18,
    },
    textoBotonNuevo: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
    tarjeta: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        marginBottom: 22,
    },
    tituloSeccion: {
        fontSize: 18,
        fontWeight: '700',
        color: '#171717',
    },
    etiqueta: {
        color: '#525252',
        fontWeight: '600',
        fontSize: 13,
        marginTop: 16,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 9,
        paddingHorizontal: 12,
        paddingVertical: 11,
        color: '#171717',
        fontSize: 15,
    },
    opciones: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    opcion: {
        borderWidth: 1,
        borderColor: '#D4D4D4',
        borderRadius: 9,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    opcionActiva: {
        borderColor: '#2563EB',
        backgroundColor: '#EFF6FF',
    },
    textoOpcion: {
        color: '#525252',
        fontSize: 13,
    },
    textoOpcionActivo: {
        color: '#1D4ED8',
        fontWeight: '700',
    },
    botonAplicar: {
        backgroundColor: '#2563EB',
        borderRadius: 9,
        padding: 13,
        alignItems: 'center',
        marginTop: 20,
    },
    textoBotonAplicar: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    botonLimpiar: {
        padding: 12,
        alignItems: 'center',
    },
    textoBotonLimpiar: {
        color: '#525252',
        fontWeight: '600',
    },
    encabezadoLista: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    total: {
        color: '#737373',
        fontSize: 13,
    },
    cargando: {
        marginVertical: 30,
    },
    vacio: {
        backgroundColor: '#FFFFFF',
        padding: 22,
        borderRadius: 12,
        alignItems: 'center',
    },
    vacioTitulo: {
        color: '#171717',
        fontSize: 16,
        fontWeight: '700',
    },
    lista: {
        gap: 12,
    },
    pago: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
    },
    filaPrincipal: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    flexible: {
        flex: 1,
    },
    nombreCliente: {
        color: '#171717',
        fontWeight: '700',
        fontSize: 16,
    },
    fecha: {
        color: '#737373',
        fontSize: 12,
        marginTop: 5,
    },
    monto: {
        color: '#171717',
        fontSize: 18,
        fontWeight: '700',
        marginLeft: 8,
    },
    filaSecundaria: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
    },
    metodo: {
        color: '#525252',
        fontSize: 13,
    },
    estadoBadge: {
        borderRadius: 20,
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    estadoActivo: {
        backgroundColor: '#DCFCE7',
    },
    estadoCancelado: {
        backgroundColor: '#FEE2E2',
    },
    textoEstado: {
        fontSize: 12,
        fontWeight: '700',
    },
    textoActivo: {
        color: '#166534',
    },
    textoCancelado: {
        color: '#991B1B',
    },
    filaInferior: {
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        marginTop: 13,
        paddingTop: 11,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    usuario: {
        color: '#737373',
        fontSize: 12,
    },
    verDetalle: {
        color: '#2563EB',
        fontSize: 12,
        fontWeight: '600',
    },
    paginacion: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    botonPagina: {
        backgroundColor: '#FFFFFF',
        borderRadius: 9,
        paddingVertical: 11,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    botonPaginaDeshabilitado: {
        opacity: 0.4,
    },
    textoPagina: {
        color: '#2563EB',
        fontWeight: '600',
    },
    textoPaginacion: {
        color: '#525252',
        fontWeight: '600',
    },
});
