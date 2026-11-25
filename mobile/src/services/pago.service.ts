import type { AuthenticatedRequest } from './api';

import type {
    CrearPagoInput,
    PagoCreado,
    PagoDetalle,
    PagoBase,
    FiltrosPagos,
    PaginaPagos,
} from '@/types/pago.types';

export const pagoService = {

    async crear(
        request: AuthenticatedRequest,
        datos: CrearPagoInput,
    ): Promise<PagoCreado> {
        return request<PagoCreado>('/pagos', {
            method: 'POST',
            body: JSON.stringify(datos),
        });
    },

    async listar(
        request: AuthenticatedRequest,
        filtros: FiltrosPagos,
    ): Promise<PaginaPagos> {
        const params = new URLSearchParams();

        if (filtros.clienteId !== undefined) {
            params.append('clienteId', String(filtros.clienteId));
        }

        if (filtros.usuarioId !== undefined) {
            params.append('usuarioId', String(filtros.usuarioId));
        }

        if (filtros.metodoPago) {
            params.append('metodoPago', filtros.metodoPago);
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

        return request<PaginaPagos>(
            `/pagos?${params.toString()}`,
        );
    },

    async obtenerPorId(
        request: AuthenticatedRequest,
        id: number,
    ): Promise<PagoDetalle> {
        return request<PagoDetalle>(`/pagos/${id}`);
    },

    async cancelar(
        request: AuthenticatedRequest,
        id: number,
    ): Promise<PagoBase> {
        return request<PagoBase>(`/pagos/${id}/cancelar`, {
            method: 'PATCH',
        });
    },
};
