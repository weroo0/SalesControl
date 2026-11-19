export interface Categoria {
    id: number;
    nombre: string;
    activo: boolean;
    createdAt?: string;
}

export interface CrearCategoriaInput {
    nombre: string;
}

export interface ActualizarCategoriaInput {
    nombre?: string;
}