import { useCallback, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Chip,
  Divider,
  FAB,
  Icon,
  Menu,
  Searchbar,
  Surface,
  Text,
  TouchableRipple,
} from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { productoService } from '@/services/producto.service';
import { categoriaService } from '@/services/categoria.service';
import { ApiError } from '@/services/api';

import type { Producto } from '@/types/producto.types';
import type { Categoria } from '@/types/categoria.types';

const LIMITES = [10, 20, 50] as const;

const PALETA_CATEGORIAS = [
  { bg: '#DBEAFE', icon: '#2563EB' },
  { bg: '#FEF3C7', icon: '#D97706' },
  { bg: '#EDE9FE', icon: '#7C3AED' },
  { bg: '#FCE7F3', icon: '#DB2777' },
  { bg: '#D1FAE5', icon: '#059669' },
] as const;

const monedaMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

function formatearPrecio(precio: string): string {
  const numero = Number(precio);

  return Number.isFinite(numero) ? monedaMXN.format(numero) : precio;
}

function obtenerColorCategoria(categoriaId: number) {
  const indice = Math.abs(categoriaId) % PALETA_CATEGORIAS.length;
  return PALETA_CATEGORIAS[indice];
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

  const [categoriaId, setCategoriaId] = useState<number | null>(null);

  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState<number>(20);
  const [menuLimiteVisible, setMenuLimiteVisible] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  const [cargandoCategorias, setCargandoCategorias] = useState(true);
  const [errorCategorias, setErrorCategorias] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      async function cargarCategorias() {
        setCargandoCategorias(true);
        setErrorCategorias(null);

        try {
          const resultado = await categoriaService.listar(request, true);

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
              'No tienes permiso para consultar categorías.'
            );
          } else {
            setErrorCategorias(
              err instanceof Error
                ? err.message
                : 'No se pudieron cargar las categorías.'
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
    }, [request])
  );

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      async function cargarProductos() {
        setCargando(true);
        setError(null);

        try {
          const resultado = await productoService.listarPaginado(request, {
            activo,
            nombre: nombreAplicado,
            categoriaId: categoriaId ?? undefined,
            page: pagina,
            limit: limite,
          });

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
              setError('No tienes permiso para consultar productos.');
            } else {
              setError(err.message);
            }
          } else {
            setError(
              err instanceof Error
                ? err.message
                : 'No fue posible cargar los productos.'
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
    ])
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

  function cambiarCategoria(nuevoId: number | null) {
    setCategoriaId(nuevoId);
    setPagina(1);
  }

  function cambiarLimite(nuevoLimite: number) {
    setLimite(nuevoLimite);
    setPagina(1);
    setMenuLimiteVisible(false);
  }

  const puedeRetroceder = !cargando && pagina > 1;
  const puedeAvanzar = !cargando && pagina < totalPaginas;
  const totalPaginasVisual = Math.max(1, totalPaginas);

  return (
    <View style={styles.container}>
      <Appbar.Header style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.navigate('/')} />
        <Appbar.Content title="Productos" titleStyle={styles.appbarTitle} />
        <Appbar.Action
          icon="refresh"
          accessibilityLabel="Actualizar productos"
          disabled={cargando}
          onPress={() => setRecarga((actual) => actual + 1)}
        />
      </Appbar.Header>

      <View style={styles.topPanel}>
        <Searchbar
          placeholder="Buscar por nombre..."
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
          keyboardShouldPersistTaps="handled"
        >
          <Chip
            selected={activo}
            showSelectedCheck={false}
            icon={activo ? 'check' : undefined}
            onPress={() => cambiarEstado(true)}
            style={[styles.chip, activo && styles.chipEstadoSelected]}
            textStyle={activo ? styles.chipSelectedText : styles.chipText}
          >
            Activos
          </Chip>

          <Chip
            selected={!activo}
            showSelectedCheck={false}
            icon={!activo ? 'check' : undefined}
            onPress={() => cambiarEstado(false)}
            style={[styles.chip, !activo && styles.chipInactivoSelected]}
            textStyle={!activo ? styles.chipInactivoText : styles.chipText}
          >
            Inactivos
          </Chip>

          <View style={styles.chipSeparator} />

          <Chip
            selected={categoriaId === null}
            showSelectedCheck={false}
            onPress={() => cambiarCategoria(null)}
            style={[
              styles.chip,
              categoriaId === null && styles.chipCategorySelected,
            ]}
            textStyle={
              categoriaId === null ? styles.chipSelectedText : styles.chipText
            }
          >
            Todas
          </Chip>

          {cargandoCategorias ? (
            <ActivityIndicator size="small" style={styles.categoryLoader} />
          ) : (
            categorias.map((categoria) => {
              const seleccionada = categoriaId === categoria.id;
              return (
                <Chip
                  key={categoria.id}
                  selected={seleccionada}
                  showSelectedCheck={false}
                  onPress={() => cambiarCategoria(categoria.id)}
                  style={[
                    styles.chip,
                    seleccionada && styles.chipCategorySelected,
                  ]}
                  textStyle={
                    seleccionada ? styles.chipSelectedText : styles.chipText
                  }
                >
                  {categoria.nombre}
                </Chip>
              );
            })
          )}
        </ScrollView>

        {errorCategorias ? (
          <Text variant="bodySmall" style={styles.warningText}>
            {errorCategorias}
          </Text>
        ) : null}

        <View style={styles.resultsBar}>
          <Text variant="bodySmall" style={styles.resultsText}>
            {cargando
              ? 'Consultando productos...'
              : `${total} producto(s)`}
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
              Cargando catálogo...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Icon source="alert-circle-outline" size={42} color="#DC2626" />
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
            data={productos}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.flatListContent}
            ItemSeparatorComponent={() => <Divider style={styles.rowDivider} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon
                  source="package-variant-closed"
                  size={44}
                  color="#94A3B8"
                />
                <Text variant="bodyMedium" style={styles.mutedText}>
                  No se encontraron productos con esos filtros.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const paleta = obtenerColorCategoria(item.categoriaId);
              const nombreCategoria =
                item.categoria?.nombre ?? `#${item.categoriaId}`;

              return (
                <TouchableRipple
                  onPress={() =>
                    router.push({
                      pathname: '/productos/[id]',
                      params: { id: String(item.id) },
                    })
                  }
                  style={styles.productRow}
                >
                  <View style={styles.rowInner}>
                    <View
                      style={[
                        styles.tagCircle,
                        {
                          backgroundColor: item.activo
                            ? paleta.bg
                            : '#E2E8F0',
                        },
                      ]}
                    >
                      <Icon
                        source="tag-outline"
                        size={20}
                        color={item.activo ? paleta.icon : '#64748B'}
                      />
                    </View>

                    <View style={styles.rowInfo}>
                      <Text
                        variant="titleMedium"
                        numberOfLines={1}
                        style={styles.productTitle}
                      >
                        {item.nombre}
                      </Text>

                      <Text variant="bodySmall" style={styles.productSubtitle}>
                        {nombreCategoria} •{' '}
                        <Text
                          style={
                            item.activo
                              ? styles.activeLabel
                              : styles.inactiveLabel
                          }
                        >
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </Text>
                      </Text>
                    </View>

                    <View style={styles.rowRight}>
                      <Text variant="titleMedium" style={styles.priceText}>
                        {formatearPrecio(item.precio)}
                      </Text>
                      <Icon
                        source="chevron-right"
                        size={20}
                        color="#94A3B8"
                      />
                    </View>
                  </View>
                </TouchableRipple>
              );
            }}
          />
        )}

        <FAB
          icon="plus"
          label="Nuevo"
          style={styles.fab}
          color="#FFFFFF"
          onPress={() => router.push('/productos/nuevo')}
        />
      </View>

      {!cargando && !error && (
        <Surface elevation={2} style={styles.paginationBar}>
          <Button
            mode="outlined"
            compact
            icon="chevron-left"
            disabled={!puedeRetroceder}
            onPress={() => setPagina((actual) => Math.max(1, actual - 1))}
          >
            Anterior
          </Button>

          <View style={styles.pageInfo}>
            <Text variant="labelMedium" style={styles.pageText}>
              Página {pagina} de {totalPaginasVisual}
            </Text>
            <Text variant="bodySmall" style={styles.pageSubtext}>
              {productos.length} de {total} registros
            </Text>
          </View>

          <Button
            mode="outlined"
            compact
            icon="chevron-right"
            contentStyle={styles.nextButtonContent}
            disabled={!puedeAvanzar}
            onPress={() =>
              setPagina((actual) => Math.min(totalPaginas, actual + 1))
            }
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
    backgroundColor: '#FFFFFF',
  },
  appbar: {
    backgroundColor: '#FFFFFF',
  },
  appbarTitle: {
    fontWeight: '700',
    color: '#162033',
  },
  topPanel: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  searchbar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipText: {
    color: '#334155',
    fontSize: 13,
  },
  chipEstadoSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  chipInactivoSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  chipInactivoText: {
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 13,
  },
  chipCategorySelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  chipSelectedText: {
    color: '#1D4ED8',
    fontWeight: '600',
    fontSize: 13,
  },
  chipSeparator: {
    width: 1,
    height: 22,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 2,
  },
  categoryLoader: {
    marginHorizontal: 8,
  },
  warningText: {
    color: '#D97706',
  },
  resultsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsText: {
    color: '#64748B',
    fontWeight: '500',
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
    backgroundColor: '#FFFFFF',
  },
  flatListContent: {
    paddingBottom: 88,
    flexGrow: 1,
  },
  productRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
    gap: 3,
  },
  productTitle: {
    fontWeight: '600',
    color: '#162033',
  },
  productSubtitle: {
    color: '#64748B',
  },
  activeLabel: {
    color: '#16845D',
    fontWeight: '600',
  },
  inactiveLabel: {
    color: '#DC2626',
    fontWeight: '600',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontWeight: '700',
    color: '#162033',
  },
  rowDivider: {
    marginLeft: 70,
    backgroundColor: '#E2E8F0',
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
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