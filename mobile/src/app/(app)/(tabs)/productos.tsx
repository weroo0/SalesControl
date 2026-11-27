import { useCallback, useState } from 'react';

import {
    useFocusEffect,
    useRouter,
} from 'expo-router';

import {
    ActivityIndicator,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { productoService } from '@/services/producto.service';
import { categoriaService } from '@/services/categoria.service';
import { ApiError } from '@/services/api';

import type { Producto } from '@/types/producto.types';
import type { Categoria } from '@/types/categoria.types';

const LIMITES = [10, 20, 50] as const;

const monedaMXN = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
});

function formatearPrecio(precio: string): string {
    const numero = Number(precio);

    return Number.isFinite(numero)
        ? monedaMXN.format(numero)
        : precio;
}

export default function ProductosScreen() {
    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [productos, setProductos] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);

    const [total, setTotal] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(0);

    const [activo, setActivo] = useState(true);

    const [busqueda, setBusqueda] = useState('');
    const [nombreAplicado, setNombreAplicado] = useState('');

    const [categoriaId, setCategoriaId] =
        useState<number | null>(null);

    const [pagina, setPagina] = useState(1);
    const [limite, setLimite] = useState(20);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);

    const [cargandoCategorias, setCargandoCategorias] =
        useState(true);

    const [errorCategorias, setErrorCategorias] =
        useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            async function cargarCategorias() {
                setCargandoCategorias(true);
                setErrorCategorias(null);

                try {
                    const resultado = await categoriaService.listar(
                        request,
                        true,
                    );

                    if (vigente) {
                        setCategorias(resultado);
                    }
                } catch (err) {
                    if (!vigente) return;

                    setCategorias([]);

                    if (err instanceof ApiError && err.status === 401) {
                        return;
                    }

                    if (err instanceof ApiError && err.status === 403) {
                        setErrorCategorias(
                            'No tienes permiso para consultar categorías.',
                        );
                    } else {
                        setErrorCategorias(
                            err instanceof Error
                                ? err.message
                                : 'No se pudieron cargar las categorías.',
                        );
                    }
                } finally {
                    if (vigente) {
                        setCargandoCategorias(false);
                    }
                }
            }

            void cargarCategorias();

            return () => {
                vigente = false;
            };
        }, [request]),
    );

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            async function cargarProductos() {
                setCargando(true);
                setError(null);

                try {
                    const resultado =
                        await productoService.listarPaginado(
                            request,
                            {
                                activo,
                                nombre: nombreAplicado,
                                categoriaId: categoriaId ?? undefined,
                                page: pagina,
                                limit: limite,
                            },
                        );

                    if (!vigente) return;

                    setProductos(resultado.data);
                    setTotal(resultado.total);
                    setTotalPaginas(resultado.totalPages);
                } catch (err) {
                    if (!vigente) return;

                    if (err instanceof ApiError) {
                        if (err.status === 401) {
                            return;
                        }

                        if (err.status === 403) {
                            setError(
                                'No tienes permiso para consultar productos.',
                            );
                        } else {
                            setError(err.message);
                        }
                    } else {
                        setError(
                            err instanceof Error
                                ? err.message
                                : 'No fue posible cargar los productos.',
                        );
                    }
                } finally {
                    if (vigente) {
                        setCargando(false);
                    }
                }
            }

            void cargarProductos();

            return () => {
                vigente = false;
            };
        }, [
            request,
            activo,
            nombreAplicado,
            categoriaId,
            pagina,
            limite,
            recarga,
        ]),
    );

    function cambiarEstado(nuevoEstado: boolean) {
        setActivo(nuevoEstado);
        setPagina(1);
    }

    function aplicarBusqueda() {
        setNombreAplicado(busqueda.trim());
        setPagina(1);
    }

    function limpiarBusqueda() {
        setBusqueda('');
        setNombreAplicado('');
        setPagina(1);
    }

    function cambiarCategoria(nuevoId: number | null) {
        setCategoriaId(nuevoId);
        setPagina(1);
    }

    function cambiarLimite(nuevoLimite: number) {
        setLimite(nuevoLimite);
        setPagina(1);
    }

    const puedeRetroceder = !cargando && pagina > 1;

    const puedeAvanzar =
        !cargando && pagina < totalPaginas;

    function irAnterior() {
        setPagina((actual) => Math.max(1, actual - 1));
    }

    function irSiguiente() {
        setPagina((actual) =>
            Math.min(totalPaginas, actual + 1),
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.navigate('/')}>
                    <Text style={styles.back}>← Volver</Text>
                </Pressable>

                <Text style={styles.title}>Productos</Text>
                <Pressable style={styles.newButton} onPress={() => router.push('/productos/nuevo')}>
                    <Text style={styles.newButtonText}>Nuevo producto</Text>
                </Pressable>
            </View>



            <FlatList
                data={cargando || error ? [] : productos}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"

                ListHeaderComponent={
                    <View style={styles.filters}>
                        <Text style={styles.label}>Estado</Text>

                        <View style={styles.segmented}>
                            <Pressable
                                style={[
                                    styles.segment,
                                    activo && styles.segmentSelected,
                                ]}
                                onPress={() => cambiarEstado(true)}
                            >
                                <Text
                                    style={[
                                        styles.segmentText,
                                        activo && styles.segmentTextSelected,
                                    ]}
                                >
                                    Activos
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.segment,
                                    !activo && styles.segmentSelected,
                                ]}
                                onPress={() => cambiarEstado(false)}
                            >
                                <Text
                                    style={[
                                        styles.segmentText,
                                        !activo && styles.segmentTextSelected,
                                    ]}
                                >
                                    Inactivos
                                </Text>
                            </Pressable>
                        </View>

                        <Text style={styles.label}>
                            Buscar por nombre
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={busqueda}
                            onChangeText={setBusqueda}
                            placeholder="Ej. Perfume"
                            autoCorrect={false}
                            returnKeyType="search"
                            onSubmitEditing={aplicarBusqueda}
                        />

                        <View style={styles.actions}>
                            <Pressable
                                style={styles.primaryButton}
                                onPress={aplicarBusqueda}
                            >
                                <Text style={styles.primaryText}>
                                    Buscar
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.secondaryButton}
                                onPress={limpiarBusqueda}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    Limpiar
                                </Text>
                            </Pressable>
                        </View>

                        <Text style={styles.label}>
                            Categoría
                        </Text>

                        {cargandoCategorias ? (
                            <ActivityIndicator
                                size="small"
                                color="#2563EB"
                            />
                        ) : null}

                        {errorCategorias ? (
                            <Text style={styles.warning}>
                                {errorCategorias}
                            </Text>
                        ) : null}

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.categoryOptions}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Pressable
                                style={[
                                    styles.categoryChip,
                                    categoriaId === null &&
                                    styles.categoryChipSelected,
                                ]}
                                onPress={() => cambiarCategoria(null)}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        categoriaId === null &&
                                        styles.chipTextSelected,
                                    ]}
                                >
                                    Todas
                                </Text>
                            </Pressable>

                            {categorias.map((categoria) => (
                                <Pressable
                                    key={categoria.id}
                                    style={[
                                        styles.categoryChip,
                                        categoriaId === categoria.id &&
                                        styles.categoryChipSelected,
                                    ]}
                                    onPress={() =>
                                        cambiarCategoria(categoria.id)
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            categoriaId === categoria.id &&
                                            styles.chipTextSelected,
                                        ]}
                                    >
                                        {categoria.nombre}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>
                            Registros por página
                        </Text>

                        <View style={styles.limitOptions}>
                            {LIMITES.map((cantidad) => (
                                <Pressable
                                    key={cantidad}
                                    style={[
                                        styles.limitButton,
                                        limite === cantidad &&
                                        styles.limitSelected,
                                    ]}
                                    onPress={() => cambiarLimite(cantidad)}
                                >
                                    <Text
                                        style={[
                                            styles.limitText,
                                            limite === cantidad &&
                                            styles.limitTextSelected,
                                        ]}
                                    >
                                        {cantidad}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={styles.resultsHeader}>
                            <Text style={styles.label}>
                                {cargando
                                    ? 'Consultando productos...'
                                    : `${total} producto(s) encontrados`}
                            </Text>

                            <Pressable
                                disabled={cargando}
                                onPress={() =>
                                    setRecarga((actual) => actual + 1)
                                }
                            >
                                <Text style={styles.refresh}>
                                    Actualizar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                }

                ListEmptyComponent={
                    cargando ? (
                        <View style={styles.center}>
                            <ActivityIndicator
                                size="large"
                                color="#2563EB"
                            />
                        </View>
                    ) : error ? (
                        <View style={styles.center}>
                            <Text style={styles.error}>{error}</Text>

                            <Pressable
                                style={styles.primaryButton}
                                onPress={() =>
                                    setRecarga((actual) => actual + 1)
                                }
                            >
                                <Text style={styles.primaryText}>
                                    Reintentar
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <Text style={styles.empty}>
                            No se encontraron productos con esos filtros.
                        </Text>
                    )
                }


                renderItem={({ item }) => (
                    <Pressable
                        style={styles.card}
                        onPress={() =>
                            router.push({
                                pathname: '/productos/[id]',
                                params: {
                                    id: String(item.id),
                                },
                            })
                        }
                    >
                        <View style={styles.cardTop}>
                            <Text style={styles.productName}>
                                {item.nombre}
                            </Text>

                            <Text style={styles.price}>
                                {formatearPrecio(item.precio)}
                            </Text>
                        </View>

                        <Text style={styles.detail}>
                            Categoría:{' '}
                            {item.categoria?.nombre ??
                                `#${item.categoriaId}`}
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

                        <Text style={styles.openDetail}>
                            Ver detalle →
                        </Text>
                    </Pressable>
                )}

                ListFooterComponent={
                    !cargando && !error ? (
                        <View style={styles.pagination}>
                            <Pressable
                                style={[
                                    styles.pageButton,
                                    !puedeRetroceder && styles.disabled,
                                ]}
                                disabled={!puedeRetroceder}
                                onPress={irAnterior}
                            >
                                <Text style={styles.pageButtonText}>
                                    Anterior
                                </Text>
                            </Pressable>

                            <View style={styles.pageInfo}>
                                <Text style={styles.pageText}>
                                    Página {pagina} de {Math.max(1, totalPaginas)}
                                </Text>

                                <Text style={styles.pageSubtext}>
                                    {productos.length} de {total} registros
                                </Text>
                            </View>

                            <Pressable
                                style={[
                                    styles.pageButton,
                                    !puedeAvanzar && styles.disabled,
                                ]}
                                disabled={!puedeAvanzar}
                                onPress={irSiguiente}
                            >
                                <Text style={styles.pageButtonText}>
                                    Siguiente
                                </Text>
                            </Pressable>
                        </View>
                    ) : undefined
                }
            />
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
        gap: 10,
    },
    back: {
        color: '#2563EB',
        fontWeight: '600',
        fontSize: 16,
    },
    title: {
        fontSize: 27,
        fontWeight: '700',
        color: '#162033',
    },
    content: {
        padding: 16,
        paddingBottom: 30,
        gap: 12,
        flexGrow: 1,
    },
    filters: {
        gap: 12,
        marginBottom: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    segmented: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 10,
        backgroundColor: '#E2E8F0',
    },
    segment: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    segmentSelected: {
        backgroundColor: '#2563EB',
    },
    segmentText: {
        color: '#475569',
        fontWeight: '600',
    },
    segmentTextSelected: {
        color: '#FFFFFF',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        padding: 13,
        fontSize: 15,
        color: '#162033',
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    primaryButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    primaryText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    secondaryButtonText: {
        color: '#334155',
        fontWeight: '600',
    },
    categoryOptions: {
        gap: 8,
        paddingVertical: 4,
    },
    categoryChip: {
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
    },
    categoryChipSelected: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    chipText: {
        color: '#334155',
        fontWeight: '600',
    },
    chipTextSelected: {
        color: '#FFFFFF',
    },
    limitOptions: {
        flexDirection: 'row',
        gap: 10,
    },
    limitButton: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 9,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
    },
    limitSelected: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    limitText: {
        color: '#334155',
        fontWeight: '600',
    },
    limitTextSelected: {
        color: '#FFFFFF',
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    refresh: {
        color: '#2563EB',
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        gap: 10,
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'flex-start',
    },
    productName: {
        flex: 1,
        color: '#162033',
        fontSize: 17,
        fontWeight: '700',
    },
    price: {
        color: '#162033',
        fontSize: 17,
        fontWeight: '700',
    },
    detail: {
        color: '#64748B',
        fontSize: 14,
    },
    active: {
        color: '#16845D',
        fontSize: 13,
        fontWeight: '600',
    },
    inactive: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '600',
    },
    center: {
        padding: 30,
        alignItems: 'center',
        gap: 14,
    },
    error: {
        color: '#DC2626',
        textAlign: 'center',
    },
    warning: {
        color: '#D97706',
        fontSize: 13,
    },
    empty: {
        color: '#64748B',
        textAlign: 'center',
        padding: 30,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        marginTop: 14,
    },
    pageButton: {
        backgroundColor: '#2563EB',
        padding: 12,
        borderRadius: 8,
    },
    pageButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13,
    },
    pageInfo: {
        alignItems: 'center',
        gap: 4,
    },
    pageText: {
        color: '#162033',
        fontSize: 13,
        fontWeight: '600',
    },
    pageSubtext: {
        color: '#64748B',
        fontSize: 11,
    },
    disabled: {
        opacity: 0.4,
    },
    openDetail: {
        textAlign: 'right',
        color: '#2563EB',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 6,
    },
    newButton: {
        backgroundColor: '#16845D',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 4,
    },

    newButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
