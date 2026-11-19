export interface Cliente {
    id: number;
    nombre: string;
    telefono?: string | null;
    activo: boolean;
    notas: string;
}

export interface CrearClienteInput {
    nombre: string;
    telefono?: string;
}

export interface ActualizarClienteInput {
    nombre?: string;
    telefono?: string | null;
}

export interface FiltrosClientes {
    activo: boolean;
    nombre?: string;
    page: number;
    limit: number;
}

export interface PaginaClientes {
    data: Cliente[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}