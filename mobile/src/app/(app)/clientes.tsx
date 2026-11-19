import { act, useCallback, useState } from "react";

import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, TextInput } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { clienteService } from "@/services/cliente.service";
import { ApiError } from "@/services/api";

import type { Cliente } from "@/types/cliente.types";
import { useAuthenticatedRequest } from "@/hooks/useAuthenticatedRequest";

import { useRouter, useFocusEffect } from "expo-router";

const LIMITES = [10, 20, 50] as const;

export default function ClientesScreen() {
    const request = useAuthenticatedRequest();
    const router = useRouter();

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    const [activo, setActivo] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [nombreAplicado, setNombreAplicado] = useState('');

    const [pagina, setPagina] = useState(1);
    const [limite, setLimite] = useState(20);

    const [total, setTotal] = useState(0);
    const [totalPaginas, setTotalPaginas] = useState(0);

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            async function cargarClientes() {
                setCargando(true);
                setError(null);

                try {
                    const resultado = await clienteService.listarPaginado(
                        request,
                        {
                            activo,
                            nombre: nombreAplicado,
                            page: pagina,
                            limit: limite,
                        },
                    );

                    if (vigente) {
                        setClientes(resultado.data);
                        setTotal(resultado.total);
                        setTotalPaginas(resultado.totalPages);
                    }
                } catch (err) {
                    if (!vigente) return;

                    if (err instanceof ApiError && err.status === 401) {
                        return;
                    } else if (err instanceof ApiError && err.status === 403) {
                        setError('Tu usuario no tiene permiso para consultar clientes');
                    } else {
                        setError(
                            err instanceof Error
                                ? err.message
                                : 'No fue posible obtener los clientes',

                        );
                    }
                } finally {
                    if (vigente) {
                        setCargando(false);
                    }
                }
            }

            void cargarClientes();

            return () => {
                vigente = false;
            };
        }, [request, recarga, activo, nombreAplicado, pagina, limite])
    );

    function cambiarEstado(nuevoEstado: boolean) {
        setActivo(nuevoEstado);
        setPagina(1);
    }

    function aplicarBusqueda() {
        setNombreAplicado(busqueda.trim());
        setPagina(1);
    }

    function cambiarLimite(nuevoLimite: number) {
        setLimite(nuevoLimite);
        setPagina(1);
    }

    function paginaAnterior() {
        setPagina((actual) => Math.max(1, actual - 1));
    }

    function paginaSiguiente() {
        setPagina((actual) => Math.min(totalPaginas, actual + 1))
    }

    const puedeRetroceder = !cargando && pagina > 1;
    const puedeAvanzar = !cargando && pagina < totalPaginas;

    const totalPaginasVisual = Math.max(1, totalPaginas);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Clientes</Text>

                <Pressable style={styles.newButton} onPress={() => router.push('/clientes/nuevo')}>
                    <Text style={styles.buttonText}>Nuevo cliente</Text>
                </Pressable>
            </View>

            <Pressable
                style={styles.debtButton}
                onPress={() => router.push('/clientes/con-deuda')}
            >
                <Text style={styles.debtButtonText}>
                    Consultar clientes con deuda
                </Text>
            </Pressable>

            <View style={styles.filters}>
                <Text style={styles.sectionLabel}>Estado del cliente</Text>

                <View style={styles.segmented}>
                    <Pressable
                        style={[
                            styles.segment,
                            activo && styles.segmentSelected
                        ]}
                        onPress={() => cambiarEstado(true)}
                    >
                        <Text
                            style={[
                                styles.segmentText,
                                activo && styles.segmentTextSelected
                            ]}
                        >
                            Activos
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.segment,
                            !activo && styles.segmentSelected
                        ]}
                        onPress={() => cambiarEstado(false)}
                    >
                        <Text
                            style={[
                                styles.segmentText,
                                !activo && styles.segmentTextSelected
                            ]}
                        >
                            Inactivos
                        </Text>
                    </Pressable>
                </View>

                <Text style={styles.sectionLabel}>
                    Buscar cliente
                </Text>

                <TextInput
                    style={styles.searchInput}
                    placeholder="Escribe un nombre..."
                    value={busqueda}
                    onChangeText={setBusqueda}
                    onSubmitEditing={aplicarBusqueda}
                    returnKeyType="search"
                    autoCorrect={false}
                />

                <View>
                    <Pressable
                        style={styles.searchButton}
                        onPress={aplicarBusqueda}
                    >
                        <Text style={styles.buttonText}>
                            Buscar
                        </Text>
                    </Pressable>
                </View>

                <Text style={styles.sectionLabel}>
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
            </View>

            {cargando ? (
                <View style={styles.center}>
                    <ActivityIndicator
                        size="large"
                        color="#2563EB"
                    />
                    <Text style={styles.subtitle}>
                        Consultando clientes...
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.error}>{error}</Text>

                    <Pressable
                        style={styles.searchButton}
                        onPress={() =>
                            setRecarga((actual) => actual + 1)
                        }
                    >
                        <Text style={styles.buttonText}>Reintentar</Text>
                    </Pressable>
                </View>
            ) : (
                <>

                    <View style={styles.resultsHeader}>
                        <Text style={styles.subtitle}>
                            {total} cliente(s) encontrados
                        </Text>

                        <Pressable
                            onPress={() =>
                                setRecarga((actual) => actual + 1)
                            }
                        >
                            <Text style={styles.refreshText}>
                                Actualizar
                            </Text>
                        </Pressable>
                    </View>

                    <FlatList
                        data={clientes}
                        keyExtractor={(item) => String(item.id)}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <Text style={styles.empty}>No se encontraron clientes con esa busqueda</Text>
                        }
                        renderItem={({ item }) => (
                            <Pressable style={styles.card}
                                onPress={() => {
                                    router.push({
                                        pathname: '/clientes/[id]',
                                        params: {
                                            id: String(item.id),
                                        },
                                    })
                                }}>
                                <Text style={styles.name}>{item.nombre}</Text>
                                <Text style={styles.detail}>{item.telefono || 'Sin teléfono'}</Text>
                                <Text style={item.activo ? styles.active : styles.inactive}>{item.activo ? 'Activo' : 'Inactivo'}</Text>
                                <Text style={styles.openDetail}>Ver detalles</Text>
                            </Pressable>
                        )}
                    />

                    <View style={styles.pagination}>
                        <Pressable
                            style={[
                                styles.pageButton,
                                !puedeRetroceder && styles.disabled,
                            ]}
                            onPress={paginaAnterior}
                            disabled={!puedeRetroceder}
                        >
                            <Text style={styles.pageButtonText}>
                                Anterior
                            </Text>
                        </Pressable>

                        <View style={styles.pageInfo}>
                            <Text style={styles.pageText}>
                                Página {pagina} de {totalPaginasVisual}
                            </Text>
                            <Text style={styles.pageSubtext}>
                                {clientes.length} de {total} registros
                            </Text>
                        </View>
                        <Pressable
                            style={[
                                styles.pageButton,
                                !puedeAvanzar && styles.disabled,
                            ]}
                            onPress={paginaSiguiente}
                            disabled={!puedeAvanzar}
                        >
                            <Text style={styles.pageButtonText}>
                                Siguiente
                            </Text>
                        </Pressable>
                    </View>
                </>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#162033',
    },
    newButton: {
        backgroundColor: '#16845D',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    filters: {
        paddingHorizontal: 16,
        gap: 10,
        paddingBottom: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    segmented: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
        padding: 4,
    },
    segment: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
    },
    segmentSelected: {
        backgroundColor: '#2563EB',
    },
    segmentText: {
        fontSize: 14,
        color: '#475569',
        fontWeight: '600',
    },
    segmentTextSelected: {
        color: '#FFFFFF',
    },
    searchInput: {
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        backgroundColor: '#FFFFFF',
        color: '#162033',
    },
    searchActions: {
        flexDirection: 'row',
        gap: 10,
    },
    searchButton: {
        backgroundColor: '#2563EB',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        paddingHorizontal: 22,
    },
    clearButton: {
        borderWidth: 1,
        borderColor: '#CBD5E1',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        paddingHorizontal: 22,
    },
    clearText: {
        color: '#334155',
        fontWeight: '600',
    },
    limitOptions: {
        flexDirection: 'row',
        gap: 10,
    },
    limitButton: {
        paddingVertical: 9,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
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
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    subtitle: {
        color: '#64748B',
        fontSize: 13,
    },
    refreshText: {
        color: '#2563EB',
        fontSize: 13,
        fontWeight: '600',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
        flexGrow: 1,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        gap: 6,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        color: '#162033',
    },
    detail: {
        fontSize: 14,
        color: '#64748B',
    },
    active: {
        fontSize: 13,
        color: '#16845D',
        fontWeight: '600',
    },
    inactive: {
        fontSize: 13,
        color: '#DC2626',
        fontWeight: '600',
    },
    openDetail: {
        textAlign: 'right',
        color: '#2563EB',
        fontSize: 13,
        marginTop: 6,
    },
    empty: {
        textAlign: 'center',
        color: '#64748B',
        paddingTop: 36,
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
    pagination: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        backgroundColor: '#FFFFFF',
        gap: 8,
    },
    pageButton: {
        backgroundColor: '#2563EB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    pageButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    pageInfo: {
        alignItems: 'center',
        gap: 3,
    },
    pageText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#162033',
    },
    pageSubtext: {
        fontSize: 11,
        color: '#64748B',
    },
    disabled: {
        opacity: 0.4,
    },

    debtButton: {
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: '#334155',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
    },

    debtButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});