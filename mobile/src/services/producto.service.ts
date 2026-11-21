import type { AuthenticatedRequest } from './api';

import type {
    FiltrosProductos,
    PaginaProductos,
    Producto,
    CrearProductoInput,
    ActualizarProductoInput
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

    async actualizar(request: AuthenticatedRequest, id: number, datos: ActualizarProductoInput): Promise<Producto> {
        return request<Producto>(`/productos/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(datos),
        });
    },

    async desactivar(request: AuthenticatedRequest, id: number): Promise<Producto> {
        return request<Producto>(`/productos/${id}/desactivar`, {
            method: 'PATCH'
        });
    },    

    async activar(request: AuthenticatedRequest, id: number): Promise<Producto> {
        return request<Producto>(`/productos/${id}/activar`, {
            method: 'PATCH'
        });
    },       

};
