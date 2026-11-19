import type { AuthenticatedRequest } from "./api";

import type { Categoria, CrearCategoriaInput, ActualizarCategoriaInput } from "@/types/categoria.types";

export const categoriaService = {
    async listar(request: AuthenticatedRequest, activo: boolean = true): Promise<Categoria[]> {
        return request<Categoria[]>(`/categorias?activo=${activo}`);
    },

    async crear(request: AuthenticatedRequest, datos: CrearCategoriaInput): Promise<Categoria> {
        return request<Categoria>('/categorias', {
            method: 'POST',
            body: JSON.stringify(datos),
        });
    },

    async obtenerPorId(request: AuthenticatedRequest, id: number): Promise<Categoria> {
        return request<Categoria>(`/categorias/${id}`);
    },    

    async actualizar(request: AuthenticatedRequest, id: number, datos: ActualizarCategoriaInput): Promise<void> {
        await request<void>(`/categorias/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(datos),
        });
    },    

    async activar(request: AuthenticatedRequest, id: number): Promise<void> {
        await request<void>(`/categorias/${id}/activar`, {
            method: 'PATCH',
        });
    },    
    
    async desactivar(request: AuthenticatedRequest, id: number): Promise<void> {
        await request<void>(`/categorias/${id}/desactivar`, {
            method: 'PATCH',
        });
    },    
};