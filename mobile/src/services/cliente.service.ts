import type { AuthenticatedRequest } from "./api";
import type { Cliente, CrearClienteInput, ActualizarClienteInput } from "@/types/cliente.types";

export const clienteService = {
    async listar(request: AuthenticatedRequest): Promise<Cliente[]> {
        const respuesta = await request<unknown>('/clientes',);

        if (Array.isArray(respuesta)) {
            return respuesta as Cliente[];
        }

        if (
            typeof respuesta === 'object' &&
            respuesta !== null &&
            'data' in respuesta &&
            Array.isArray(respuesta.data)
        ) {
            return respuesta.data as Cliente[]
        }

        throw new Error('Formato de respuesta inesperado en GET /clientes');
    },

    async obtenerPorId(request: AuthenticatedRequest, id: number) : Promise<Cliente> {
        return request<Cliente>(`/clientes/${id}`);
    },

    async crear(request: AuthenticatedRequest, datos: CrearClienteInput) : Promise<Cliente> {
        return request<Cliente>('/clientes', {
            method: 'POST',
            body: JSON.stringify(datos),
        });
    },

    async actualizar(request: AuthenticatedRequest, id: number, datos: ActualizarClienteInput): Promise<Cliente> {
        return request<Cliente>(`/clientes/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(datos),
        });
    },

    async activar(request: AuthenticatedRequest, id: number): Promise<void> {
        await request<void>(`/clientes/${id}/activar`, {
            method: 'PATCH',
        });
    },

    async desactivar(request: AuthenticatedRequest, id: number): Promise<void> {
        await request<void>(`/clientes/${id}/desactivar`, {
            method: 'PATCH',
        });
    },    
};