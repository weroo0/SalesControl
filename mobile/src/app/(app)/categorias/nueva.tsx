import { useState } from "react";
import { useRouter } from "expo-router";

import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthenticatedRequest } from "@/hooks/useAuthenticatedRequest";
import { categoriaService } from "@/services/categoria.service";
import { ApiError } from "@/services/api";

export default function NuevaCategoriaScreen() {
    const router = useRouter();
    const request = useAuthenticatedRequest();

    const [nombre, setNombre] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function guardarCategoria() {
        if (guardando) return;

        const nombreLimpio = nombre.trim();

        if (!nombreLimpio) {
            setError("El nombre de la categoría es obligatorio.");
            return;
        }

        setGuardando(true);
        setError(null);

        try {
            await categoriaService.crear(request, {
                nombre: nombreLimpio,
            });

            router.back();
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 401) {
                    return;
                }

                if (err.status === 403) {
                    setError("No tienes permiso para registrar categorías.");
                } else if (err.status === 409) {
                    setError(
                        "Ya existe una categoría con ese nombre o hay un conflicto con el registro.",
                    );
                } else {
                    setError(err.message);
                }
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : "No fue posible registrar la categoría.",
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
                <Pressable onPress={() => router.back()} disabled={guardando}>
                    <Text style={styles.back}>← Volver</Text>
                </Pressable>

                <Text style={styles.title}>Nueva categoría</Text>

                <Text style={styles.subtitle}>
                    Registra una categoría para organizar los productos de SalesControl.
                </Text>

                <View style={styles.form}>
                    <Text style={styles.label}>Nombre de la categoría *</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Ej. Perfumes"
                        value={nombre}
                        onChangeText={setNombre}
                        autoCapitalize="sentences"
                        autoCorrect={false}
                        editable={!guardando}
                    />

                    {error ? <Text style={styles.error}>{error}</Text> : null}

                    <Pressable
                        style={[styles.button, guardando && styles.disabled]}
                        disabled={guardando}
                        onPress={guardarCategoria}
                    >
                        {guardando ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>Guardar categoría</Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F7FA",
    },
    content: {
        flexGrow: 1,
        padding: 24,
        gap: 18,
    },
    back: {
        color: "#2563EB",
        fontSize: 16,
        fontWeight: "600",
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#162033",
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: "#64748B",
    },
    form: {
        gap: 14,
        marginTop: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#334155",
    },
    input: {
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 10,
        backgroundColor: "#FFFFFF",
        padding: 14,
        fontSize: 16,
        color: "#162033",
    },
    button: {
        backgroundColor: "#2563EB",
        padding: 16,
        borderRadius: 10,
        alignItems: "center",
        marginTop: 8,
    },
    disabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    error: {
        color: "#DC2626",
        fontSize: 14,
    },
});
