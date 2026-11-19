import { useCallback, useState } from 'react';

import {
    useFocusEffect,
    useRouter,
} from 'expo-router';

import {
    ActivityIndicator,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
    Alert
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { categoriaService } from '@/services/categoria.service';
import { ApiError } from '@/services/api';

import type { Categoria } from '@/types/categoria.types';

export default function CategoriasScreen() {
    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [categorias, setCategorias] = useState<Categoria[]>([]);

    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);

    const [activo, setActivo] = useState(true);

    const [cambiandoId, setCambiandoId] = useState<number | null>(null);
    const [errorAccion, setErrorAccion] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            async function cargarCategorias() {
                setCargando(true);
                setError(null);

                try {
                    const resultado =
                        await categoriaService.listar(request, activo);

                    if (vigente) {
                        setCategorias(resultado);
                    }
                } catch (err) {
                    if (!vigente) return;

                    if (err instanceof ApiError) {
                        if (err.status === 401) {
                            return;
                        }

                        if (err.status === 403) {
                            setError(
                                'No tienes permiso para consultar categorías.',
                            );
                        } else {
                            setError(err.message);
                        }
                    } else {
                        setError(
                            err instanceof Error
                                ? err.message
                                : 'No fue posible obtener las categorías.',
                        );
                    }
                } finally {
                    if (vigente) {
                        setCargando(false);
                    }
                }
            }

            void cargarCategorias();

            return () => {
                vigente = false;
            };
        }, [request, recarga, activo]),
    );


    async function cambiarEstadoCategoria(
        categoriaId: number,
        nuevoEstado: boolean,
    ) {
        if (cambiandoId !== null) return;

        setCambiandoId(categoriaId);
        setErrorAccion(null);

        try {
            if (nuevoEstado) {
                await categoriaService.activar(
                    request,
                    categoriaId,
                );
            } else {
                await categoriaService.desactivar(
                    request,
                    categoriaId,
                );
            }

            setRecarga((actual) => actual + 1);
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 401) return;

                if (err.status === 403) {
                    setErrorAccion(
                        'No tienes permiso para cambiar el estado.',
                    );
                } else if (err.status === 404) {
                    setErrorAccion('La categoría ya no existe.');
                } else {
                    setErrorAccion(err.message);
                }
            } else {
                setErrorAccion(
                    err instanceof Error
                        ? err.message
                        : 'No fue posible cambiar el estado.',
                );
            }
        } finally {
            setCambiandoId(null);
        }
    }

    function confirmarCambioEstado(categoria: Categoria) {
        if (cambiandoId !== null) return;

        const nuevoEstado = !categoria.activo;

        Alert.alert(
            nuevoEstado
                ? 'Activar categoría'
                : 'Desactivar categoría',
            nuevoEstado
                ? `¿Deseas activar "${categoria.nombre}"?`
                : `¿Deseas desactivar "${categoria.nombre}"? Los productos asociados no se eliminarán mediante esta operación.`,
            [
                {
                    text: 'Cancelar',
                    style: 'cancel',
                },
                {
                    text: 'Confirmar',
                    style: nuevoEstado ? 'default' : 'destructive',
                    onPress: () => {
                        void cambiarEstadoCategoria(
                            categoria.id,
                            nuevoEstado,
                        );
                    },
                },
            ],
        );
    }


    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.back}>← Volver</Text>
                </Pressable>

                <Text style={styles.title}>Categorías</Text>

                <Text style={styles.subtitle}>
                    Administra las categorías de tus productos.
                </Text>

                <Pressable
                    style={styles.newButton}
                    onPress={() => router.push('/categorias/nueva')}
                >
                    <Text style={styles.buttonText}>
                        + Nueva categoría
                    </Text>
                </Pressable>
            </View>

            <View style={styles.filters}>
                <Pressable
                    style={[
                        styles.filterButton,
                        activo && styles.filterSelected,
                    ]}
                    onPress={() => {
                        setActivo(true);
                        setErrorAccion(null);
                    }}
                >
                    <Text
                        style={[
                            styles.filterText,
                            activo && styles.filterTextSelected,
                        ]}
                    >
                        Activas
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.filterButton,
                        !activo && styles.filterSelected,
                    ]}
                    onPress={() => {
                        setActivo(false);
                        setErrorAccion(null);
                    }}
                >
                    <Text
                        style={[
                            styles.filterText,
                            !activo && styles.filterTextSelected,
                        ]}
                    >
                        Inactivas
                    </Text>
                </Pressable>
            </View>

            {errorAccion ? (
                <Text style={styles.errorAccion}>
                    {errorAccion}
                </Text>
            ) : null}

            {cargando ? (
                <View style={styles.center}>
                    <ActivityIndicator
                        size="large"
                        color="#2563EB"
                    />

                    <Text style={styles.subtitle}>
                        Consultando categorías...
                    </Text>
                </View>
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.error}>{error}</Text>

                    <Pressable
                        style={styles.reloadButton}
                        onPress={() =>
                            setRecarga((actual) => actual + 1)
                        }
                    >
                        <Text style={styles.buttonText}>
                            Reintentar
                        </Text>
                    </Pressable>
                </View>
            ) : (
                <FlatList
                    data={categorias}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        <View style={styles.listHeader}>
                            <Text style={styles.subtitle}>
                                {categorias.length} categoría(s){' '}
                                {activo ? 'activa(s)' : 'inactiva(s)'}
                            </Text>

                            <Pressable
                                onPress={() =>
                                    setRecarga((actual) => actual + 1)
                                }
                            >
                                <Text style={styles.refresh}>
                                    Actualizar
                                </Text>
                            </Pressable>
                        </View>
                    }
                    ListEmptyComponent={
                        <Text style={styles.empty}>
                            {activo
                                ? 'No hay categorías activas.'
                                : 'No hay categorías inactivas.'}
                        </Text>
                    }

                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <Pressable
                                style={styles.categoryInfo}
                                onPress={() =>
                                    router.push({
                                        pathname: '/categorias/editar',
                                        params: {
                                            id: String(item.id),
                                        },
                                    })
                                }
                            >
                                <Text style={styles.categoryName}>
                                    {item.nombre}
                                </Text>

                                <Text style={styles.categoryId}>
                                    Categoría #{item.id}
                                </Text>

                                <Text
                                    style={
                                        item.activo
                                            ? styles.active
                                            : styles.inactive
                                    }
                                >
                                    {item.activo ? 'Activa' : 'Inactiva'}
                                </Text>

                                <Text style={styles.editText}>
                                    Toca para editar →
                                </Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.statusButton,
                                    item.activo
                                        ? styles.deactivateButton
                                        : styles.activateButton,
                                    cambiandoId !== null && styles.disabled,
                                ]}
                                disabled={cambiandoId !== null}
                                onPress={() => confirmarCambioEstado(item)}
                            >
                                {cambiandoId === item.id ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFFFFF"
                                    />
                                ) : (
                                    <Text style={styles.statusButtonText}>
                                        {item.activo
                                            ? 'Desactivar'
                                            : 'Activar'}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    )}

                />
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
        padding: 20,
        gap: 12,
    },
    back: {
        color: '#2563EB',
        fontSize: 16,
        fontWeight: '600',
    },
    title: {
        fontSize: 27,
        fontWeight: '700',
        color: '#162033',
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
    },
    newButton: {
        backgroundColor: '#2563EB',
        padding: 15,
        alignItems: 'center',
        borderRadius: 10,
        marginTop: 8,
    },
    reloadButton: {
        backgroundColor: '#2563EB',
        padding: 14,
        borderRadius: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    list: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        gap: 12,
        flexGrow: 1,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    refresh: {
        color: '#2563EB',
        fontWeight: '600',
        fontSize: 14,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    categoryInfo: {
        flex: 1,
        gap: 5,
    },
    categoryName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#162033',
    },
    categoryId: {
        color: '#64748B',
        fontSize: 12,
    },
    active: {
        color: '#16845D',
        fontWeight: '600',
        fontSize: 13,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        padding: 24,
    },
    error: {
        color: '#DC2626',
        textAlign: 'center',
        fontSize: 14,
    },
    empty: {
        color: '#64748B',
        textAlign: 'center',
        marginTop: 30,
    },


    filters: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginBottom: 16,
        padding: 4,
        backgroundColor: '#E2E8F0',
        borderRadius: 10,
    },

    filterButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },

    filterSelected: {
        backgroundColor: '#2563EB',
    },

    filterText: {
        color: '#475569',
        fontWeight: '600',
    },

    filterTextSelected: {
        color: '#FFFFFF',
    },

    inactive: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '600',
    },

    editText: {
        color: '#2563EB',
        fontSize: 12,
        marginTop: 4,
    },

    statusButton: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },

    activateButton: {
        backgroundColor: '#16845D',
    },

    deactivateButton: {
        backgroundColor: '#DC2626',
    },

    statusButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },

    disabled: {
        opacity: 0.5,
    },

    errorAccion: {
        marginHorizontal: 20,
        marginBottom: 12,
        color: '#DC2626',
        fontSize: 14,
    },

});
