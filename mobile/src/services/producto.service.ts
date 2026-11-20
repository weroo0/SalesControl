import type { AuthenticatedRequest } from './api';

import type {
    FiltrosProductos,
    PaginaProductos,
    Producto,
    CrearProductoInput
} from '@/types/producto.types';

export const productoService = {
    async listarPaginado(request: AuthenticatedRequest, filtros: FiltrosProductos,): Promise<PaginaProductos> {
        const parametros = [
            `activo=${filtros.activo}`,
            `page=${filtros.page}`,
            `limit=${filtros.limit}`,
        ];

        if (filtros.nombre?.trim()) {
            parametros.push(
                `nombre=${encodeURIComponent(
                    filtros.nombre.trim(),
                )}`,
            );
        }

        if (filtros.categoriaId !== undefined) {
            parametros.push(
                `categoriaId=${filtros.categoriaId}`,
            );
        }

        const query = parametros.join('&');

        return request<PaginaProductos>(
            `/productos?${query}`,
        );
    },

    async obtenerPorId(request: AuthenticatedRequest, id: number): Promise<Producto> {
        return request<Producto>(`/productos/${id}`)
    },

    async crear(request: AuthenticatedRequest, datos: CrearProductoInput): Promise<Producto> {
        return request<Producto>('/productos', {
            method: 'POST',
            body: JSON.stringify(datos),
        });
    },
    
};
