import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Appbar,
  Avatar,
  Button,
  Divider,
  Icon,
  Surface,
  Text,
} from 'react-native-paper';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useAuthenticatedRequest } from '@/hooks/useAuthenticatedRequest';
import { clienteService } from '@/services/cliente.service';
import { ApiError } from '@/services/api';
import type { Cliente } from '@/types/cliente.types';

function obtenerIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

export default function ClienteDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const router = useRouter();
  const request = useAuthenticatedRequest();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      async function cargarCliente() {
        const clienteId = Number(id);

        if (!Number.isSafeInteger(clienteId) || clienteId <= 0) {
          setError('Identificador de cliente inválido.');
          setCargando(false);
          return;
        }

        setCargando(true);
        setError(null);
        setCliente(null);

        try {
          const resultado = await clienteService.obtenerPorId(
            request,
            clienteId
          );

          if (vigente) {
            setCliente(resultado);
          }
        } catch (err) {
          if (!vigente) return;

          if (err instanceof ApiError && err.status === 401) {
            return;
          }

          if (err instanceof ApiError && err.status === 404) {
            setError('El cliente no existe.');
          } else {
            setError(
              err instanceof Error
                ? err.message
                : 'No fue posible cargar el cliente.'
            );
          }
        } finally {
          if (vigente) {
            setCargando(false);
          }
        }
      }

      void cargarCliente();

      return () => {
        vigente = false;
      };
    }, [id, request, recarga])
  );

  async function actualizarEstado(clienteId: number, nuevoEstado: boolean) {
    if (cambiandoEstado) return;

    setCambiandoEstado(true);
    setErrorEstado(null);

    try {
      if (nuevoEstado) {
        await clienteService.activar(request, clienteId);
      } else {
        await clienteService.desactivar(request, clienteId);
      }

      setRecarga((actual) => actual + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          return;
        }

        if (err.status === 403) {
          setError('No tienes permiso para cambiar el estado del cliente');
        } else if (err.status === 404) {
          setErrorEstado('El cliente no existe');
        } else if (err.status === 409) {
          setErrorEstado(err.message);
        } else {
          setErrorEstado(err.message);
        }
      } else {
        setErrorEstado(
          err instanceof Error
            ? err.message
            : 'No fue posible actualizar el estado'
        );
      }
    } finally {
      setCambiandoEstado(false);
    }
  }

  function confirmarCambioEstado() {
    if (!cliente || cambiandoEstado) return;

    const nuevoEstado = !cliente.activo;

    const titulo = nuevoEstado ? 'Activar cliente' : 'Desactivar cliente';

    const mensaje = nuevoEstado
      ? `¿Deseas activar nuevamente a ${cliente.nombre}?`
      : `¿Deseas desactivar a ${cliente.nombre}? Sus ventas, pagos y adeudos existentes se conservarán.`;

    const clienteId = cliente.id;

    Alert.alert(
      titulo,
      mensaje,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          style: nuevoEstado ? 'default' : 'destructive',
          onPress: () => {
            void actualizarEstado(clienteId, nuevoEstado);
          },
        },
      ],
      {
        cancelable: true,
      }
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header elevated style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content
          title="Detalle del cliente"
          titleStyle={styles.appbarTitle}
        />
        <Appbar.Action
          icon="refresh"
          accessibilityLabel="Actualizar información"
          disabled={cargando}
          onPress={() => setRecarga((valor) => valor + 1)}
        />
      </Appbar.Header>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text variant="bodyMedium" style={styles.mutedText}>
            Cargando información...
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
            onPress={() => setRecarga((valor) => valor + 1)}
          >
            Reintentar
          </Button>
        </View>
      ) : cliente ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <Avatar.Text
                size={76}
                label={obtenerIniciales(cliente.nombre)}
                style={[
                  styles.avatar,
                  !cliente.activo && styles.avatarInactivo,
                ]}
                labelStyle={styles.avatarLabel}
              />
              <View style={styles.idPill}>
                <Text style={styles.idPillText}>#{cliente.id}</Text>
              </View>
            </View>

            <Text variant="headlineSmall" style={styles.clientName}>
              {cliente.nombre}
            </Text>

            <View
              style={[
                styles.statusBadge,
                cliente.activo ? styles.badgeActivo : styles.badgeInactivo,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: cliente.activo ? '#16845D' : '#DC2626',
                  },
                ]}
              />
              <Text
                style={[
                  styles.statusBadge,
                  cliente.activo
                    ? styles.badgeActivoText
                    : styles.badgeInactivoText,
                ]}
              >
                {cliente.activo ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>

          <Surface elevation={1} style={styles.infoCard}>
            <Text variant="titleSmall" style={styles.sectionHeading}>
              Información del cliente
            </Text>

            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Icon
                  source={
                    cliente.telefono ? 'phone-outline' : 'phone-off-outline'
                  }
                  size={20}
                  color="#2563EB"
                />
              </View>
              <View style={styles.infoTextContainer}>
                <Text variant="labelMedium" style={styles.fieldLabel}>
                  Teléfono
                </Text>
                <Text
                  variant="bodyLarge"
                  style={
                    cliente.telefono ? styles.fieldValue : styles.emptyValue
                  }
                >
                  {cliente.telefono || 'Sin teléfono registrado'}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Icon
                  source="notebook-outline"
                  size={20}
                  color="#2563EB"
                />
              </View>
              <View style={styles.infoTextContainer}>
                <Text variant="labelMedium" style={styles.fieldLabel}>
                  Notas
                </Text>
                <Text
                  variant="bodyMedium"
                  style={cliente.notas ? styles.fieldValue : styles.emptyValue}
                >
                  {cliente.notas || 'No hay notas registradas'}
                </Text>
              </View>
            </View>
          </Surface>

          <Button
            mode="contained"
            icon="file-document-outline"
            contentStyle={styles.primaryButtonContent}
            style={styles.primaryButton}
            labelStyle={styles.primaryButtonLabel}
            onPress={() =>
              router.push({
                pathname: '/clientes/[id]/estado-cuenta',
                params: {
                  id: String(cliente.id),
                },
              })
            }
          >
            Ver estado de cuenta
          </Button>

          <View style={styles.secondaryActionsRow}>
            <Button
              mode="outlined"
              icon="pencil-outline"
              style={styles.secondaryButton}
              contentStyle={styles.secondaryButtonContent}
              onPress={() =>
                router.push({
                  pathname: '/clientes/[id]/editar',
                  params: {
                    id: String(cliente.id),
                  },
                })
              }
            >
              Editar
            </Button>

            <Button
              mode="outlined"
              icon={
                cliente.activo
                  ? 'account-off-outline'
                  : 'account-check-outline'
              }
              loading={cambiandoEstado}
              disabled={cambiandoEstado}
              textColor={cliente.activo ? '#DC2626' : '#16845D'}
              style={[
                styles.secondaryButton,
                cliente.activo
                  ? styles.desactivarOutline
                  : styles.activarOutline,
              ]}
              contentStyle={styles.secondaryButtonContent}
              onPress={confirmarCambioEstado}
            >
              {cliente.activo ? 'Desactivar' : 'Activar'}
            </Button>
          </View>

          {errorEstado ? (
            <Surface elevation={0} style={styles.errorBanner}>
              <Icon source="alert-circle-outline" size={18} color="#DC2626" />
              <Text variant="bodySmall" style={styles.errorBannerText}>
                {errorEstado}
              </Text>
            </Surface>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <Text variant="bodyMedium" style={styles.mutedText}>
            No se encontró información del cliente
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
    gap: 18,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 4,
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
    fontSize: 28,
  },
  idPill: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F5F7FA',
  },
  idPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  clientName: {
    fontWeight: '700',
    color: '#162033',
    textAlign: 'center',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
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
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  sectionHeading: {
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    color: '#64748B',
  },
  fieldValue: {
    color: '#162033',
    fontWeight: '500',
  },
  emptyValue: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  divider: {
    backgroundColor: '#E2E8F0',
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  primaryButtonContent: {
    paddingVertical: 6,
  },
  primaryButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonContent: {
    paddingVertical: 4,
  },
  desactivarOutline: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  activarOutline: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    flex: 1,
    color: '#DC2626',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
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