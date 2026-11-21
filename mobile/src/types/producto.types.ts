export interface CategoriaProducto {
    id: number;
    nombre: string;
    activo: boolean;
}

export interface Producto {
    id: number;
    nombre: string;
    precio: string;
    categoriaId: number;
    activo: boolean;
    createdAt: string;

    categoria: CategoriaProducto;
}

export interface FiltrosProductos {
    nombre?: string;
    categoriaId?: number;
    activo: boolean;
    page: number;
    limit: number;
}

export interface PaginaProductos {
    data: Producto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CrearProductoInput {
    nombre: string;
    precio: number;
    categoriaId: number;
}

export interface ActualizarProductoInput {
    nombre: string;
    precio: number;
    categoriaId: number;
}
