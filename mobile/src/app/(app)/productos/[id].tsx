import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Button,
  Divider,
  Icon,
  Surface,
  Text,
} from 'react-native-paper';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { productoService } from '@/services/producto.service';
import { ApiError } from '@/services/api';

import type { Producto } from '@/types/producto.types';

const monedaMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

function formatearPrecio(valor: string): string {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return valor;
  }

  return monedaMXN.format(numero);
}

export default function ProductoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const router = useRouter();
  const request = useAuthenticatedRequest();

  const [producto, setProducto] = useState<Producto | null>(null);

  const [cargando, setCargando] = useState(true);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  const cambiarEstado = () => {
    if (!producto || cargando || cambiandoEstado) return;

    const accion = producto.activo ? 'desactivar' : 'activar';

    Alert.alert(
      `${accion === 'desactivar' ? 'Desactivar' : 'Activar'} producto`,
      `¿Estás seguro de que deseas ${accion} este producto?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          style: accion === 'desactivar' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setCambiandoEstado(true);

              const productoActualizado =
                accion === 'desactivar'
                  ? await productoService.desactivar(request, producto.id)
                  : await productoService.activar(request, producto.id);

              setProducto(productoActualizado);
            } catch (err) {
              if (err instanceof ApiError) {
                if (err.status === 401) return;

                Alert.alert(
                  'Error',
                  err.status === 403
                    ? 'No tienes permisos para realizar esta acción.'
                    : err.message
                );
              } else {
                Alert.alert(
                  'Error',
                  'No se pudo actualizar el estado del producto.'
                );
              }
            } finally {
              setCambiandoEstado(false);
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      async function cargarProducto() {
        const productoId = Number(id);

        setCargando(true);
        setError(null);
        setProducto(null);

        if (!Number.isSafeInteger(productoId) || productoId <= 0) {
          setError('Identificador de producto inválido.');
          setCargando(false);
          return;
        }

        try {
          const resultado = await productoService.obtenerPorId(
            request,
            productoId
          );

          if (vigente) {
            setProducto(resultado);
          }
        } catch (err) {
          if (!vigente) return;

          if (err instanceof ApiError) {
            if (err.status === 401) {
              return;
            }

            if (err.status === 403) {
              setError('No tienes permiso para consultar este producto.');
            } else if (err.status === 404) {
              setError('El producto solicitado no existe.');
            } else {
              setError(err.message);
            }
          } else {
            setError(
              err instanceof Error
                ? err.message
                : 'No fue posible consultar el producto.'
            );
          }
        } finally {
          if (vigente) {
            setCargando(false);
          }
        }
      }

      void cargarProducto();

      return () => {
        vigente = false;
      };
    }, [id, request, recarga])
  );

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Detalle del producto"
          titleStyle={styles.appbarTitle}
        />
        <Appbar.Action
          icon="refresh"
          accessibilityLabel="Actualizar información"
          disabled={cargando || cambiandoEstado}
          onPress={() => setRecarga((actual) => actual + 1)}
        />
      </Appbar.Header>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.mutedText}>
            Consultando producto...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon source="alert-circle-outline" size={44} color="#DC2626" />
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
      ) : producto ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroHeader}>
            <View
              style={[
                styles.heroIconCircle,
                !producto.activo && styles.heroIconCircleInactive,
              ]}
            >
              <Icon
                source="tag-outline"
                size={36}
                color={producto.activo ? '#7C3AED' : '#64748B'}
              />
            </View>

            <View style={styles.idPill}>
              <Text style={styles.idPillText}>#{producto.id}</Text>
            </View>

            <Text variant="headlineSmall" style={styles.productName}>
              {producto.nombre}
            </Text>

            <View
              style={[
                styles.statusBadge,
                producto.activo ? styles.badgeActivo : styles.badgeInactivo,
              ]}
            >
              <Text
                style={[
                  styles.statusBadge,
                  producto.activo
                    ? styles.badgeActivoText
                    : styles.badgeInactivoText,
                ]}
              >
                {producto.activo ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>

          <Surface elevation={1} style={styles.infoCard}>
            <View style={styles.priceBanner}>
              <Text variant="titleMedium" style={styles.priceBannerLabel}>
                Precio de venta:{' '}
                <Text style={styles.priceBannerValue}>
                  {formatearPrecio(producto.precio)}
                </Text>
              </Text>
            </View>

            <View style={styles.categoryRow}>
              <View style={styles.categoryIconBox}>
                <Icon
                  source="shape-outline"
                  size={20}
                  color="#475569"
                />
              </View>

              <View style={styles.categoryTextWrapper}>
                <Text variant="bodyLarge" style={styles.categoryText}>
                  Categoría:{' '}
                  <Text style={styles.categoryBold}>
                    {producto.categoria?.nombre ?? 'Sin nombre disponible'}
                  </Text>{' '}
                  <Text style={styles.categoryIdText}>
                    (ID: {producto.categoriaId})
                  </Text>
                </Text>
                <Divider style={styles.categoryUnderline} />
              </View>
            </View>
          </Surface>

          <View style={styles.actionsStack}>
            <Button
              mode="contained"
              icon="pencil-outline"
              disabled={cambiandoEstado}
              contentStyle={styles.actionButtonContent}
              style={styles.editButton}
              labelStyle={styles.editButtonLabel}
              onPress={() =>
                router.push({
                  pathname: '/productos/[id]/editar',
                  params: {
                    id: String(producto.id),
                  },
                })
              }
            >
              Editar producto
            </Button>

            <Button
              mode="outlined"
              icon={
                producto.activo
                  ? 'cancel'
                  : 'check-circle-outline'
              }
              loading={cambiandoEstado}
              disabled={cambiandoEstado}
              textColor={producto.activo ? '#DC2626' : '#16845D'}
              contentStyle={styles.actionButtonContent}
              style={[
                styles.statusButton,
                producto.activo
                  ? styles.desactivarOutline
                  : styles.activarOutline,
              ]}
              labelStyle={styles.statusButtonLabel}
              onPress={cambiarEstado}
            >
              {producto.activo
                ? 'Desactivar producto'
                : 'Activar producto'}
            </Button>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text variant="bodyMedium" style={styles.mutedText}>
            No hay información disponible.
          </Text>
        </View>
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
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 20,
  },
  heroHeader: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 10,
  },
  heroIconCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconCircleInactive: {
    backgroundColor: '#E2E8F0',
  },
  idPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  idPillText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  productName: {
    fontWeight: '700',
    color: '#162033',
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 14,
  },
  badgeActivo: {
    backgroundColor: '#DCFCE7',
  },
  badgeActivoText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '600',
  },
  badgeInactivo: {
    backgroundColor: '#FEE2E2',
  },
  badgeInactivoText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 16,
  },
  priceBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  priceBannerLabel: {
    color: '#162033',
    fontWeight: '600',
  },
  priceBannerValue: {
    fontWeight: '800',
    fontSize: 20,
    color: '#162033',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  categoryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTextWrapper: {
    flex: 1,
    gap: 8,
  },
  categoryText: {
    color: '#1E293B',
  },
  categoryBold: {
    fontWeight: '700',
    color: '#162033',
  },
  categoryIdText: {
    color: '#64748B',
    fontSize: 14,
  },
  categoryUnderline: {
    backgroundColor: '#E2E8F0',
  },
  actionsStack: {
    gap: 12,
    marginTop: 4,
  },
  actionButtonContent: {
    paddingVertical: 6,
  },
  editButton: {
    borderRadius: 24,
    backgroundColor: '#1E3A8A',
  },
  editButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusButton: {
    borderRadius: 24,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  statusButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  desactivarOutline: {
    borderColor: '#DC2626',
  },
  activarOutline: {
    borderColor: '#16845D',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
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