import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Button,
  Chip,
  FAB,
  Icon,
  Menu,
  Searchbar,
  Surface,
  Text,
  TouchableRipple,
} from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';

import { clienteService } from '@/services/cliente.service';
import { ApiError } from '@/services/api';
import type { Cliente } from '@/types/cliente.types';
import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';

const LIMITES = [10, 20, 50] as const;

function obtenerIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

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
  const [limite, setLimite] = useState<number>(20);
  const [menuLimiteVisible, setMenuLimiteVisible] = useState(false);

  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      async function cargarClientes() {
        setCargando(true);
        setError(null);

        try {
          const resultado = await clienteService.listarPaginado(request, {
            activo,
            nombre: nombreAplicado,
            page: pagina,
            limit: limite,
          });

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
                : 'No fue posible obtener los clientes'
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
    if (activo === nuevoEstado) return;
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

  function cambiarLimite(nuevoLimite: number) {
    setLimite(nuevoLimite);
    setPagina(1);
    setMenuLimiteVisible(false);
  }

  function paginaAnterior() {
    setPagina((actual) => Math.max(1, actual - 1));
  }

  function paginaSiguiente() {
    setPagina((actual) => Math.min(totalPaginas, actual + 1));
  }

  const puedeRetroceder = !cargando && pagina > 1;
  const puedeAvanzar = !cargando && pagina < totalPaginas;
  const totalPaginasVisual = Math.max(1, totalPaginas);

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={styles.appbar}>
        <Appbar.Content title="Clientes" titleStyle={styles.appbarTitle} />
        <Appbar.Action
          icon="refresh"
          accessibilityLabel="Actualizar lista"
          disabled={cargando}
          onPress={() => setRecarga((actual) => actual + 1)}
        />
      </Appbar.Header>
      <View style={styles.topControls}>
        <Searchbar
          placeholder="Buscar cliente por nombre..."
          value={busqueda}
          onChangeText={(texto) => {
            setBusqueda(texto);
            if (texto === '' && nombreAplicado !== '') {
              setNombreAplicado('');
              setPagina(1);
            }
          }}
          onSubmitEditing={aplicarBusqueda}
          onIconPress={aplicarBusqueda}
          onClearIconPress={limpiarBusqueda}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <Chip
            selected={activo}
            showSelectedCheck={false}
            icon={activo ? 'check-circle' : 'circle-outline'}
            onPress={() => cambiarEstado(true)}
            style={[styles.chip, activo && styles.chipActivoSelected]}
            textStyle={activo ? styles.chipActivoText : undefined}
          >
            Activos
          </Chip>

          <Chip
            selected={!activo}
            showSelectedCheck={false}
            icon={!activo ? 'check-circle' : 'circle-outline'}
            onPress={() => cambiarEstado(false)}
            style={[styles.chip, !activo && styles.chipInactivoSelected]}
            textStyle={!activo ? styles.chipInactivoText : undefined}
          >
            Inactivos
          </Chip>

          <Chip
            icon="alert-circle-outline"
            onPress={() => router.push('/clientes/con-deuda')}
            style={styles.debtChip}
            textStyle={styles.debtChipText}
          >
            Con deuda
          </Chip>
        </ScrollView>

        <View style={styles.resultsBar}>
          <Text variant="bodySmall" style={styles.resultsText}>
            {total} cliente(s) encontrado(s)
          </Text>

          <Menu
            visible={menuLimiteVisible}
            onDismiss={() => setMenuLimiteVisible(false)}
            anchor={
              <Button
                mode="text"
                compact
                icon="chevron-down"
                contentStyle={styles.limitAnchorContent}
                labelStyle={styles.limitAnchorLabel}
                onPress={() => setMenuLimiteVisible(true)}
              >
                Mostrar: {limite}
              </Button>
            }
          >
            {LIMITES.map((cantidad) => (
              <Menu.Item
                key={cantidad}
                title={`${cantidad} por página`}
                leadingIcon={limite === cantidad ? 'check' : undefined}
                onPress={() => cambiarLimite(cantidad)}
              />
            ))}
          </Menu>
        </View>
      </View>

      <View style={styles.listWrapper}>
        {cargando ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text variant="bodyMedium" style={styles.mutedText}>
              Consultando clientes...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Icon source="alert-circle-outline" size={40} color="#DC2626" />
            <Text variant="bodyMedium" style={styles.errorText}>
              {error}
            </Text>
            <Button
              mode="contained"
              icon="refresh"
              onPress={() => setRecarga((actual) => actual + 1)}
            >
              Reintentar
            </Button>
          </View>
        ) : (
          <FlatList
            data={clientes}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon source="account-search-outline" size={44} color="#94A3B8" />
                <Text variant="bodyMedium" style={styles.mutedText}>
                  No se encontraron clientes con esa búsqueda
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Surface elevation={1} style={styles.card}>
                <TouchableRipple
                  borderless
                  style={styles.cardTouchable}
                  onPress={() =>
                    router.push({
                      pathname: '/clientes/[id]',
                      params: { id: String(item.id) },
                    })
                  }
                >
                  <View style={styles.cardRow}>
                    <Avatar.Text
                      size={44}
                      label={obtenerIniciales(item.nombre)}
                      style={[
                        styles.avatar,
                        !item.activo && styles.avatarInactivo,
                      ]}
                      labelStyle={styles.avatarLabel}
                    />

                    <View style={styles.cardInfo}>
                      <Text
                        variant="titleMedium"
                        numberOfLines={1}
                        style={styles.clientName}
                      >
                        {item.nombre}
                      </Text>

                      <View style={styles.metaRow}>
                        <Icon
                          source={item.telefono ? 'phone-outline' : 'phone-off-outline'}
                          size={14}
                          color="#64748B"
                        />
                        <Text variant="bodySmall" style={styles.phoneText}>
                          {item.telefono || 'Sin teléfono'}
                        </Text>
                      </View>

                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            item.activo
                              ? styles.badgeActivo
                              : styles.badgeInactivo,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadge,
                              item.activo
                                ? styles.badgeActivoText
                                : styles.badgeInactivoText,
                            ]}
                          >
                            {item.activo ? 'Activo' : 'Inactivo'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Icon source="chevron-right" size={22} color="#94A3B8" />
                  </View>
                </TouchableRipple>
              </Surface>
            )}
          />
        )}

        <FAB
          icon="plus"
          label="Nuevo"
          style={styles.fab}
          color="#FFFFFF"
          onPress={() => router.push('/clientes/nuevo')}
        />
      </View>

      {!cargando && !error && (
        <Surface elevation={2} style={styles.paginationBar}>
          <Button
            mode="outlined"
            compact
            icon="chevron-left"
            disabled={!puedeRetroceder}
            onPress={paginaAnterior}
          >
            Anterior
          </Button>

          <View style={styles.pageInfo}>
            <Text variant="labelMedium" style={styles.pageText}>
              Página {pagina} de {totalPaginasVisual}
            </Text>
            <Text variant="bodySmall" style={styles.pageSubtext}>
              {clientes.length} de {total} registros
            </Text>
          </View>

          <Button
            mode="outlined"
            compact
            icon="chevron-right"
            contentStyle={styles.nextButtonContent}
            disabled={!puedeAvanzar}
            onPress={paginaSiguiente}
          >
            Siguiente
          </Button>
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  appbar: {
    backgroundColor: '#FFFFFF',
  },
  appbarTitle: {
    fontWeight: '700',
    color: '#162033',
  },
  topControls: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  searchbar: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    height: 46,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 15,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    backgroundColor: '#F1F5F9',
  },
  chipActivoSelected: {
    backgroundColor: '#DCFCE7',
  },
  chipActivoText: {
    color: '#15803D',
    fontWeight: '600',
  },
  chipInactivoSelected: {
    backgroundColor: '#E2E8F0',
  },
  chipInactivoText: {
    color: '#334155',
    fontWeight: '600',
  },
  debtChip: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  debtChipText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsText: {
    color: '#64748B',
  },
  limitAnchorContent: {
    flexDirection: 'row-reverse',
  },
  limitAnchorLabel: {
    fontSize: 12,
    color: '#2563EB',
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 88, // Espacio extra para que el FAB no tape la última tarjeta
    gap: 10,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardTouchable: {
    padding: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    backgroundColor: '#DBEAFE',
  },
  avatarInactivo: {
    backgroundColor: '#E2E8F0',
  },
  avatarLabel: {
    color: '#1E40AF',
    fontWeight: '700',
    fontSize: 15,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  clientName: {
    fontWeight: '700',
    color: '#162033',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  phoneText: {
    color: '#64748B',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeActivo: {
    backgroundColor: '#DCFCE7',
  },
  badgeActivoText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '600',
  },
  badgeInactivo: {
    backgroundColor: '#FEE2E2',
  },
  badgeInactivoText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#16845D',
    borderRadius: 16,
  },
  paginationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  nextButtonContent: {
    flexDirection: 'row-reverse',
  },
  pageInfo: {
    alignItems: 'center',
  },
  pageText: {
    color: '#162033',
    fontWeight: '600',
  },
  pageSubtext: {
    color: '#64748B',
    fontSize: 11,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 48,
    gap: 10,
  },
  mutedText: {
    color: '#64748B',
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
});