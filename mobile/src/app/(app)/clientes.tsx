import { useCallback, useState, useMemo } from "react";

import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, TextInput } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { clienteService } from "@/services/cliente.service";
import { ApiError } from "@/services/api";

import type { Cliente } from "@/types/cliente.types";
import { useAuthenticatedRequest } from "@/hooks/useAuthenticatedRequest";

import { useRouter, useFocusEffect } from "expo-router";

export default function ClientesScreen() {
    const request = useAuthenticatedRequest();
    const router = useRouter();

    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    const [busqueda, setBusqueda] = useState('');

    const clientesFiltrados = useMemo(() => {
        const termino = busqueda.trim().toLowerCase();

        if (!termino) {
            return clientes;
        }

        return clientes.filter((cliente) => {
            const nombre = cliente.nombre.toLowerCase();
            const telefono = cliente.telefono ?? '';

            return (nombre.includes(termino) || telefono.includes(termino));
        });
    }, [clientes, busqueda]);

    useFocusEffect(
        useCallback(() => {
            let vigente = true;

            async function cargarClientes() {
                setCargando(true);
                setError(null);

                try{
                    const resultado = await clienteService.listar(request);

                    if (vigente) {
                        setClientes(resultado);
                    }
                } catch (err) {
                    if(!vigente) return;

                    if(err instanceof ApiError && err.status === 401) {
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
    }, [request, recarga])
);



    return (
        <SafeAreaView style= {styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Clientes</Text>

                <Pressable style={styles.button} onPress={() => setRecarga((actual) => actual + 1)} disabled={cargando}>
                    <Text style={styles.buttonText}>Actualizar</Text>
                </Pressable>
            </View>

            <Pressable style={styles.newButton} onPress={() => router.push('/clientes/nuevo')}>
                <Text style={styles.buttonText}>Nuevo cliente</Text>
            </Pressable>

            <TextInput style={styles.search} placeholder="Buscar por nombre o teléfono" value={busqueda} onChangeText={setBusqueda} autoCorrect={false}/>

            {cargando ? (
                <ActivityIndicator size='large' color='#2563EB' style={styles.center} />
            ) : error ? (
                <View style={styles.center}>
                    <Text style={styles.error}>{error}</Text>
                </View>
            ) : (
                <FlatList
                    data={clientesFiltrados}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>{clientes.length === 0 ? 'Todavia no hay clientes registrados' : 'No se encontraron clientes con esa busqueda'}</Text>
                    }
                    renderItem={({item}) => (
                        <Pressable style={styles.card} 
                                   onPress={() => {router.push({
                                        pathname: '/clientes/[id]',
                                        params: {
                                            id: String(item.id),
                                        },
                        })}}>
                            <Text style={styles.name}>{item.nombre}</Text>
                            <Text style={styles.detail}>{item.telefono || 'Sin teléfono'}</Text>
                            <Text style={item.activo ? styles.active : styles.inactive}>{item.activo ? 'Activo' : 'Inactivo'}</Text>
                            <Text style={styles.detail}>Toca para ver detalles</Text>
                        </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#162033',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexGrow: 1,
  },
  card: {
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#162033',
  },
  detail: {
    fontSize: 14,
    color: '#64748B',
  },
  active: {
    color: '#16845D',
    fontWeight: '600',
  },
  inactive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  error: {
    color: '#DC2626',
    textAlign: 'center',
  },
  empty: {
    color: '#64748B',
    textAlign: 'center',
    paddingTop: 32,
  },
  search: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 10,
    fontSize: 16,
    color: '#162033',
  },  
  newButton: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#16845D',
    alignItems: 'center',
  },  
});