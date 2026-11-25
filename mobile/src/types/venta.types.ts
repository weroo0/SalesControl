export type TipoVenta = 'FIADO' | 'CONTADO';

export type EstadoVenta = 'ACTIVA' | 'CANCELADA';

export interface CrearVentaInput {
    clienteId: number;
    tipoVenta: TipoVenta;
    detalles: {
        productoId: number;
        cantidad: number;
    }[];
}

export interface VentaCliente {
    id: number;
    nombre: string;
}

export interface VentaUsuario {
    id: number;
    nombre: string;
    email: string;
}

export interface VentaProductoResumen {
    id: number;
    nombre: string;
}

export interface VentaProductoCompleto {
    id: number;
    nombre: string;
    precio: string;
    categoriaId: number;
    activo: boolean;
    createdAt: string;
}

export interface DetalleVenta {
    id: number;
    ventaId: number;
    productoId: number;
    cantidad: number;
    precioUnitario: string;
    subtotal: string;
}

export interface DetalleVentaCompleto extends DetalleVenta {
    producto: VentaProductoCompleto;
}

export interface DetalleVentaResumen extends DetalleVenta {
    producto: VentaProductoResumen;
}

export interface VentaBase {
    id: number;
    clienteId: number;
    usuarioId: number;
    tipoVenta: TipoVenta;
    total: string;
    fecha: string;
    estado: EstadoVenta;
}

export interface VentaCreada extends VentaBase {
    cliente: VentaCliente & {
        telefono: string | null;
        direccion: string;
        notas: string;
        activo: boolean;
        createdAt: string;
    };
    usuario: VentaUsuario;
    detalleVentas: DetalleVentaCompleto[];
}

export interface VentaDetalle extends VentaBase {
    cliente: VentaCliente & {
        telefono: string | null;
    };
    usuario: VentaUsuario;
    detalleVentas: DetalleVentaResumen[];
}

export interface VentaListado extends VentaBase {
    cliente: VentaCliente;
    usuario: VentaUsuario;
    detalleVentas: DetalleVentaResumen[];
}

export interface PaginaVentas {
    data: VentaListado[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface FiltrosVentas {
    clienteId?: number;
    usuarioId?: number;
    tipoVenta?: TipoVenta;
    estado?: EstadoVenta;
    fechaDesde?: string;
    fechaHasta?: string;
    page: number;
    limit: number;
}