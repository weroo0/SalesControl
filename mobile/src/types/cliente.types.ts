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