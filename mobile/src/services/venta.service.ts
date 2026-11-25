import type { AuthenticatedRequest } from './api';

import type {
    CrearVentaInput,
    VentaCreada,
    VentaDetalle,
    PaginaVentas,
    FiltrosVentas,
    VentaBase,
} from '@/types/venta.types';

export const ventaService = {
    async crear(
        request: AuthenticatedRequest,
        datos: CrearVentaInput,
    ): Promise<VentaCreada> {
        return request<VentaCreada>('/ventas', {
            method: 'POST',
            body: JSON.stringify(datos),
        });
    },

    async listar(
        request: AuthenticatedRequest,
        filtros: FiltrosVentas,
    ): Promise<PaginaVentas> {
        const params = new URLSearchParams();

        if (filtros.clienteId !== undefined) {
            params.append('clienteId', String(filtros.clienteId));
        }

        if (filtros.usuarioId !== undefined) {
            params.append('usuarioId', String(filtros.usuarioId));
        }

        if (filtros.tipoVenta) {
            params.append('tipoVenta', filtros.tipoVenta);
        }

        if (filtros.estado) {
            params.append('estado', filtros.estado);
        }

        if (filtros.fechaDesde) {
            params.append('fechaDesde', filtros.fechaDesde);
        }

        if (filtros.fechaHasta) {
            params.append('fechaHasta', filtros.fechaHasta);
        }

        params.append('page', String(filtros.page));
        params.append('limit', String(filtros.limit));

        return request<PaginaVentas>(
            `/ventas?${params.toString()}`,
        );
    },

    async obtenerPorId(
        request: AuthenticatedRequest,
        id: number,
    ): Promise<VentaDetalle> {
        return request<VentaDetalle>(`/ventas/${id}`);
    },

    async cancelar(
        request: AuthenticatedRequest,
        id: number,
    ): Promise<VentaBase> {
        return request<VentaBase>(`/ventas/${id}/cancelar`, {
            method: 'PATCH',
        });
    },
};