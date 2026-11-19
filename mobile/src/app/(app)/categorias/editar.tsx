import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

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
import { ApiError } from '@/services/api';

import type { Categoria } from '@/types/categoria.types';

export default function EditarCategoriaScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [categoriaOriginal, setCategoriaOriginal] =
        useState<Categoria | null>(null);

    const [nombre, setNombre] = useState('');

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);

    useEffect(() => {
        let vigente = true;

        async function cargarCategoria() {
            const categoriaId = Number(id);

            setCargando(true);
            setError(null);
            setCategoriaOriginal(null);

            if (
                !Number.isSafeInteger(categoriaId) ||
                categoriaId <= 0
            ) {
                setError('Identificador de categoría inválido.');
                setCargando(false);
                return;
            }

            try {
                const resultado =
                    await categoriaService.obtenerPorId(
                        request,
                        categoriaId,
                    );

                if (!vigente) return;

                setCategoriaOriginal(resultado);
                setNombre(resultado.nombre);
            } catch (err) {
                if (!vigente) return;

                if (err instanceof ApiError) {
                    if (err.status === 401) return;

                    if (err.status === 404) {
                        setError('La categoría no existe.');
                    } else if (err.status === 403) {
                        setError(
                            'No tienes permiso para consultar esta categoría.',
                        );
                    } else {
                        setError(err.message);
                    }
                } else {
                    setError(
                        err instanceof Error
                            ? err.message
                            : 'No fue posible cargar la categoría.',
                    );
                }
            } finally {
                if (vigente) {
                    setCargando(false);
                }
            }
        }

        void cargarCategoria();

        return () => {
            vigente = false;
        };
    }, [id, request, recarga]);

    async function guardarCambios() {
        if (!categoriaOriginal || guardando) return;

        const nombreLimpio = nombre.trim();

        if (!nombreLimpio) {
            setError('El nombre de la categoría es obligatorio.');
            return;
        }

        if (nombreLimpio === categoriaOriginal.nombre) {
            router.back();
            return;
        }

        setGuardando(true);
        setError(null);

        try {
            await categoriaService.actualizar(
                request,
                categoriaOriginal.id,
                {
                    nombre: nombreLimpio,
                },
            );

            router.back();
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 401) return;

                if (err.status === 403) {
                    setError('No tienes permiso para editar categorías.');
                } else if (err.status === 404) {
                    setError('La categoría ya no existe.');
                } else if (err.status === 409) {
                    setError(
                        'El nombre ya existe o entra en conflicto con otra categoría.',
                    );
                } else {
                    setError(err.message);
                }
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'No fue posible actualizar la categoría.',
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

                <Text style={styles.title}>Editar categoría</Text>

                {cargando ? (
                    <View style={styles.center}>
                        <ActivityIndicator
                            size="large"
                            color="#2563EB"
                        />
                        <Text style={styles.subtitle}>
                            Cargando categoría...
                        </Text>
                    </View>
                ) : categoriaOriginal ? (
                    <View style={styles.form}>
                        <Text style={styles.subtitle}>
                            Categoría #{categoriaOriginal.id}
                        </Text>

                        <Text style={styles.label}>
                            Nombre de la categoría *
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={nombre}
                            onChangeText={setNombre}
                            placeholder="Nombre de categoría"
                            autoCapitalize="sentences"
                            autoCorrect={false}
                            editable={!guardando}
                        />

                        {error ? (
                            <Text style={styles.error}>
                                {error}
                            </Text>
                        ) : null}

                        <Pressable
                            style={[
                                styles.button,
                                guardando && styles.disabled,
                            ]}
                            disabled={guardando}
                            onPress={guardarCambios}
                        >
                            {guardando ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.buttonText}>
                                    Guardar cambios
                                </Text>
                            )}
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.center}>
                        <Text style={styles.error}>
                            {error ?? 'No se encontró la categoría.'}
                        </Text>

                        <Pressable
                            style={styles.button}
                            onPress={() =>
                                setRecarga((actual) => actual + 1)
                            }
                        >
                            <Text style={styles.buttonText}>
                                Reintentar
                            </Text>
                        </Pressable>
                    </View>
                )}
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
        gap: 18,
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
        color: '#64748B',
    },
    form: {
        marginTop: 12,
        gap: 14,
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
    button: {
        backgroundColor: '#2563EB',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    disabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    error: {
        color: '#DC2626',
        fontSize: 14,
    },
    center: {
        paddingVertical: 30,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
});
