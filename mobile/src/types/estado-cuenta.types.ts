export interface ClienteEstadoCuenta {
    id: number;
    nombre: string;
    telefono: string | null;
    activo: boolean;
}

export interface ProductoMovimiento {
    id: number;
    nombre: string;
}

export interface DetalleMovimientoVenta {
    cantidad: number;
    precioUnitario: string;
    subtotal: string;
    producto: ProductoMovimiento;
}

interface MovimientoBase {
    id: number;
    fecha: string;
    monto: string;
    saldo: string;
}

export interface MovimientoVenta extends MovimientoBase {
    tipo: 'VENTA';
    detalle: DetalleMovimientoVenta[];
}

export interface MovimientoPago extends MovimientoBase {
    tipo: 'PAGO';
    metodoPago: string;
    notas?: string | null;
}

export type MovimientoEstadoCuenta =
    | MovimientoVenta
    | MovimientoPago;

export interface EstadoCuentaResponse {
    cliente: ClienteEstadoCuenta;
    totalVentas: string;
    totalPagos: string;
    saldo: string;
    movimientos: MovimientoEstadoCuenta[];
}
