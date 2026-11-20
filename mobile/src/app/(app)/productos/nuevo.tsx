import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

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
import { categoriaService } from '@/services/categoria.service';
import { productoService } from '@/services/producto.service';
import { ApiError } from '@/services/api';

import type { Categoria } from '@/types/categoria.types';
import type { CrearProductoInput } from '@/types/producto.types';

export default function NuevoProductoScreen() {
    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [categoriaId, setCategoriaId] =
        useState<number | null>(null);

    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [cargandoCategorias, setCargandoCategorias] =
        useState(true);
    const [errorCategorias, setErrorCategorias] =
        useState<string | null>(null);
    const [recargaCategorias, setRecargaCategorias] = useState(0);

    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

                    setErrorCategorias(
                        err instanceof Error
                            ? err.message
                            : 'No fue posible cargar las categorías.',
                    );
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
        }, [request, recargaCategorias]),
    );

    async function guardarProducto() {
        if (guardando) return;

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
                (categoria) =>
                    categoria.id === categoriaId && categoria.activo,
            )
        ) {
            setError('Selecciona una categoría activa.');
            return;
        }

        const datos: CrearProductoInput = {
            nombre: nombreLimpio,
            precio: precioNumerico,
            categoriaId,
        };

        setGuardando(true);
        setError(null);

        try {
            await productoService.crear(request, datos);

            router.back();
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 401) {

                    return;
                }

                if (err.status === 403) {
                    setError(
                        'No tienes permiso para registrar productos.',
                    );
                } else if (err.status === 409) {
                    setError(
                        'Existe un conflicto con los datos del producto.',
                    );
                } else {
                    setError(err.message);
                }
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'No fue posible registrar el producto.',
                );
            }
        } finally {
            setGuardando(false);
        }
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

                <Text style={styles.title}>Nuevo producto</Text>

                <Text style={styles.subtitle}>
                    Ingresa la información del producto y selecciona
                    una categoría.
                </Text>

                <View style={styles.form}>
                    <Text style={styles.label}>
                        Nombre del producto *
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Perfume Floral"
                        value={nombre}
                        onChangeText={setNombre}
                        autoCapitalize="sentences"
                        autoCorrect={false}
                        editable={!guardando}
                    />

                    <Text style={styles.label}>
                        Precio de venta *
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Ej. 350.00"
                        value={precio}
                        onChangeText={setPrecio}
                        keyboardType="decimal-pad"
                        editable={!guardando}
                    />

                    <Text style={styles.helper}>
                        Utiliza un precio positivo con máximo dos
                        decimales, sin separadores de miles.
                    </Text>

                    <View style={styles.categoryHeader}>
                        <Text style={styles.label}>
                            Categoría *
                        </Text>

                        <Pressable
                            onPress={() =>
                                setRecargaCategorias((actual) => actual + 1)
                            }
                            disabled={cargandoCategorias || guardando}
                        >
                            <Text style={styles.reloadText}>
                                Actualizar
                            </Text>
                        </Pressable>
                    </View>

                    {cargandoCategorias ? (
                        <View style={styles.loadingCategories}>
                            <ActivityIndicator
                                size="small"
                                color="#2563EB"
                            />
                            <Text style={styles.helper}>
                                Cargando categorías...
                            </Text>
                        </View>
                    ) : errorCategorias ? (
                        <Text style={styles.error}>
                            {errorCategorias}
                        </Text>
                    ) : categorias.length === 0 ? (
                        <View style={styles.emptyCategories}>
                            <Text style={styles.subtitle}>
                                No hay categorías activas disponibles.
                            </Text>

                            <Pressable
                                onPress={() =>
                                    router.push('/categorias/nueva')
                                }
                            >
                                <Text style={styles.reloadText}>
                                    Crear una categoría
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.categoryList}>
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
                                                seleccionada &&
                                                styles.radioSelected,
                                            ]}
                                        />

                                        <Text
                                            style={[
                                                styles.categoryText,
                                                seleccionada &&
                                                styles.categoryTextSelected,
                                            ]}
                                        >
                                            {categoria.nombre}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}

                    {error ? (
                        <Text style={styles.error}>
                            {error}
                        </Text>
                    ) : null}

                    <Pressable
                        style={[
                            styles.saveButton,
                            guardando && styles.disabled,
                        ]}
                        onPress={guardarProducto}
                        disabled={guardando || cargandoCategorias}
                    >
                        {guardando ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.saveText}>
                                Guardar producto
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
        flexGrow: 1,
        padding: 24,
        gap: 16,
        paddingBottom: 40,
    },
    back: {
        color: '#2563EB',
        fontSize: 16,
        fontWeight: '600',
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
    form: {
        marginTop: 12,
        gap: 12,
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
        color: '#162033',
        fontSize: 16,
    },
    helper: {
        fontSize: 12,
        lineHeight: 18,
        color: '#64748B',
    },
    categoryHeader: {
        marginTop: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reloadText: {
        color: '#2563EB',
        fontWeight: '600',
        fontSize: 14,
    },
    loadingCategories: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 16,
    },
    emptyCategories: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 10,
        gap: 12,
    },
    categoryList: {
        gap: 8,
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
    categoryText: {
        fontSize: 15,
        color: '#334155',
    },
    categoryTextSelected: {
        color: '#1D4ED8',
        fontWeight: '600',
    },
    saveButton: {
        marginTop: 16,
        padding: 16,
        borderRadius: 10,
        backgroundColor: '#16845D',
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
    },
});
