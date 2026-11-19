export interface PeriodoDeuda {
    inicio: string;
    fin: string;
}

export interface ResumenDeudas {
    clientesConDeuda: number;
    clientesConDeudaQuePagaron: number;
    clientesConDeudaQueNoPagaron: number;

    totalPorCobrar: string;
    totalCobradoEstaSemana: string;
}

export interface ClienteConDeuda {
    id: number;
    nombre: string;
    telefono: string | null;
    activo: boolean;

    totalVentas: string;
    totalPagos: string;
    saldo: string;

    pagoEstaSemana: boolean;
    totalPagadoEstaSemana: string;
}

export interface ClientesConDeudaResponse {
    periodo: PeriodoDeuda;
    resumen: ResumenDeudas;
    clientes: ClienteConDeuda[];
}
