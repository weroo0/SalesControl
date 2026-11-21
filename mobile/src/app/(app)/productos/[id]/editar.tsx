import { useCallback, useState } from 'react';

import {
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from 'expo-router';

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

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';

import { productoService } from '@/services/producto.service';
import { categoriaService } from '@/services/categoria.service';
import { ApiError } from '@/services/api';

import type { Producto } from '@/types/producto.types';
import type { Categoria } from '@/types/categoria.types';
import type { ActualizarProductoInput } from '@/types/producto.types';

const monedaMXN = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
});

export default function EditarProductoScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [productoOriginal, setProductoOriginal] =
        useState<Producto | null>(null);

    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [categoriaId, setCategoriaId] =
        useState<number | null>(null);

    const [categorias, setCategorias] = useState<Categoria[]>([]);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            async function cargarDatos() {
                setCargando(true);
                setError(null);

                const productoId = Number(id);

                if (
                    !Number.isSafeInteger(productoId) ||
                    productoId <= 0
                ) {
                    setError('Identificador de producto inválido.');
                    setCargando(false);
                    return;
                }

                try {
                    const [producto, categoriasResultado] =
                        await Promise.all([
                            productoService.obtenerPorId(
                                request,
                                productoId,
                            ),
                            categoriaService.listar(request, true),
                        ]);

                    if (!vigente) return;

                    setProductoOriginal(producto);

                    setNombre(producto.nombre);
                    setPrecio(String(producto.precio));
                    setCategoriaId(producto.categoriaId);

                    const categoriasDisponibles = [
                        ...categoriasResultado,
                    ];

                    if (
                        producto.categoria &&
                        !categoriasDisponibles.some(
                            (categoria) =>
                                categoria.id === producto.categoriaId,
                        )
                    ) {
                        categoriasDisponibles.push(
                            producto.categoria as Categoria,
                        );
                    }

                    setCategorias(categoriasDisponibles);
                } catch (err) {
                    if (!vigente) return;

                    if (err instanceof ApiError) {
                        if (err.status === 401) return;

                        if (err.status === 403) {
                            setError(
                                'No tienes permiso para consultar este producto.',
                            );
                        } else if (err.status === 404) {
                            setError('El producto no existe.');
                        } else {
                            setError(err.message);
                        }
                    } else {
                        setError(
                            err instanceof Error
                                ? err.message
                                : 'No fue posible cargar los datos.',
                        );
                    }
                } finally {
                    if (vigente) {
                        setCargando(false);
                    }
                }
            }

            void cargarDatos();

            return () => {
                vigente = false;
            };
        }, [id, request, recarga]),
    );

    async function guardarCambios() {
        if (guardando || !productoOriginal) return;

        const nombreLimpio = nombre.trim();
        const precioNormalizado = precio.trim().replace(',', '.');

        if (!nombreLimpio) {
            setError('El nombre del producto es obligatorio.');
            return;
        }

        const formatoPrecio = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

        if (!formatoPrecio.test(precioNormalizado)) {
            setError(
                'Ingresa un precio válido con máximo dos decimales.',
            );
            return;
        }

        const precioNumerico = Number(precioNormalizado);

        if (
            !Number.isFinite(precioNumerico) ||
            precioNumerico <= 0
        ) {
            setError('El precio debe ser mayor que cero.');
            return;
        }

        if (
            categoriaId === null ||
            !categorias.some(
                (categoria) => categoria.id === categoriaId,
            )
        ) {
            setError('Selecciona una categoría válida.');
            return;
        }

        const datos: ActualizarProductoInput = {
            nombre: nombreLimpio,
            precio: precioNumerico,
            categoriaId,
        };

        setGuardando(true);
        setError(null);

        try {
            await productoService.actualizar(
                request,
                productoOriginal.id,
                datos,
            );

            router.back();
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 401) return;

                if (err.status === 403) {
                    setError(
                        'No tienes permiso para modificar productos.',
                    );
                } else if (err.status === 404) {
                    setError(
                        'El producto ya no existe.',
                    );
                } else {
                    setError(err.message);
                }
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'No fue posible actualizar el producto.',
                );
            }
        } finally {
            setGuardando(false);
        }
    }

    if (cargando) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.helper}>
                        Cargando información del producto...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error && !productoOriginal) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={styles.error}>{error}</Text>

                    <Pressable
                        style={styles.saveButton}
                        onPress={() => setRecarga((actual) => actual + 1)}
                    >
                        <Text style={styles.saveText}>
                            Reintentar
                        </Text>
                    </Pressable>

                    <Pressable onPress={() => router.back()}>
                        <Text style={styles.back}>Volver</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <Pressable
                    onPress={() => router.back()}
                    disabled={guardando}
                >
                    <Text style={styles.back}>← Volver</Text>
                </Pressable>

                <Text style={styles.title}>
                    Editar producto
                </Text>

                <Text style={styles.subtitle}>
                    Modifica la información del producto #{productoOriginal?.id}.
                </Text>

                <View style={styles.form}>
                    <Text style={styles.label}>
                        Nombre del producto *
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={nombre}
                        onChangeText={setNombre}
                        placeholder="Nombre del producto"
                        autoCapitalize="sentences"
                        editable={!guardando}
                    />

                    <Text style={styles.label}>
                        Precio de venta *
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={precio}
                        onChangeText={setPrecio}
                        placeholder="Ej. 250.50"
                        keyboardType="decimal-pad"
                        editable={!guardando}
                    />

                    <Text style={styles.helper}>
                        Precio actual:{' '}
                        {monedaMXN.format(
                            Number(productoOriginal?.precio ?? 0),
                        )}
                    </Text>

                    <Text style={styles.label}>
                        Categoría *
                    </Text>

                    {categorias.map((categoria) => {
                        const seleccionada =
                            categoriaId === categoria.id;

                        return (
                            <Pressable
                                key={categoria.id}
                                style={[
                                    styles.categoryOption,
                                    seleccionada &&
                                    styles.categorySelected,
                                ]}
                                disabled={guardando}
                                onPress={() =>
                                    setCategoriaId(categoria.id)
                                }
                                accessibilityRole="radio"
                                accessibilityState={{
                                    selected: seleccionada,
                                    disabled: guardando,
                                }}
                            >
                                <View
                                    style={[
                                        styles.radio,
                                        seleccionada && styles.radioSelected,
                                    ]}
                                />

                                <View style={styles.categoryInfo}>
                                    <Text
                                        style={[
                                            styles.categoryText,
                                            seleccionada &&
                                            styles.categoryTextSelected,
                                        ]}
                                    >
                                        {categoria.nombre}
                                    </Text>

                                    {!categoria.activo && (
                                        <Text style={styles.inactive}>
                                            Categoría inactiva
                                        </Text>
                                    )}
                                </View>
                            </Pressable>
                        );
                    })}

                    {error ? (
                        <Text style={styles.error}>{error}</Text>
                    ) : null}

                    <Pressable
                        style={[
                            styles.saveButton,
                            guardando && styles.disabled,
                        ]}
                        onPress={guardarCambios}
                        disabled={guardando}
                    >
                        {guardando ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveText}>
                                Guardar cambios
                            </Text>
                        )}
                    </Pressable>

                    <Text style={styles.helper}>
                        * Campos obligatorios
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    content: {
        padding: 24,
        gap: 16,
        paddingBottom: 40,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#162033',
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: '#64748B',
    },
    back: {
        color: '#2563EB',
        fontSize: 16,
        fontWeight: '600',
    },
    form: {
        gap: 12,
        marginTop: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        color: '#162033',
    },
    helper: {
        color: '#64748B',
        fontSize: 12,
        lineHeight: 18,
    },
    categoryOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 10,
        padding: 14,
    },
    categorySelected: {
        borderColor: '#2563EB',
        backgroundColor: '#EFF6FF',
    },
    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#94A3B8',
    },
    radioSelected: {
        borderColor: '#2563EB',
        backgroundColor: '#2563EB',
    },
    categoryInfo: {
        flex: 1,
        gap: 3,
    },
    categoryText: {
        fontSize: 15,
        color: '#334155',
    },
    categoryTextSelected: {
        color: '#1D4ED8',
        fontWeight: '600',
    },
    inactive: {
        color: '#DC2626',
        fontSize: 12,
    },
    saveButton: {
        marginTop: 16,
        backgroundColor: '#16845D',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
    },
    saveText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    disabled: {
        opacity: 0.5,
    },
    error: {
        color: '#DC2626',
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
});
