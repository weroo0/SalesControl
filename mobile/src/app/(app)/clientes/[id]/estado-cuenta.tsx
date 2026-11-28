import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Button,
  Divider,
  Icon,
  List,
  ProgressBar,
  SegmentedButtons,
  Surface,
  Text,
} from 'react-native-paper';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { clienteService } from '@/services/cliente.service';
import { ApiError } from '@/services/api';

import type {
  EstadoCuentaResponse,
  MovimientoEstadoCuenta,
} from '@/types/estado-cuenta.types';

type FiltroMovimiento = 'TODOS' | 'VENTA' | 'PAGO';

const monedaMXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

function formatearDinero(valor: string | number): string {
  const numero = typeof valor === 'number' ? valor : Number(valor);

  if (!Number.isFinite(numero)) {
    return String(valor);
  }

  return monedaMXN.format(numero);
}

function formatearFecha(valor: string): string {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return fecha.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Mexico_City',
  });
}

function obtenerIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function MovimientoAccordion({
  movimiento,
  expandido,
  onToggle,
}: {
  movimiento: MovimientoEstadoCuenta;
  expandido: boolean;
  onToggle: () => void;
}) {
  const esVenta = movimiento.tipo === 'VENTA';
  const montoFormateado = esVenta
    ? formatearDinero(movimiento.monto)
    : `-${formatearDinero(movimiento.monto)}`;

  return (
    <Surface elevation={1} style={styles.accordionCard}>
      <List.Accordion
        expanded={expandido}
        onPress={onToggle}
        style={styles.accordionHeader}
        titleStyle={styles.movementTitle}
        descriptionStyle={styles.accordionDescription}
        title={`${esVenta ? 'Venta' : 'Pago'} #${movimiento.id}`}
        description={formatearFecha(movimiento.fecha)}
        left={(props) => (
          <View
            {...props}
            style={[
              styles.iconCircle,
              esVenta ? styles.ventaIconBg : styles.pagoIconBg,
            ]}
          >
            <Icon
              source={esVenta ? 'cart-outline' : 'cash'}
              size={20}
              color={esVenta ? '#1E293B' : '#16845D'}
            />
          </View>
        )}
        right={() => (
          <View style={styles.accordionRight}>
            <Text
              variant="titleSmall"
              style={[
                styles.movementAmount,
                !esVenta && styles.paymentText,
              ]}
            >
              {montoFormateado}
            </Text>
            <Icon
              source={expandido ? 'chevron-up' : 'chevron-down'}
              size={22}
              color="#64748B"
            />
          </View>
        )}
      >
        <View style={styles.expandedBody}>
          {movimiento.tipo === 'VENTA' ? (
            <View style={styles.expandedDetails}>
              {movimiento.detalle.map((detalle, indice) => (
                <Text
                  key={`${detalle.producto.id}-${indice}`}
                  variant="bodyMedium"
                  style={styles.detailText}
                >
                  {detalle.producto.nombre} ({detalle.cantidad} ×{' '}
                  {formatearDinero(detalle.precioUnitario)} • Subtotal:{' '}
                  {formatearDinero(detalle.subtotal)})
                </Text>
              ))}
            </View>
          ) : (
            <View style={styles.expandedDetails}>
              <Text variant="bodyMedium" style={styles.detailText}>
                Método: {movimiento.metodoPago}
              </Text>
              {movimiento.notas ? (
                <Text variant="bodyMedium" style={styles.detailText}>
                  Notas: {movimiento.notas}
                </Text>
              ) : null}
            </View>
          )}

          <Divider style={styles.expandedDivider} />

          <Text variant="bodySmall" style={styles.resultingBalance}>
            Saldo resultante:{' '}
            <Text style={styles.resultingBalanceBold}>
              {formatearDinero(movimiento.saldo)}
            </Text>
          </Text>
        </View>
      </List.Accordion>
    </Surface>
  );
}

export default function EstadoCuentaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const router = useRouter();
  const request = useAuthenticatedRequest();

  const [estadoCuenta, setEstadoCuenta] =
    useState<EstadoCuentaResponse | null>(null);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  const [filtro, setFiltro] = useState<FiltroMovimiento>('TODOS');
  const [expandidoKey, setExpandidoKey] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      async function cargarEstadoCuenta() {
        const clienteId = Number(id);

        setCargando(true);
        setError(null);
        setEstadoCuenta(null);

        if (!Number.isSafeInteger(clienteId) || clienteId <= 0) {
          setError('Identificador de cliente inválido.');
          setCargando(false);
          return;
        }

        try {
          const resultado = await clienteService.obtenerEstadoCuenta(
            request,
            clienteId
          );

          if (vigente) {
            setEstadoCuenta(resultado);
            if (resultado.movimientos.length > 0) {
              const primero = resultado.movimientos[0];
              setExpandidoKey(`${primero.tipo}-${primero.id}`);
            } else {
              setExpandidoKey(null);
            }
          }
        } catch (err) {
          if (!vigente) return;

          if (err instanceof ApiError) {
            if (err.status === 401) {
              return;
            }

            if (err.status === 403) {
              setError(
                'No tienes permiso para consultar este estado de cuenta.'
              );
            } else if (err.status === 404) {
              setError('El cliente no existe.');
            } else {
              setError(err.message);
            }
          } else {
            setError(
              err instanceof Error
                ? err.message
                : 'No fue posible consultar el estado de cuenta.'
            );
          }
        } finally {
          if (vigente) {
            setCargando(false);
          }
        }
      }

      void cargarEstadoCuenta();

      return () => {
        vigente = false;
      };
    }, [id, request, recarga])
  );

  const movimientosFiltrados = useMemo(() => {
    if (!estadoCuenta) return [];
    if (filtro === 'TODOS') return estadoCuenta.movimientos;
    return estadoCuenta.movimientos.filter((m) => m.tipo === filtro);
  }, [estadoCuenta, filtro]);

  const progresoPago = useMemo(() => {
    if (!estadoCuenta) return 0;
    const totalVentas = Number(estadoCuenta.totalVentas);
    const totalPagos = Number(estadoCuenta.totalPagos);

    if (!Number.isFinite(totalVentas) || totalVentas <= 0) return 1;
    if (!Number.isFinite(totalPagos) || totalPagos <= 0) return 0;

    return Math.min(1, Math.max(0, totalPagos / totalVentas));
  }, [estadoCuenta]);

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Estado de cuenta"
          titleStyle={styles.appbarTitle}
        />
        <Appbar.Action
          icon="refresh"
          accessibilityLabel="Actualizar estado de cuenta"
          disabled={cargando}
          onPress={() => setRecarga((actual) => actual + 1)}
        />
      </Appbar.Header>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.mutedText}>
            Consultando movimientos...
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
      ) : estadoCuenta ? (
        <FlatList
          data={movimientosFiltrados}
          keyExtractor={(item) => `${item.tipo}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              <Surface elevation={1} style={styles.summaryCard}>
                <View style={styles.clientRow}>
                  <Avatar.Text
                    size={50}
                    label={obtenerIniciales(estadoCuenta.cliente.nombre)}
                    style={[
                      styles.avatar,
                      !estadoCuenta.cliente.activo && styles.avatarInactivo,
                    ]}
                    labelStyle={styles.avatarLabel}
                  />

                  <View style={styles.clientMeta}>
                    <Text
                      variant="titleMedium"
                      numberOfLines={1}
                      style={styles.clientName}
                    >
                      {estadoCuenta.cliente.nombre}
                    </Text>
                    <Text variant="bodySmall" style={styles.mutedText}>
                      #{estadoCuenta.cliente.id} •{' '}
                      {estadoCuenta.cliente.telefono || 'Sin teléfono'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      estadoCuenta.cliente.activo
                        ? styles.badgeActivo
                        : styles.badgeInactivo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadge,
                        estadoCuenta.cliente.activo
                          ? styles.badgeActivoText
                          : styles.badgeInactivoText,
                      ]}
                    >
                      {estadoCuenta.cliente.activo ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>

                <Divider style={styles.cardDivider} />

                <View style={styles.progressSection}>
                  <Text variant="bodySmall" style={styles.progressSubtitle}>
                    Progreso de pago
                  </Text>

                  <Text variant="headlineSmall" style={styles.saldoHeadline}>
                    Saldo pendiente: {formatearDinero(estadoCuenta.saldo)}
                  </Text>

                  <ProgressBar
                    progress={progresoPago}
                    color="#16845D"
                    style={styles.progressBar}
                  />

                  <Text variant="bodySmall" style={styles.progressCaption}>
                    Pagado:{' '}
                    <Text style={styles.progressCaptionBold}>
                      {formatearDinero(estadoCuenta.totalPagos)}
                    </Text>{' '}
                    de{' '}
                    <Text style={styles.progressCaptionBold}>
                      {formatearDinero(estadoCuenta.totalVentas)}
                    </Text>
                  </Text>
                </View>
              </Surface>

              <SegmentedButtons
                value={filtro}
                onValueChange={(valor) => {
                  setFiltro(valor as FiltroMovimiento);
                  setExpandidoKey(null);
                }}
                buttons={[
                  {
                    value: 'TODOS',
                    label: 'Todos',
                    icon: filtro === 'TODOS' ? 'check' : undefined,
                  },
                  {
                    value: 'VENTA',
                    label: 'Ventas',
                    icon: 'cart-outline',
                  },
                  {
                    value: 'PAGO',
                    label: 'Pagos',
                    icon: 'cash',
                  },
                ]}
              />

              <Text variant="titleMedium" style={styles.sectionTitle}>
                Movimientos recientes ({movimientosFiltrados.length})
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon
                source="receipt-text-outline"
                size={40}
                color="#94A3B8"
              />
              <Text variant="bodyMedium" style={styles.mutedText}>
                {filtro === 'TODOS'
                  ? 'Este cliente todavía no tiene movimientos.'
                  : `No hay ${filtro === 'VENTA' ? 'ventas' : 'pagos'} registrados.`}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const key = `${item.tipo}-${item.id}`;
            return (
              <MovimientoAccordion
                movimiento={item}
                expandido={expandidoKey === key}
                onToggle={() =>
                  setExpandidoKey((actual) => (actual === key ? null : key))
                }
              />
            );
          }}
        />
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
    backgroundColor: '#F1F5F9',
  },
  appbar: {
    backgroundColor: '#FFFFFF',
  },
  appbarTitle: {
    fontWeight: '700',
    color: '#162033',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    flexGrow: 1,
  },
  headerBlock: {
    gap: 16,
    marginBottom: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    backgroundColor: '#CBD5E1',
  },
  avatarInactivo: {
    backgroundColor: '#E2E8F0',
  },
  avatarLabel: {
    color: '#1E293B',
    fontWeight: '700',
    fontSize: 18,
  },
  clientMeta: {
    flex: 1,
    gap: 2,
  },
  clientName: {
    fontWeight: '700',
    color: '#162033',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeActivo: {
    backgroundColor: '#DCFCE7',
  },
  badgeActivoText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeInactivo: {
    backgroundColor: '#FEE2E2',
  },
  badgeInactivoText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    backgroundColor: '#E2E8F0',
  },
  progressSection: {
    gap: 8,
  },
  progressSubtitle: {
    color: '#64748B',
  },
  saldoHeadline: {
    fontWeight: '800',
    color: '#162033',
    fontSize: 22,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  progressCaption: {
    color: '#475569',
  },
  progressCaptionBold: {
    fontWeight: '700',
    color: '#162033',
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#162033',
  },
  accordionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  accordionHeader: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
  },
  accordionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
  },
  movementTitle: {
    fontWeight: '700',
    color: '#162033',
  },
  movementAmount: {
    fontWeight: '700',
    color: '#162033',
  },
  paymentText: {
    color: '#16845D',
  },
  accordionDescription: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 8,
  },
  ventaIconBg: {
    backgroundColor: '#F1F5F9',
  },
  pagoIconBg: {
    backgroundColor: '#D1FAE5',
  },
  expandedBody: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  expandedDetails: {
    gap: 4,
  },
  detailText: {
    color: '#1E293B',
  },
  expandedDivider: {
    backgroundColor: '#CBD5E1',
  },
  resultingBalance: {
    color: '#334155',
  },
  resultingBalanceBold: {
    fontWeight: '700',
    color: '#162033',
  },
  mutedText: {
    color: '#64748B',
    textAlign: 'left',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
});