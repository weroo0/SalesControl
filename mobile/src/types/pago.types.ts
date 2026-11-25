export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA';

export type EstadoPago = 'ACTIVA' | 'CANCELADA';

export interface CrearPagoInput {
    clienteId: number;
    monto: number;
    metodoPago: MetodoPago;
    notas?: string;
}

export interface PagoBase {
    id: number;
    monto: string;
    metodoPago: MetodoPago;
    fechaPago: string;
    estado: EstadoPago;
    notas: string | null;
}

export interface PagoCliente {
    id: number;
    nombre: string;
}

export interface PagoUsuario {
    id: number;
    nombre: string;
}

export interface PagoCreado extends PagoBase {
    clienteId: number;
    usuarioId: number;
}

export interface PagoDetalle extends PagoBase {
    clienteId: number;
    usuarioId: number;
    cliente: PagoCliente;
    usuario: PagoUsuario;
}

export interface PagoListado extends PagoBase {
    cliente: PagoCliente;
    usuario: PagoUsuario;
}

export interface FiltrosPagos {
    clienteId?: number;
    usuarioId?: number;
    metodoPago?: MetodoPago;
    estado?: EstadoPago;
    fechaDesde?: string;
    fechaHasta?: string;
    page: number;
    limit: number;
}

export interface PaginaPagos {
    data: PagoListado[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
