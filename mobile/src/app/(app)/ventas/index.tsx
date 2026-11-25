import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { ventaService } from '@/services/venta.service';

import type {
    FiltrosVentas,
    PaginaVentas,
    TipoVenta,
    EstadoVenta,
    VentaListado,
} from '@/types/venta.types';

const LIMITE = 10;

const formatoMoneda = (valor: string) =>
    Number(valor).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
    });

const formatoFecha = (fecha: string) =>
    new Date(fecha).toLocaleString('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

export default function VentasScreen() {
    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [resultado, setResultado] = useState<PaginaVentas | null>(null);
    const [cargando, setCargando] = useState(true);
    const [actualizando, setActualizando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [pagina, setPagina] = useState(1);

    // Filtros que el usuario está editando.
    const [clienteIdTexto, setClienteIdTexto] = useState('');
    const [usuarioIdTexto, setUsuarioIdTexto] = useState('');
    const [fechaDesdeTexto, setFechaDesdeTexto] = useState('');
    const [fechaHastaTexto, setFechaHastaTexto] = useState('');
    const [tipoSeleccionado, setTipoSeleccionado] =
        useState<TipoVenta | undefined>();
    const [estadoSeleccionado, setEstadoSeleccionado] =
        useState<EstadoVenta | undefined>();

    // Filtros que realmente se envían al backend.
    const [filtros, setFiltros] = useState<Omit<FiltrosVentas, 'page' | 'limit'>>({});

    const cargarVentas = useCallback(async (refrescar = false) => {
        if (refrescar) {
            setActualizando(true);
        } else {
            setCargando(true);
        }

        setError(null);

        try {
            const respuesta = await ventaService.listar(request, {
                ...filtros,
                page: pagina,
                limit: LIMITE,
            });

            setResultado(respuesta);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No fue posible cargar las ventas.',
            );
        } finally {
            setCargando(false);
            setActualizando(false);
        }
    }, [request, filtros, pagina]);

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            const ejecutar = async () => {
                if (!vigente) return;
                await cargarVentas();
            };

            void ejecutar();

            return () => {
                vigente = false;
            };
        }, [cargarVentas]),
    );

    const aplicarFiltros = () => {
        const clienteId = clienteIdTexto.trim()
            ? Number(clienteIdTexto)
            : undefined;

        const usuarioId = usuarioIdTexto.trim()
            ? Number(usuarioIdTexto)
            : undefined;

        if (
            (clienteId !== undefined &&
                (!Number.isInteger(clienteId) || clienteId <= 0)) ||
            (usuarioId !== undefined &&
                (!Number.isInteger(usuarioId) || usuarioId <= 0))
        ) {
            setError('Los identificadores deben ser números enteros positivos.');
            return;
        }

        const fechaDesde = fechaDesdeTexto.trim() || undefined;
        const fechaHasta = fechaHastaTexto.trim() || undefined;

        const formatoFechaValido = /^\d{4}-\d{2}-\d{2}$/;

        if (
            (fechaDesde && !formatoFechaValido.test(fechaDesde)) ||
            (fechaHasta && !formatoFechaValido.test(fechaHasta))
        ) {
            setError('Las fechas deben tener el formato YYYY-MM-DD.');
            return;
        }

        if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
            setError('La fecha inicial no puede ser posterior a la fecha final.');
            return;
        }

        setError(null);
        setPagina(1);
        setFiltros({
            clienteId,
            usuarioId,
            tipoVenta: tipoSeleccionado,
            estado: estadoSeleccionado,
            fechaDesde,
            fechaHasta,
        });
    };

    const limpiarFiltros = () => {
        setClienteIdTexto('');
        setUsuarioIdTexto('');
        setFechaDesdeTexto('');
        setFechaHastaTexto('');
        setTipoSeleccionado(undefined);
        setEstadoSeleccionado(undefined);
        setPagina(1);
        setFiltros({});
        setError(null);
    };

    const abrirDetalle = (venta: VentaListado) => {
        router.push({
            pathname: '/ventas/[id]',
            params: { id: String(venta.id) },
        });
    };

    const renderVenta = ({ item }: { item: VentaListado }) => (
        <Pressable
            style={styles.card}
            onPress={() => abrirDetalle(item)}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.ventaId}>Venta #{item.id}</Text>

                <Text
                    style={[
                        styles.estado,
                        item.estado === 'ACTIVA'
                            ? styles.estadoActiva
                            : styles.estadoCancelada,
                    ]}
                >
                    {item.estado}
                </Text>
            </View>

            <Text style={styles.cliente}>{item.cliente.nombre}</Text>

            <Text style={styles.fecha}>
                {formatoFecha(item.fecha)}
            </Text>

            <View style={styles.cardFooter}>
                <View>
                    <Text style={styles.tipo}>
                        {item.tipoVenta}
                    </Text>
                    <Text style={styles.detalles}>
                        {item.detalleVentas.length} producto(s)
                    </Text>
                </View>

                <Text style={styles.total}>
                    {formatoMoneda(item.total)}
                </Text>
            </View>

            <Text style={styles.vendedor}>
                Registró: {item.usuario.nombre}
            </Text>
        </Pressable>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.titulo}>Ventas</Text>
                    <Text style={styles.subtitulo}>
                        Historial de ventas registradas
                    </Text>
                </View>

                <Pressable
                    style={styles.botonNuevo}
                    onPress={() => router.push('/ventas/nueva')}
                >
                    <Text style={styles.botonNuevoTexto}>+ Nueva</Text>
                </Pressable>
            </View>

            <FlatList
                data={resultado?.data ?? []}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderVenta}
                refreshControl={
                    <RefreshControl
                        refreshing={actualizando}
                        onRefresh={() => void cargarVentas(true)}
                    />
                }
                ListHeaderComponent={
                    <View style={styles.filtros}>
                        <Text style={styles.seccionTitulo}>Filtros</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="ID del cliente"
                            keyboardType="number-pad"
                            value={clienteIdTexto}
                            onChangeText={setClienteIdTexto}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="ID del vendedor"
                            keyboardType="number-pad"
                            value={usuarioIdTexto}
                            onChangeText={setUsuarioIdTexto}
                        />

                        <Text style={styles.etiqueta}>Tipo de venta</Text>
                        <View style={styles.opciones}>
                            <Opcion
                                texto="Todos"
                                activa={!tipoSeleccionado}
                                onPress={() => setTipoSeleccionado(undefined)}
                            />
                            <Opcion
                                texto="Fiado"
                                activa={tipoSeleccionado === 'FIADO'}
                                onPress={() => setTipoSeleccionado('FIADO')}
                            />
                            <Opcion
                                texto="Contado"
                                activa={tipoSeleccionado === 'CONTADO'}
                                onPress={() => setTipoSeleccionado('CONTADO')}
                            />
                        </View>

                        <Text style={styles.etiqueta}>Estado</Text>
                        <View style={styles.opciones}>
                            <Opcion
                                texto="Todos"
                                activa={!estadoSeleccionado}
                                onPress={() => setEstadoSeleccionado(undefined)}
                            />
                            <Opcion
                                texto="Activas"
                                activa={estadoSeleccionado === 'ACTIVA'}
                                onPress={() => setEstadoSeleccionado('ACTIVA')}
                            />
                            <Opcion
                                texto="Canceladas"
                                activa={estadoSeleccionado === 'CANCELADA'}
                                onPress={() => setEstadoSeleccionado('CANCELADA')}
                            />
                        </View>

                        <Text style={styles.etiqueta}>
                            Fecha desde (YYYY-MM-DD)
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-11-01"
                            value={fechaDesdeTexto}
                            onChangeText={setFechaDesdeTexto}
                            autoCapitalize="none"
                        />

                        <Text style={styles.etiqueta}>
                            Fecha hasta (YYYY-MM-DD)
                        </Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-11-30"
                            value={fechaHastaTexto}
                            onChangeText={setFechaHastaTexto}
                            autoCapitalize="none"
                        />

                        <View style={styles.botonesFiltros}>
                            <Pressable
                                style={styles.botonAplicar}
                                onPress={aplicarFiltros}
                            >
                                <Text style={styles.botonAplicarTexto}>
                                    Aplicar filtros
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.botonLimpiar}
                                onPress={limpiarFiltros}
                            >
                                <Text style={styles.botonLimpiarTexto}>
                                    Limpiar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.vacio}>
                        {cargando ? (
                            <ActivityIndicator size="large" />
                        ) : (
                            <Text style={styles.vacioTexto}>
                                No se encontraron ventas.
                            </Text>
                        )}
                    </View>
                }
                ListFooterComponent={
                    <View style={styles.paginacion}>
                        <Text style={styles.paginaTexto}>
                            Página {resultado?.page ?? pagina} de{' '}
                            {resultado?.totalPages ?? 1}
                            {' · '}
                            {resultado?.total ?? 0} ventas
                        </Text>

                        <View style={styles.opciones}>
                            <Pressable
                                disabled={pagina <= 1}
                                style={[
                                    styles.botonPagina,
                                    pagina <= 1 && styles.botonDeshabilitado,
                                ]}
                                onPress={() => setPagina((actual) => actual - 1)}
                            >
                                <Text style={styles.botonPaginaTexto}>
                                    Anterior
                                </Text>
                            </Pressable>

                            <Pressable
                                disabled={
                                    !resultado ||
                                    pagina >= resultado.totalPages
                                }
                                style={[
                                    styles.botonPagina,
                                    (!resultado ||
                                        pagina >= resultado.totalPages) &&
                                        styles.botonDeshabilitado,
                                ]}
                                onPress={() => setPagina((actual) => actual + 1)}
                            >
                                <Text style={styles.botonPaginaTexto}>
                                    Siguiente
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                }
                ListHeaderComponentStyle={styles.listaHeader}
                contentContainerStyle={styles.lista}
            />

            {!!error && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTexto}>{error}</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

function Opcion({
    texto,
    activa,
    onPress,
}: {
    texto: string;
    activa: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.opcion,
                activa && styles.opcionActiva,
            ]}
        >
            <Text
                style={[
                    styles.opcionTexto,
                    activa && styles.opcionTextoActivo,
                ]}
            >
                {texto}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F6FA',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titulo: {
        fontSize: 25,
        fontWeight: '700',
        color: '#172033',
    },
    subtitulo: {
        color: '#697386',
        marginTop: 4,
    },
    botonNuevo: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 10,
    },
    botonNuevoTexto: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    lista: {
        paddingHorizontal: 16,
        paddingBottom: 30,
    },
    listaHeader: {
        marginBottom: 14,
    },
    filtros: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        gap: 10,
    },
    seccionTitulo: {
        fontSize: 17,
        fontWeight: '700',
        color: '#172033',
    },
    etiqueta: {
        fontWeight: '600',
        color: '#475569',
        marginTop: 4,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#DCE2EA',
        borderRadius: 9,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#172033',
    },
    opciones: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    opcion: {
        borderWidth: 1,
        borderColor: '#DCE2EA',
        borderRadius: 20,
        paddingHorizontal: 13,
        paddingVertical: 8,
    },
    opcionActiva: {
        backgroundColor: '#DBEAFE',
        borderColor: '#2563EB',
    },
    opcionTexto: {
        color: '#475569',
        fontWeight: '500',
    },
    opcionTextoActivo: {
        color: '#1D4ED8',
        fontWeight: '700',
    },
    botonesFiltros: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 5,
    },
    botonAplicar: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#2563EB',
        borderRadius: 9,
        padding: 12,
    },
    botonAplicarTexto: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    botonLimpiar: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 9,
        paddingHorizontal: 16,
    },
    botonLimpiarTexto: {
        color: '#475569',
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 13,
        padding: 16,
        marginBottom: 12,
        gap: 7,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ventaId: {
        fontWeight: '700',
        color: '#334155',
    },
    estado: {
        overflow: 'hidden',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
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
    cliente: {
        fontSize: 17,
        fontWeight: '700',
        color: '#172033',
    },
    fecha: {
        color: '#64748B',
        fontSize: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    tipo: {
        color: '#475569',
        fontWeight: '700',
    },
    detalles: {
        color: '#64748B',
        fontSize: 12,
        marginTop: 3,
    },
    total: {
        fontSize: 19,
        fontWeight: '700',
        color: '#172033',
    },
    vendedor: {
        color: '#64748B',
        fontSize: 12,
        marginTop: 4,
    },
    vacio: {
        padding: 30,
        alignItems: 'center',
    },
    vacioTexto: {
        color: '#64748B',
    },
    paginacion: {
        paddingVertical: 20,
        gap: 12,
        alignItems: 'center',
    },
    paginaTexto: {
        color: '#64748B',
    },
    botonPagina: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        backgroundColor: '#E2E8F0',
        borderRadius: 9,
    },
    botonDeshabilitado: {
        opacity: 0.4,
    },
    botonPaginaTexto: {
        color: '#334155',
        fontWeight: '600',
    },
    errorContainer: {
        padding: 12,
        backgroundColor: '#FEE2E2',
    },
    errorTexto: {
        color: '#991B1B',
    },
});