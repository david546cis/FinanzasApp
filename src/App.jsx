import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

function App() {
  // =========================================================
  // ESTADOS GENERALES
  // =========================================================

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [mostrarFormularioPago, setMostrarFormularioPago] =
    useState(false)
  const [pantalla, setPantalla] = useState('inicio')
  const inputRespaldoRef = useRef(null)
  const [filtroPagos, setFiltroPagos] = useState('pendientes')
  const [pagoPorConfirmar, setPagoPorConfirmar] = useState(null)
  const [vistaPreviaExcel, setVistaPreviaExcel] = useState(null)
  const inputExcelRef = useRef(null)
  const [metodoPagoConfirmacion, setMetodoPagoConfirmacion] = useState('')
  const [filtroMovimientos, setFiltroMovimientos] = useState('todos')
  const [busquedaMovimiento, setBusquedaMovimiento] = useState('')
  const [movimientoSeleccionado, setMovimientoSeleccionado] =
  useState(null)

const [editandoMovimiento, setEditandoMovimiento] =
  useState(false)

const [formularioEdicion, setFormularioEdicion] =
  useState({
    tipo: 'gasto',
    monto: '',
    concepto: '',
    categoria: '',
    metodoPago: '',
    notas: '',
    fecha: '',
  })
  // =========================================================
// AJUSTES
// =========================================================

const [ajustes, setAjustes] = useState(() => {
  const guardados = localStorage.getItem('finanzas_ajustes')

  try {
    return guardados
      ? JSON.parse(guardados)
      : {
          nombre: 'David',
          moneda: 'MXN',
          formatoFecha: 'dd/mm/aaaa',

          recordatorios: true,
          diasAnticipacion: 3,
          recordarVencimiento: true,
        }
  } catch {
    return {
      nombre: 'David',
      moneda: 'MXN',
      formatoFecha: 'dd/mm/aaaa',

      recordatorios: true,
      diasAnticipacion: 3,
      recordarVencimiento: true,
    }
  }
})
  const [mesMovimientos, setMesMovimientos] = useState(() => {
  const hoy = new Date()

  return {
    anio: hoy.getFullYear(),
    mes: hoy.getMonth(),
  }
})

  // =========================================================
  // MOVIMIENTOS
  // =========================================================

  const [movimientos, setMovimientos] = useState(() => {
    const guardados = localStorage.getItem('finanzas_movimientos')

    try {
      return guardados ? JSON.parse(guardados) : []
    } catch {
      return []
    }
  })

  const formularioInicial = {
    tipo: 'gasto',
    monto: '',
    concepto: '',
    categoria: '',
    metodoPago: '',
    notas: '',
    fecha: new Date().toISOString().split('T')[0],
  }

  const [formulario, setFormulario] = useState(formularioInicial)

  // =========================================================
  // PAGOS
  // =========================================================

  const [pagos, setPagos] = useState(() => {
    const guardados = localStorage.getItem('finanzas_pagos')

    try {
      return guardados ? JSON.parse(guardados) : []
    } catch {
      return []
    }
  })

  const pagoInicial = {
    concepto: '',
    monto: '',
    fechaVencimiento: new Date().toISOString().split('T')[0],
    categoria: '',

    // unico | recurrente | plazo
    modalidad: 'unico',

    frecuencia: 'mensual',

    // Sólo se usan cuando modalidad === "plazo"
    pagoActual: 1,
    totalPagos: '',
  }

  const [formularioPago, setFormularioPago] =
    useState(pagoInicial)
    // =========================================================
// DETALLE Y EDICIÓN DE PAGOS
// =========================================================

const [pagoSeleccionado, setPagoSeleccionado] =
  useState(null)

const [editandoPago, setEditandoPago] =
  useState(false)

const [formularioEdicionPago, setFormularioEdicionPago] =
  useState({
    concepto: '',
    monto: '',
    fechaVencimiento: '',
    categoria: '',
    modalidad: 'unico',
    frecuencia: 'mensual',
    pagoActual: 1,
    totalPagos: '',
  })

  // =========================================================
  // GUARDADO AUTOMÁTICO
  // =========================================================

  useEffect(() => {
    localStorage.setItem(
      'finanzas_movimientos',
      JSON.stringify(movimientos)
    )
  }, [movimientos])

  useEffect(() => {
    localStorage.setItem(
      'finanzas_pagos',
      JSON.stringify(pagos)
    )
  }, [pagos])
  useEffect(() => {
  localStorage.setItem(
    'finanzas_ajustes',
    JSON.stringify(ajustes)
  )
}, [ajustes])

  // =========================================================
  // FORMATO DE DINERO
  // =========================================================

  const formatoDinero = (cantidad) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(cantidad) || 0)

  // =========================================================
  // FORMATO DE FECHA
  // =========================================================

  const formatoFecha = (fecha) => {
    if (!fecha) return ''

    const [anio, mes, dia] = fecha.split('-')

    return `${dia}/${mes}/${anio}`
  }
// =========================================================
// ESTADO DE VENCIMIENTO DE PAGOS
// =========================================================

const obtenerEstadoVencimiento = (fechaVencimiento) => {
  if (!fechaVencimiento) {
    return {
      dias: null,
      tipo: 'sin-fecha',
      texto: 'Sin fecha',
    }
  }

  const [anio, mes, dia] = fechaVencimiento
    .split('-')
    .map(Number)

  const vencimiento = new Date(
    anio,
    mes - 1,
    dia
  )

  const ahora = new Date()

  const hoy = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate()
  )

  const diferencia =
    vencimiento.getTime() - hoy.getTime()

  const dias = Math.round(
    diferencia / (1000 * 60 * 60 * 24)
  )

  if (dias < 0) {
    return {
      dias,
      tipo: 'vencido',
      texto:
        dias === -1
          ? 'Venció ayer'
          : `Vencido hace ${Math.abs(dias)} días`,
    }
  }

  if (dias === 0) {
    return {
      dias,
      tipo: 'hoy',
      texto: 'Vence hoy',
    }
  }

  if (dias === 1) {
    return {
      dias,
      tipo: 'pronto',
      texto: 'Vence mañana',
    }
  }

  if (dias <= 7) {
    return {
      dias,
      tipo: 'pronto',
      texto: `Vence en ${dias} días`,
    }
  }

  return {
    dias,
    tipo: 'proximo',
    texto: `Vence en ${dias} días`,
  }
}
// =========================================================
// CATÁLOGO DE CATEGORÍAS
// =========================================================

const categoriasIngreso = [
  { valor: 'sueldo', nombre: 'Sueldo' },
  { valor: 'otros_ingresos', nombre: 'Otros ingresos' },
]

const categoriasGasto = [
  { valor: 'alimentacion', nombre: 'Alimentación' },
  { valor: 'transporte', nombre: 'Transporte' },
  { valor: 'servicios', nombre: 'Servicios' },
  { valor: 'hogar', nombre: 'Hogar / Vivienda' },
  { valor: 'salud', nombre: 'Salud / Cuidado personal' },
  { valor: 'entretenimiento', nombre: 'Entretenimiento' },
  { valor: 'educacion', nombre: 'Educación' },
  { valor: 'ninos_escuela', nombre: 'Niños / Escuela' },
  { valor: 'deudas', nombre: 'Deudas / Crédito' },
  { valor: 'mascotas', nombre: 'Mascotas' },
  { valor: 'ahorro', nombre: 'Ahorro' },
  { valor: 'otros', nombre: 'Otros' },
]

// =========================================================
// NORMALIZACIÓN DE CATEGORÍAS PARA IMPORTACIÓN
// =========================================================

const normalizarCategoriaImportada = (
  categoriaOriginal,
  tipoMovimiento
) => {
  const categoria = String(
    categoriaOriginal || ''
  )
    .trim()
    .toLowerCase()

  const tipo = String(
    tipoMovimiento || ''
  )
    .trim()
    .toLowerCase()

  // ================= INGRESOS =================

  if (tipo === 'ingreso') {
    const categoriasSueldo = [
      'nómina',
      'nomina',
      'sueldo',
    ]

    if (categoriasSueldo.includes(categoria)) {
      return 'sueldo'
    }

    return 'otros_ingresos'
  }

  // ================= GASTOS =================

  const equivalencias = {
    alimentacion: 'alimentacion',
    'alimentación': 'alimentacion',
    alimentos: 'alimentacion',
    despensa: 'alimentacion',

    transporte: 'transporte',

    servicios: 'servicios',
    telefonia: 'servicios',
    'telefonía': 'servicios',
    suscripciones: 'servicios',

    vivienda: 'hogar',
    hogar: 'hogar',
    'hogar / vivienda': 'hogar',

    salud: 'salud',
    'salud / cuidado personal': 'salud',

    entretenimiento: 'entretenimiento',

    educacion: 'educacion',
    'educación': 'educacion',

    niños: 'ninos_escuela',
    'niños': 'ninos_escuela',
    'niños / escuela': 'ninos_escuela',

    deudas: 'deudas',
    'deudas / crédito': 'deudas',
    'deudas / credito': 'deudas',
    comisiones: 'deudas',

    mascotas: 'mascotas',

    ahorro: 'ahorro',

    otros: 'otros',
    compras: 'otros',
    ropa: 'otros',
    familia: 'otros',
    regalos: 'otros',
    donaciones: 'otros',
    'servicios profesionales': 'otros',
  }

  return equivalencias[categoria] || 'otros'
}
  // =========================================================
  // NOMBRES DE CATEGORÍAS
  // =========================================================

const nombreCategoria = (categoria) => {
  const categorias = {
    // Ingresos
    sueldo: 'Sueldo',
    otros_ingresos: 'Otros ingresos',

    // Gastos
    alimentacion: 'Alimentación',
    transporte: 'Transporte',
    servicios: 'Servicios',
    hogar: 'Hogar / Vivienda',
    salud: 'Salud / Cuidado personal',
    entretenimiento: 'Entretenimiento',
    educacion: 'Educación',
    ninos_escuela: 'Niños / Escuela',
    deudas: 'Deudas / Crédito',
    mascotas: 'Mascotas',
    ahorro: 'Ahorro',
    otros: 'Otros',
  }

  return categorias[categoria] || categoria
}
// =========================================================
// NORMALIZACIÓN DE MÉTODOS DE PAGO PARA IMPORTACIÓN
// =========================================================

const normalizarMetodoPagoImportado = (metodoOriginal) => {
  const metodo = String(
    metodoOriginal || ''
  )
    .trim()
    .toLowerCase()

  const equivalencias = {
    efectivo: 'efectivo',

    débito: 'debito',
    debito: 'debito',

    'tarjeta débito': 'debito',
    'tarjeta de débito': 'debito',
    'tarjeta debito': 'debito',
    'tarjeta de debito': 'debito',

    crédito: 'credito',
    credito: 'credito',

    'tarjeta crédito': 'credito',
    'tarjeta de crédito': 'credito',
    'tarjeta credito': 'credito',
    'tarjeta de credito': 'credito',

    transferencia: 'transferencia',
    'transferencia bancaria': 'transferencia',

    nómina: 'nomina',
    nomina: 'nomina',
  }

  return equivalencias[metodo] || 'otro'
}
  // =========================================================
// NOMBRES DE MÉTODOS DE PAGO
// =========================================================

const nombreMetodoPago = (metodo) => {
  const metodos = {
    efectivo: 'Efectivo',
    debito: 'Débito',
    credito: 'Tarjeta de crédito',
    transferencia: 'Transferencia',
    nomina: 'Nómina',
    otro: 'Otro',
  }

  return metodos[metodo] || 'Sin especificar'
}

  // =========================================================
  // CAMBIAR CAMPOS DEL FORMULARIO DE MOVIMIENTOS
  // =========================================================

  const cambiarCampo = (e) => {
    const { name, value } = e.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  const cambiarTipo = (tipo) => {
    setFormulario((anterior) => ({
      ...anterior,
      tipo,
      categoria: '',
    }))
  }
// =========================================================
// CAMBIAR AJUSTES
// =========================================================

const cambiarAjuste = (campo, valor) => {
  setAjustes((anteriores) => ({
    ...anteriores,
    [campo]: valor,
  }))
}

// =========================================================
// EXPORTAR RESPALDO
// =========================================================

const exportarDatos = () => {
  const respaldo = {
    aplicacion: 'FinanzasApp',
    versionRespaldo: 1,
    creadoEn: new Date().toISOString(),

    ajustes,
    movimientos,
    pagos,
  }

  const contenido = JSON.stringify(
    respaldo,
    null,
    2
  )

  const archivo = new Blob(
    [contenido],
    {
      type: 'application/json',
    }
  )

  const url = URL.createObjectURL(archivo)

  const enlace = document.createElement('a')

  const fecha = new Date()
    .toISOString()
    .split('T')[0]

  enlace.href = url

  enlace.download =
    `FinanzasApp-respaldo-${fecha}.json`

  document.body.appendChild(enlace)

  enlace.click()

  document.body.removeChild(enlace)

  URL.revokeObjectURL(url)
}
// =========================================================
// PREPARAR MOVIMIENTO IMPORTADO DESDE EXCEL
// =========================================================

const prepararMovimientoImportado = (fila) => {
  const tipo = String(fila.Tipo || '')
    .trim()
    .toLowerCase()

  const concepto = String(fila.Concepto || '').trim()

  const categoriaOriginal = String(
    fila['Categoría'] || ''
  ).trim()

  const metodoOriginal = String(
    fila['Método de pago'] || ''
  ).trim()

  const montoTexto = String(fila.Monto || '')
    .replace(/[$,\s]/g, '')

  const monto = Number(montoTexto)

  // ===============================================
  // FECHA
  // ===============================================

let fecha = ''

const fechaOriginal = String(
  fila.Fecha || ''
).trim()

// ===============================================
// FORMATO MM/DD/YY
// Ejemplo recibido desde Excel: 10/29/24
// ===============================================

let partesFecha = fechaOriginal.match(
  /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/
)

if (partesFecha) {
  const mes = partesFecha[1].padStart(2, '0')
  const dia = partesFecha[2].padStart(2, '0')

  const anioCorto = Number(partesFecha[3])

  const anio =
    anioCorto >= 70
      ? 1900 + anioCorto
      : 2000 + anioCorto

  fecha = `${anio}-${mes}-${dia}`
}

// ===============================================
// FORMATO MM/DD/YYYY
// Ejemplo: 10/29/2024
// ===============================================

if (!fecha) {
  partesFecha = fechaOriginal.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  )

  if (partesFecha) {
    const mes = partesFecha[1].padStart(2, '0')
    const dia = partesFecha[2].padStart(2, '0')
    const anio = partesFecha[3]

    fecha = `${anio}-${mes}-${dia}`
  }
}

// ===============================================
// FORMATO YYYY-MM-DD
// Ya compatible con FinanzasApp
// ===============================================

if (
  !fecha &&
  /^\d{4}-\d{2}-\d{2}$/.test(fechaOriginal)
) {
  fecha = fechaOriginal
}

  // ===============================================
  // CATEGORÍA
  // ===============================================

  const categoria =
    normalizarCategoriaImportada(
      categoriaOriginal,
      tipo
    )

  const nombreCategoriaNormalizada =
    nombreCategoria(categoria)

  // Conservamos la categoría histórica solamente
  // cuando la normalización cambió su significado visible.
  const categoriaFueNormalizada =
    categoriaOriginal &&
    categoriaOriginal
      .trim()
      .toLowerCase() !==
      nombreCategoriaNormalizada
        .trim()
        .toLowerCase()

  const notas = categoriaFueNormalizada
    ? `Categoría original: ${categoriaOriginal}`
    : ''

// ===============================================
// RESULTADO
// ===============================================

return {
  id: crypto.randomUUID(),
  tipo,
  monto,
  concepto,
  categoria,

  metodoPago:
    normalizarMetodoPagoImportado(
      metodoOriginal
    ),

  notas,
  fecha,

  creadoEn:
    new Date().toISOString(),

  // Indica que este movimiento vino del Excel
  origenImportacion: 'excel',
}
}

// =========================================================
// CLAVE PARA DETECTAR MOVIMIENTOS DUPLICADOS
// =========================================================


const crearClaveMovimiento = (movimiento) => {
  const fecha = String(
    movimiento.fecha || ''
  ).trim()

  const tipo = String(
    movimiento.tipo || ''
  )
    .trim()
    .toLowerCase()

  const concepto = String(
    movimiento.concepto || ''
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

  const monto = Number(
    movimiento.monto || 0
  ).toFixed(2)

  return `${fecha}|${tipo}|${monto}|${concepto}`
}
// =========================================================
// CONFIRMAR IMPORTACIÓN DE MOVIMIENTOS DESDE EXCEL
// =========================================================

const importarMovimientosDesdeExcel = () => {
  if (
    !vistaPreviaExcel ||
    !Array.isArray(vistaPreviaExcel.movimientos)
  ) {
    alert(
      'Primero selecciona un archivo de Excel válido.'
    )
    return
  }

  const clavesExistentes = new Set(
    movimientos.map(
      crearClaveMovimiento
    )
  )

  const movimientosNuevos =
    vistaPreviaExcel.movimientos.filter(
      (movimiento) =>
        !clavesExistentes.has(
          crearClaveMovimiento(movimiento)
        )
    )

  if (movimientosNuevos.length === 0) {
    alert(
      'No hay movimientos nuevos para importar.'
    )
    return
  }

  const confirmar = window.confirm(
    `Se importarán ${movimientosNuevos.length} movimientos desde Excel.\n\n` +
    `Los movimientos que ya existan en FinanzasApp no se volverán a importar.\n\n` +
    `¿Deseas continuar?`
  )

  if (!confirmar) return

  setMovimientos((anteriores) => [
    ...movimientosNuevos,
    ...anteriores,
  ])

  setVistaPreviaExcel(null)

  alert(
    `${movimientosNuevos.length} movimientos importados correctamente.`
  )
}
// =========================================================
// NORMALIZAR FECHAS DE PAGOS IMPORTADAS DESDE EXCEL
// =========================================================

const normalizarFechaPagoExcel = (valor) => {
  if (!valor) return ''

  // Si XLSX entrega un objeto Date.
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    const anio = valor.getFullYear()
    const mes = String(valor.getMonth() + 1).padStart(2, '0')
    const dia = String(valor.getDate()).padStart(2, '0')
    return `${anio}-${mes}-${dia}`
  }

  const texto = String(valor).trim()

  if (!texto) return ''

  // Ya viene en el formato que usa FinanzasApp.
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto
  }

  // XLSX con raw:false está entregando las fechas del archivo como
  // MM/DD/YY o MM/DD/YYYY (igual que ocurrió con MOVIMIENTOS).
  let partes = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/
  )

  if (partes) {
    const mes = partes[1].padStart(2, '0')
    const dia = partes[2].padStart(2, '0')
    const anioCorto = Number(partes[3])
    const anio =
      anioCorto >= 70
        ? 1900 + anioCorto
        : 2000 + anioCorto

    return `${anio}-${mes}-${dia}`
  }

  partes = texto.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  )

  if (partes) {
    const mes = partes[1].padStart(2, '0')
    const dia = partes[2].padStart(2, '0')
    const anio = partes[3]

    return `${anio}-${mes}-${dia}`
  }

  return ''
}

// =========================================================
// PREPARAR PAGO IMPORTADO DESDE EXCEL
// =========================================================

const prepararPagoImportado = (fila) => {
  const concepto = String(
    fila.Concepto || ''
  ).trim()

  const categoriaOriginal = String(
    fila['Categoría'] || ''
  ).trim()

  const metodoOriginal = String(
    fila['Método'] || ''
  ).trim()

  const periodicidad = String(
    fila['Periodicidad'] || ''
  )
    .trim()
    .toLowerCase()

  // En PAGOS RECURRENTES el monto puede llegar desde XLSX
  // como número real de Excel o como texto con formato monetario.
  const montoOriginal =
  fila[' Monto '] ??
  fila.Monto ??
  0

const monto =
  typeof montoOriginal === 'number'
    ? montoOriginal
    : Number(
        String(montoOriginal)
          .replace(/[^0-9.-]/g, '')
      )

  const totalPagos = Number(
    fila['Núm. pagos'] || 0
  )

  const pagosRealizados = Number(
    fila['Pagos realizados'] || 0
  )

  const fechaVencimiento =
    normalizarFechaPagoExcel(
      fila['Próximo pago']
    )

  // Sin número total = recurrente indefinido.
  // Con número total = compromiso a plazo.
  const modalidad =
    totalPagos > 0
      ? 'plazo'
      : 'recurrente'

  const frecuencias = {
    semanal: 'semanal',
    quincenal: 'quincenal',
    mensual: 'mensual',
    bimestral: 'bimestral',
    trimestral: 'trimestral',
    semestral: 'semestral',
    anual: 'anual',
  }

  const frecuencia =
    frecuencias[periodicidad] || 'mensual'

  return {
    id: crypto.randomUUID(),
    concepto,
    monto,
    fechaVencimiento,

    categoria:
      normalizarCategoriaImportada(
        categoriaOriginal,
        'gasto'
      ),

    metodoPago:
      normalizarMetodoPagoImportado(
        metodoOriginal
      ),

    modalidad,
    frecuencia,

    // Si ya se hicieron 5 de 30, el pendiente que entra
    // a FinanzasApp es el pago 6 de 30.
    pagoActual:
      modalidad === 'plazo'
        ? pagosRealizados + 1
        : null,

    totalPagos:
      modalidad === 'plazo'
        ? totalPagos
        : null,

    estado: 'pendiente',
    fechaPago: null,
    creadoEn: new Date().toISOString(),
    origenImportacion: 'excel',
    categoriaOriginal,
  }
}
// =========================================================
// CLAVE PARA DETECTAR PAGOS DUPLICADOS
// =========================================================

const crearClavePago = (pago) => {
  const concepto = String(pago.concepto || '')
    .trim()
    .toLowerCase()

  const monto = Number(pago.monto || 0).toFixed(2)
  const fechaVencimiento = String(
    pago.fechaVencimiento || ''
  ).trim()
  const modalidad = String(pago.modalidad || '').trim()
  const frecuencia = String(pago.frecuencia || '').trim()
  const pagoActual = Number(pago.pagoActual || 0)
  const totalPagos = Number(pago.totalPagos || 0)

  return [
    concepto,
    monto,
    fechaVencimiento,
    modalidad,
    frecuencia,
    pagoActual,
    totalPagos,
  ].join('|')
}

// =========================================================
// CONFIRMAR IMPORTACIÓN DE PAGOS DESDE EXCEL
// =========================================================
const importarPagosDesdeExcel = () => {
  if (
    !vistaPreviaExcel ||
    !Array.isArray(vistaPreviaExcel.pagosPreparados)
  ) {
    alert('Primero selecciona un archivo de Excel válido.')
    return
  }

  const clavesExistentes = new Set(
    pagos
      .filter((pago) => pago.estado === 'pendiente')
      .map(crearClavePago)
  )

  const pagosNuevos =
    vistaPreviaExcel.pagosPreparados.filter(
      (pago) =>
        !clavesExistentes.has(
          crearClavePago(pago)
        )
    )

  if (pagosNuevos.length === 0) {
    alert('No hay pagos nuevos para importar.')
    return
  }

  const confirmar = window.confirm(
    `Se importarán ${pagosNuevos.length} pagos desde Excel.\n\n` +
    `Los pagos que ya existan en FinanzasApp no se volverán a importar.\n\n` +
    `¿Deseas continuar?`
  )

  if (!confirmar) return

  setPagos((anteriores) => [
    ...pagosNuevos,
    ...anteriores,
  ])

  setVistaPreviaExcel((anterior) =>
    anterior
      ? {
          ...anterior,
          pagosYaExistentes:
            anterior.pagosPreparados.length,
          pagosNuevos: 0,
        }
      : anterior
  )

  alert(
    `${pagosNuevos.length} pagos importados correctamente.`
  )
}

// =========================================================
// IMPORTAR RESPALDO
// =========================================================
const leerExcelParaImportacion = (evento) => {
  const archivo = evento.target.files?.[0]

  if (!archivo) return

  const lector = new FileReader()

  lector.onload = (e) => {
    try {
      const datos = new Uint8Array(e.target.result)

      const libro = XLSX.read(datos, {
        type: 'array',
        cellDates: true,
      })

      const hoja = libro.Sheets['MOVIMIENTOS']
      const hojaPagos =
      libro.Sheets['PAGOS RECURRENTES']

      if (!hoja) {
        alert('El archivo no contiene la hoja MOVIMIENTOS.')
        evento.target.value = ''
        return
      }

      const filas = XLSX.utils.sheet_to_json(hoja, {
        defval: '',
        raw: false,
      })
      const filasPagos =
  XLSX.utils.sheet_to_json(
    hojaPagos,
    {
      defval: '',
      // Para pagos usamos el valor real almacenado por Excel.
      // cellDates:true mantiene las fechas como objetos Date.
      raw: true,
    }
  )

// Ignoramos filas que Excel conserva por formato,
// pero que realmente no contienen un pago.
const pagosRealesExcel =
  filasPagos.filter((fila) => {
    const concepto = String(
      fila.Concepto || ''
    ).trim()

    return concepto !== ''
  })

const pagosActivosExcel =
  pagosRealesExcel.filter((fila) =>
    String(fila.Activo || '')
      .trim()
      .toUpperCase() === 'SI'
  )

const pagosCompletadosExcel =
  pagosActivosExcel.filter((fila) => {
    const totalPagos = Number(
      fila['Núm. pagos'] || 0
    )

    const pagosRealizados = Number(
      fila['Pagos realizados'] || 0
    )

    return (
      totalPagos > 0 &&
      pagosRealizados >= totalPagos
    )
  })

const pagosParaMigrarExcel =
  pagosActivosExcel.filter((fila) => {
    const totalPagos = Number(
      fila['Núm. pagos'] || 0
    )

    const pagosRealizados = Number(
      fila['Pagos realizados'] || 0
    )

    // Sin número total = recurrente indefinido
    if (totalPagos <= 0) {
      return true
    }

    // Con número total = solamente si aún falta pagar
    return pagosRealizados < totalPagos
  })

const pagosPreparados =
  pagosParaMigrarExcel.map(
    prepararPagoImportado
  )

const pagosRecurrentesPreparados =
  pagosPreparados.filter(
    (pago) =>
      pago.modalidad === 'recurrente'
  )

const pagosPlazoPreparados =
  pagosPreparados.filter(
    (pago) =>
      pago.modalidad === 'plazo'
  )


const pagosSinFechaPreparados =
  pagosPreparados.filter(
    (pago) => !pago.fechaVencimiento
  )

const pagosConFechaPreparados =
  pagosPreparados.filter(
    (pago) => Boolean(pago.fechaVencimiento)
  )

const pagosVencidosPreparados =
  pagosConFechaPreparados.filter((pago) =>
    obtenerEstadoVencimiento(
      pago.fechaVencimiento
    ).dias < 0
  )

const clavesPagosExistentes = new Set(
  pagos
    .filter((pago) => pago.estado === 'pendiente')
    .map(crearClavePago)
)

const pagosYaExistentes =
  pagosPreparados.filter((pago) =>
    clavesPagosExistentes.has(
      crearClavePago(pago)
    )
  )

const pagosNuevos =
  pagosPreparados.filter((pago) =>
    !clavesPagosExistentes.has(
      crearClavePago(pago)
    )
  )

      const filasValidas = filas.filter((fila) => {
        const tipo = String(fila.Tipo || '')
          .trim()
          .toLowerCase()

        const concepto = String(fila.Concepto || '').trim()

        const montoTexto = String(fila.Monto || '')
          .replace(/[$,\s]/g, '')

        const monto = Number(montoTexto)

        return (
          (tipo === 'ingreso' || tipo === 'gasto') &&
          concepto !== '' &&
          Number.isFinite(monto) &&
          monto > 0
        )
      })

const movimientosPreparados =
  filasValidas.map(
    prepararMovimientoImportado
  )
const clavesExistentes = new Set(
  movimientos.map(
    crearClaveMovimiento
  )
)

const posiblesDuplicados =
  movimientosPreparados.filter(
    (movimiento) =>
      clavesExistentes.has(
        crearClaveMovimiento(movimiento)
      )
  )

const movimientosNuevos =
  movimientosPreparados.filter(
    (movimiento) =>
      !clavesExistentes.has(
        crearClaveMovimiento(movimiento)
      )
  )
  const contadorClavesExcel = new Map()

movimientosPreparados.forEach(
  (movimiento) => {
    const clave =
      crearClaveMovimiento(movimiento)

    contadorClavesExcel.set(
      clave,
      (contadorClavesExcel.get(clave) || 0) + 1
    )
  }
)

const duplicadosDentroExcel =
  movimientosPreparados.filter(
    (movimiento) =>
      contadorClavesExcel.get(
        crearClaveMovimiento(movimiento)
      ) > 1
  )
const movimientosSinFecha =
  movimientosPreparados.filter(
    (movimiento) => !movimiento.fecha
  )

setVistaPreviaExcel({
  nombreArchivo: archivo.name,

  totalFilas: filas.length,

  filasValidas: filasValidas.length,

  filasDescartadas:
    filas.length - filasValidas.length,

  movimientos:
    movimientosPreparados,

  movimientosSinFecha:
    movimientosSinFecha.length,
  posiblesDuplicados:
  posiblesDuplicados.length,

  movimientosNuevos:
  movimientosNuevos.length,
  duplicadosDentroExcel:
  duplicadosDentroExcel.length,
  pagosEncontrados:
  pagosRealesExcel.length,

pagosActivos:
  pagosActivosExcel.length,

pagosCompletados:
  pagosCompletadosExcel.length,

pagosParaMigrar:
  pagosParaMigrarExcel.length,
  pagosPreparados,

pagosRecurrentes:
  pagosRecurrentesPreparados.length,

pagosPlazo:
  pagosPlazoPreparados.length,

pagosConFecha:
  pagosConFechaPreparados.length,

pagosSinFecha:
  pagosSinFechaPreparados.length,

pagosVencidos:
  pagosVencidosPreparados.length,

pagosYaExistentes:
  pagosYaExistentes.length,

pagosNuevos:
  pagosNuevos.length,
})

      console.log('Vista previa de importación:', filasValidas)
    } catch (error) {
      console.error('Error al leer Excel:', error)

      alert(
        'No se pudo leer el archivo de Excel. Verifica que sea el archivo correcto.'
      )
    }

    evento.target.value = ''
  }

  lector.readAsArrayBuffer(archivo)
}

const importarDatos = (e) => {
  const archivo = e.target.files?.[0]

  if (!archivo) return

  const lector = new FileReader()

  lector.onload = (evento) => {
    try {
      const contenido = evento.target.result

      const respaldo = JSON.parse(contenido)

      // ===============================================
      // VALIDAR QUE SEA UN RESPALDO DE FINANZASAPP
      // ===============================================

      if (
        respaldo.aplicacion !== 'FinanzasApp' ||
        respaldo.versionRespaldo !== 1
      ) {
        alert(
          'Este archivo no es un respaldo compatible de FinanzasApp.'
        )

        return
      }

      // ===============================================
      // VALIDAR CONTENIDO
      // ===============================================

      if (
        !Array.isArray(respaldo.movimientos) ||
        !Array.isArray(respaldo.pagos) ||
        !respaldo.ajustes ||
        typeof respaldo.ajustes !== 'object'
      ) {
        alert(
          'El respaldo está incompleto o tiene un formato incorrecto.'
        )

        return
      }

      // ===============================================
      // CONFIRMAR RESTAURACIÓN
      // ===============================================

      const confirmar = window.confirm(
        `Se restaurará este respaldo:\n\n` +
          `${respaldo.movimientos.length} movimientos\n` +
          `${respaldo.pagos.length} pagos\n\n` +
          `Los datos actuales de esta aplicación serán reemplazados.\n\n` +
          `¿Quieres continuar?`
      )

      if (!confirmar) return

      // ===============================================
      // RESTAURAR INFORMACIÓN
      // ===============================================

      setMovimientos(
        respaldo.movimientos
      )

      setPagos(
        respaldo.pagos
      )

      setAjustes((anteriores) => ({
        ...anteriores,
        ...respaldo.ajustes,
      }))

      alert(
        'Respaldo restaurado correctamente.'
      )
    } catch (error) {
      console.error(
        'Error al importar respaldo:',
        error
      )

      alert(
        'No pudimos leer este archivo. Verifica que sea un respaldo válido de FinanzasApp.'
      )
    } finally {
      e.target.value = ''
    }
  }

  lector.onerror = () => {
    alert(
      'Ocurrió un error al leer el archivo.'
    )

    e.target.value = ''
  }

  lector.readAsText(archivo)
}
// =========================================================
// REINICIAR DATOS FINANCIEROS
// =========================================================

const reiniciarDatosFinancieros = () => {
  const confirmar = window.confirm(
    `¿Quieres borrar todos los movimientos y pagos de FinanzasApp?\n\n` +
    `Esta acción eliminará los datos financieros guardados en este dispositivo.\n\n` +
    `Tus ajustes personales se conservarán.\n\n` +
    `Antes de continuar es recomendable exportar un respaldo.`
  )

  if (!confirmar) return

  const confirmarDefinitivo = window.confirm(
    `CONFIRMACIÓN FINAL\n\n` +
    `Se eliminarán:\n` +
    `• ${movimientos.length} movimientos\n` +
    `• ${pagos.length} pagos\n\n` +
    `Esta acción no se puede deshacer salvo que tengas un respaldo.\n\n` +
    `¿Continuar?`
  )

  if (!confirmarDefinitivo) return

  setMovimientos([])
  setPagos([])
  setVistaPreviaExcel(null)

  localStorage.removeItem('finanzas_movimientos')
  localStorage.removeItem('finanzas_pagos')

  alert(
    'Los datos financieros fueron reiniciados correctamente.'
  )
}
  // =========================================================
  // GUARDAR MOVIMIENTO
  // =========================================================

  const guardarMovimiento = (e) => {
    e.preventDefault()

    const monto = Number(formulario.monto)

    if (!monto || monto <= 0) {
      alert('Ingresa un monto válido.')
      return
    }

    if (!formulario.concepto.trim()) {
      alert('Ingresa un concepto.')
      return
    }

    if (!formulario.categoria) {
      alert('Selecciona una categoría.')
      return
    }

    const nuevoMovimiento = {
      id: crypto.randomUUID(),
      tipo: formulario.tipo,
      monto,
      concepto: formulario.concepto.trim(),
      categoria: formulario.categoria,
      metodoPago: formulario.metodoPago,
      notas: formulario.notas.trim(),
      fecha: formulario.fecha,
      creadoEn: new Date().toISOString(),
    }

    setMovimientos((anteriores) => [
      nuevoMovimiento,
      ...anteriores,
    ])

    setFormulario({
      ...formularioInicial,
      fecha: new Date().toISOString().split('T')[0],
    })

    setMostrarFormulario(false)
  }

  // =========================================================
  // ELIMINAR MOVIMIENTO
  // =========================================================


  // =========================================================
// DETALLE Y EDICIÓN DE MOVIMIENTOS
// =========================================================

const abrirDetalleMovimiento = (movimiento) => {
  setMovimientoSeleccionado(movimiento)

  setFormularioEdicion({
    tipo: movimiento.tipo,
    monto: movimiento.monto,
    concepto: movimiento.concepto,
    categoria: movimiento.categoria,
    metodoPago: movimiento.metodoPago || '',
    notas: movimiento.notas || '',
    fecha: movimiento.fecha,
  })

  setEditandoMovimiento(false)
}

const cerrarDetalleMovimiento = () => {
  setMovimientoSeleccionado(null)
  setEditandoMovimiento(false)
}

const cambiarCampoEdicion = (e) => {
  const { name, value } = e.target

  setFormularioEdicion((anterior) => ({
    ...anterior,
    [name]: value,
  }))
}

const cambiarTipoEdicion = (tipo) => {
  setFormularioEdicion((anterior) => ({
    ...anterior,
    tipo,
    categoria:
      anterior.tipo === tipo
        ? anterior.categoria
        : '',
  }))
}

const guardarEdicionMovimiento = (e) => {
  e.preventDefault()

  if (!movimientoSeleccionado) return

  // Los movimientos generados desde pagos
  // no se pueden modificar directamente.
  if (movimientoSeleccionado.origenPago) {
    alert(
      'Este movimiento fue generado desde un pago y no puede editarse directamente.'
    )

    setEditandoMovimiento(false)
    return
  }

  const monto = Number(formularioEdicion.monto)

  if (!monto || monto <= 0) {
    alert('Ingresa un monto válido.')
    return
  }

  if (!formularioEdicion.concepto.trim()) {
    alert('Ingresa un concepto.')
    return
  }

  if (!formularioEdicion.categoria) {
    alert('Selecciona una categoría.')
    return
  }

  if (!formularioEdicion.fecha) {
    alert('Selecciona una fecha.')
    return
  }

  const movimientoActualizado = {
    ...movimientoSeleccionado,

    tipo: formularioEdicion.tipo,

    monto,
    concepto: formularioEdicion.concepto.trim(),
    categoria: formularioEdicion.categoria,
    metodoPago: formularioEdicion.metodoPago,
    notas: formularioEdicion.notas.trim(),
    fecha: formularioEdicion.fecha,
    modificadoEn: new Date().toISOString(),
  }

  setMovimientos((anteriores) =>
    anteriores.map((movimiento) =>
      movimiento.id === movimientoSeleccionado.id
        ? movimientoActualizado
        : movimiento
    )
  )

  setMovimientoSeleccionado(movimientoActualizado)
  setEditandoMovimiento(false)
}

const eliminarMovimientoSeleccionado = () => {
  if (!movimientoSeleccionado) return

  // Protección de integridad.
  if (movimientoSeleccionado.origenPago) {
    alert(
      'Este movimiento está vinculado a un pago realizado. Administra ese registro desde la sección Pagos.'
    )

    return
  }

  const confirmar = window.confirm(
    `¿Quieres eliminar "${movimientoSeleccionado.concepto}" por ${formatoDinero(
      movimientoSeleccionado.monto
    )}?`
  )

  if (!confirmar) return

  setMovimientos((anteriores) =>
    anteriores.filter(
      (movimiento) =>
        movimiento.id !== movimientoSeleccionado.id
    )
  )

  cerrarDetalleMovimiento()
}

  // =========================================================
  // CAMBIAR CAMPOS DEL FORMULARIO DE PAGOS
  // =========================================================

  const cambiarCampoPago = (e) => {
    const { name, value } = e.target

    setFormularioPago((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  const cambiarModalidadPago = (modalidad) => {
    setFormularioPago((anterior) => ({
      ...anterior,
      modalidad,
      frecuencia:
        modalidad === 'unico'
          ? 'mensual'
          : anterior.frecuencia || 'mensual',
      pagoActual: modalidad === 'plazo' ? anterior.pagoActual || 1 : 1,
      totalPagos:
        modalidad === 'plazo' ? anterior.totalPagos : '',
    }))
  }
  // =========================================================
// DETALLE Y EDICIÓN DE PAGOS
// =========================================================

const abrirDetallePago = (pago) => {
  setPagoSeleccionado(pago)

  setFormularioEdicionPago({
    concepto: pago.concepto || '',
    monto: pago.monto || '',
    fechaVencimiento:
      pago.fechaVencimiento || '',
    categoria: pago.categoria || '',
    modalidad: pago.modalidad || 'unico',
    frecuencia:
      pago.frecuencia || 'mensual',
    pagoActual:
      pago.pagoActual || 1,
    totalPagos:
      pago.totalPagos || '',
  })

  setEditandoPago(false)
}

const cerrarDetallePago = () => {
  setPagoSeleccionado(null)
  setEditandoPago(false)
}

const cambiarCampoEdicionPago = (e) => {
  const { name, value } = e.target

  setFormularioEdicionPago((anterior) => ({
    ...anterior,
    [name]: value,
  }))
}

const cambiarModalidadEdicionPago = (modalidad) => {
  setFormularioEdicionPago((anterior) => ({
    ...anterior,

    modalidad,

    frecuencia:
      modalidad === 'unico'
        ? 'mensual'
        : anterior.frecuencia || 'mensual',

    pagoActual:
      modalidad === 'plazo'
        ? anterior.pagoActual || 1
        : 1,

    totalPagos:
      modalidad === 'plazo'
        ? anterior.totalPagos
        : '',
  }))
}

const guardarEdicionPago = (e) => {
  e.preventDefault()

  if (!pagoSeleccionado) return

  const monto =
    Number(formularioEdicionPago.monto)

  if (!monto || monto <= 0) {
    alert('Ingresa un monto válido.')
    return
  }

  if (
    !formularioEdicionPago.concepto.trim()
  ) {
    alert('Ingresa un concepto.')
    return
  }

  if (!formularioEdicionPago.categoria) {
    alert('Selecciona una categoría.')
    return
  }

  if (
    !formularioEdicionPago.fechaVencimiento
  ) {
    alert(
      'Selecciona una fecha de vencimiento.'
    )
    return
  }

  if (
    formularioEdicionPago.modalidad ===
    'plazo'
  ) {
    const actual =
      Number(
        formularioEdicionPago.pagoActual
      )

    const total =
      Number(
        formularioEdicionPago.totalPagos
      )

    if (
      !actual ||
      !total ||
      actual < 1 ||
      total < 1
    ) {
      alert(
        'Revisa el número de pagos.'
      )
      return
    }

    if (actual > total) {
      alert(
        'El pago actual no puede ser mayor al total de pagos.'
      )
      return
    }
  }

  const pagoActualizado = {
    ...pagoSeleccionado,

    concepto:
      formularioEdicionPago.concepto.trim(),

    monto,

    fechaVencimiento:
      formularioEdicionPago.fechaVencimiento,

    categoria:
      formularioEdicionPago.categoria,

    modalidad:
      formularioEdicionPago.modalidad,

    frecuencia:
      formularioEdicionPago.modalidad ===
      'unico'
        ? null
        : formularioEdicionPago.frecuencia,

    pagoActual:
      formularioEdicionPago.modalidad ===
      'plazo'
        ? Number(
            formularioEdicionPago.pagoActual
          )
        : null,

    totalPagos:
      formularioEdicionPago.modalidad ===
      'plazo'
        ? Number(
            formularioEdicionPago.totalPagos
          )
        : null,

    modificadoEn:
      new Date().toISOString(),
  }

  setPagos((anteriores) =>
    anteriores.map((pago) =>
      pago.id === pagoSeleccionado.id
        ? pagoActualizado
        : pago
    )
  )

  setPagoSeleccionado(
    pagoActualizado
  )

  setEditandoPago(false)
}
// =========================================================
// ELIMINAR / CANCELAR PAGO PENDIENTE
// =========================================================

const eliminarPagoSeleccionado = () => {
  if (!pagoSeleccionado) return

  if (pagoSeleccionado.estado !== 'pendiente') {
    alert(
      'Los pagos ya realizados no pueden eliminarse desde aquí.'
    )
    return
  }


  let mensaje =
    `¿Quieres eliminar "${pagoSeleccionado.concepto}" por ` +
    `${formatoDinero(pagoSeleccionado.monto)}?`

  if (
    pagoSeleccionado.modalidad === 'recurrente'
  ) {
    mensaje =
      `¿Quieres cancelar "${pagoSeleccionado.concepto}"?\n\n` +
      `Este pago pendiente será eliminado y no generará el siguiente vencimiento.\n\n` +
      `Los pagos realizados anteriormente se conservarán.`
  }

  if (
    pagoSeleccionado.modalidad === 'plazo'
  ) {
    mensaje =
      `¿Quieres cancelar el compromiso "${pagoSeleccionado.concepto}"?\n\n` +
      `Se eliminará el pago ${pagoSeleccionado.pagoActual} de ${pagoSeleccionado.totalPagos} que está pendiente y no se generarán los pagos siguientes.\n\n` +
      `Los pagos realizados anteriormente se conservarán.`
  }

  const confirmar =
    window.confirm(mensaje)

  if (!confirmar) return

  setPagos((anteriores) =>
    anteriores.filter(
      (pago) =>
        pago.id !== pagoSeleccionado.id
    )
  )

  cerrarDetallePago()
}
// =========================================================
// PAUSAR / REANUDAR PAGO RECURRENTE
// =========================================================

const pausarPagoSeleccionado = () => {
  if (!pagoSeleccionado) return

  if (
    pagoSeleccionado.estado !== 'pendiente' ||
    pagoSeleccionado.modalidad !== 'recurrente'
  ) {
    return
  }

  const confirmar = window.confirm(
    `¿Quieres pausar "${pagoSeleccionado.concepto}"?\n\n` +
    `Mientras esté pausado no contará como dinero comprometido y no generará nuevos vencimientos.\n\n` +
    `Podrás reanudarlo cuando quieras.`
  )

  if (!confirmar) return

  const pagoPausado = {
    ...pagoSeleccionado,
    estado: 'pausado',
    fechaPausa: new Date().toISOString().split('T')[0],
    pausadoEn: new Date().toISOString(),
  }

  setPagos((anteriores) =>
    anteriores.map((pago) =>
      pago.id === pagoSeleccionado.id
        ? pagoPausado
        : pago
    )
  )

  cerrarDetallePago()
}

const reanudarPago = (pagoPausado) => {
  if (!pagoPausado || pagoPausado.estado !== 'pausado') return

  const fechaSugerida = new Date().toISOString().split('T')[0]

  const nuevaFecha = window.prompt(
    `¿Cuál será el próximo vencimiento de "${pagoPausado.concepto}"?\n\n` +
    `Escribe la fecha en formato AAAA-MM-DD.`,
    fechaSugerida
  )

  if (nuevaFecha === null) return

  const fecha = nuevaFecha.trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    alert('Escribe una fecha válida con formato AAAA-MM-DD.')
    return
  }

  const [anio, mes, dia] = fecha.split('-').map(Number)
  const fechaValidacion = new Date(anio, mes - 1, dia)

  if (
    fechaValidacion.getFullYear() !== anio ||
    fechaValidacion.getMonth() !== mes - 1 ||
    fechaValidacion.getDate() !== dia
  ) {
    alert('La fecha indicada no existe.')
    return
  }

  const pagoReanudado = {
    ...pagoPausado,
    estado: 'pendiente',
    fechaVencimiento: fecha,
    fechaPausa: null,
    pausadoEn: null,
    reanudadoEn: new Date().toISOString(),
  }

  setPagos((anteriores) =>
    anteriores.map((pago) =>
      pago.id === pagoPausado.id
        ? pagoReanudado
        : pago
    )
  )
}

// =========================================================
// CANCELAR COMPROMISO
// =========================================================

const cancelarPagoSeleccionado = () => {
  if (!pagoSeleccionado) return

  if (pagoSeleccionado.estado !== 'pendiente') {
    alert(
      'Sólo se pueden cancelar pagos que estén pendientes.'
    )
    return
  }

  let mensaje =
    `¿Quieres cancelar "${pagoSeleccionado.concepto}"?\n\n` +
    `El compromiso dejará de afectar tu dinero disponible, ` +
    `pero permanecerá en tu historial.`

  if (
    pagoSeleccionado.modalidad === 'recurrente'
  ) {
    mensaje =
      `¿Quieres cancelar "${pagoSeleccionado.concepto}"?\n\n` +
      `Este compromiso dejará de estar pendiente y no generará ` +
      `el siguiente vencimiento.\n\n` +
      `El registro permanecerá en tu historial.`
  }

  if (
    pagoSeleccionado.modalidad === 'plazo'
  ) {
    mensaje =
      `¿Quieres cancelar "${pagoSeleccionado.concepto}"?\n\n` +
      `Se cancelará el pago ${pagoSeleccionado.pagoActual} de ` +
      `${pagoSeleccionado.totalPagos} y no se generarán los ` +
      `pagos siguientes.\n\n` +
      `Los pagos anteriores y este registro permanecerán ` +
      `en tu historial.`
  }

  const confirmar =
    window.confirm(mensaje)

  if (!confirmar) return

  const pagoCancelado = {
    ...pagoSeleccionado,

    estado: 'cancelado',

    fechaCancelacion:
      new Date()
        .toISOString()
        .split('T')[0],

    canceladoEn:
      new Date().toISOString(),
  }

  setPagos((anteriores) =>
    anteriores.map((pago) =>
      pago.id === pagoSeleccionado.id
        ? pagoCancelado
        : pago
    )
  )

  cerrarDetallePago()
}
  // =========================================================
  // GUARDAR PAGO
  // =========================================================

  const guardarPago = (e) => {
    e.preventDefault()

    const monto = Number(formularioPago.monto)

    if (!monto || monto <= 0) {
      alert('Ingresa un monto válido.')
      return
    }

    if (!formularioPago.concepto.trim()) {
      alert('Ingresa un concepto.')
      return
    }

    if (!formularioPago.categoria) {
      alert('Selecciona una categoría.')
      return
    }

    // Validación exclusiva para pagos a plazo
    if (formularioPago.modalidad === 'plazo') {
      const actual = Number(formularioPago.pagoActual)
      const total = Number(formularioPago.totalPagos)

      if (!actual || !total || actual < 1 || total < 1) {
        alert('Revisa el número de pagos.')
        return
      }

      if (actual > total) {
        alert(
          'El pago actual no puede ser mayor al total de pagos.'
        )
        return
      }
    }

    const nuevoPago = {
      id: crypto.randomUUID(),

      concepto: formularioPago.concepto.trim(),

      monto,

      fechaVencimiento:
        formularioPago.fechaVencimiento,

      categoria: formularioPago.categoria,

      modalidad: formularioPago.modalidad,

      frecuencia:
        formularioPago.modalidad === 'unico'
          ? null
          : formularioPago.frecuencia,

      pagoActual:
        formularioPago.modalidad === 'plazo'
          ? Number(formularioPago.pagoActual)
          : null,

      totalPagos:
        formularioPago.modalidad === 'plazo'
          ? Number(formularioPago.totalPagos)
          : null,

      estado: 'pendiente',

      fechaPago: null,

      creadoEn: new Date().toISOString(),
    }

    setPagos((anteriores) => [
      ...anteriores,
      nuevoPago,
    ])

    setFormularioPago({
      ...pagoInicial,
      fechaVencimiento:
        new Date().toISOString().split('T')[0],
    })

    setMostrarFormularioPago(false)
  }

  // =========================================================
  // CALCULAR SIGUIENTE FECHA
  // =========================================================

  const calcularSiguienteFecha = (fecha, frecuencia) => {
    const nuevaFecha = new Date(`${fecha}T12:00:00`)

    switch (frecuencia) {
      case 'semanal':
        nuevaFecha.setDate(
          nuevaFecha.getDate() + 7
        )
        break

      case 'quincenal':
        nuevaFecha.setDate(
          nuevaFecha.getDate() + 15
        )
        break

      case 'mensual':
        nuevaFecha.setMonth(
          nuevaFecha.getMonth() + 1
        )
        break

      case 'bimestral':
        nuevaFecha.setMonth(
          nuevaFecha.getMonth() + 2
        )
        break

      case 'trimestral':
        nuevaFecha.setMonth(
          nuevaFecha.getMonth() + 3
        )
        break

      case 'semestral':
        nuevaFecha.setMonth(
          nuevaFecha.getMonth() + 6
        )
        break

      case 'anual':
        nuevaFecha.setFullYear(
          nuevaFecha.getFullYear() + 1
        )
        break

      default:
        break
    }

    return nuevaFecha.toISOString().split('T')[0]
  }

  // =========================================================
  // MARCAR PAGO COMO PAGADO
  // =========================================================

  const marcarComoPagado = (pago) => {
  setPagoPorConfirmar(pago)
  setMetodoPagoConfirmacion('')
}

const confirmarPago = () => {
  if (!pagoPorConfirmar) return

  if (!metodoPagoConfirmacion) {
    alert('Selecciona el método con el que realizaste el pago.')
    return
  }

  const pago = pagoPorConfirmar

  
    const fechaHoy =
      new Date().toISOString().split('T')[0]

    // Al pagar un compromiso, automáticamente
    // se convierte en un gasto real.
    const nuevoMovimiento = {
      id: crypto.randomUUID(),
      tipo: 'gasto',
      monto: Number(pago.monto),
      concepto: pago.concepto,
      categoria: pago.categoria,
      metodoPago: metodoPagoConfirmacion,
      fecha: fechaHoy,
      creadoEn: new Date().toISOString(),
      origenPago: pago.id,
    }

    setMovimientos((anteriores) => [
      nuevoMovimiento,
      ...anteriores,
    ])

    setPagos((anteriores) => {
      // Primero marcamos el pago actual como pagado.
      const actualizados = anteriores.map(
        (pagoActual) =>
          pagoActual.id === pago.id
            ? {
                ...pagoActual,
                estado: 'pagado',
                fechaPago: fechaHoy,
              }
            : pagoActual
      )

      // =============================================
      // PAGO RECURRENTE
      // =============================================

      if (pago.modalidad === 'recurrente') {
        const siguientePago = {
          ...pago,

          id: crypto.randomUUID(),

          fechaVencimiento:
            calcularSiguienteFecha(
              pago.fechaVencimiento,
              pago.frecuencia
            ),

          estado: 'pendiente',

          fechaPago: null,

          creadoEn: new Date().toISOString(),

          pagoAnterior: pago.id,
        }

        return [
          ...actualizados,
          siguientePago,
        ]
      }

      // =============================================
      // PAGO A PLAZO
      // =============================================

      if (
        pago.modalidad === 'plazo' &&
        Number(pago.pagoActual) <
          Number(pago.totalPagos)
      ) {
        const siguientePago = {
          ...pago,

          id: crypto.randomUUID(),

          pagoActual:
            Number(pago.pagoActual) + 1,

          fechaVencimiento:
            calcularSiguienteFecha(
              pago.fechaVencimiento,
              pago.frecuencia
            ),

          estado: 'pendiente',

          fechaPago: null,

          creadoEn: new Date().toISOString(),

          pagoAnterior: pago.id,
        }

        return [
          ...actualizados,
          siguientePago,
        ]
      }

  // Si es pago único o llegó al último
// pago del plazo, no genera otro.
return actualizados
})

setPagoPorConfirmar(null)
setMetodoPagoConfirmacion('')
}

  // =========================================================
  // CÁLCULOS FINANCIEROS
  // =========================================================

  const ingresos = movimientos
    .filter(
      (movimiento) =>
        movimiento.tipo === 'ingreso'
    )
    .reduce(
      (total, movimiento) =>
        total + Number(movimiento.monto),
      0
    )

  const gastos = movimientos
    .filter(
      (movimiento) =>
        movimiento.tipo === 'gasto'
    )
    .reduce(
      (total, movimiento) =>
        total + Number(movimiento.monto),
      0
    )

  // Dinero que actualmente tenemos.
  const balance = ingresos - gastos

  // Sólo los pagos que todavía no han salido,
  // pero que ya tenemos comprometidos.
  const comprometido = pagos
    .filter(
      (pago) => pago.estado === 'pendiente'
    )
    .reduce(
      (total, pago) =>
        total + Number(pago.monto),
      0
    )

  // Este es el número importante:
  // cuánto dinero realmente podemos considerar libre.
  const disponibleReal =
    balance - comprometido

  const pagosPendientes = pagos
    .filter(
      (pago) => pago.estado === 'pendiente'
    )
    .sort(
      (a, b) =>
        new Date(
          `${a.fechaVencimiento}T12:00:00`
        ) -
        new Date(
          `${b.fechaVencimiento}T12:00:00`
        )
    )
    // =========================================================
// PAGOS URGENTES Y PRÓXIMOS 7 DÍAS
// =========================================================

const pagosProximos7Dias = pagosPendientes
  .map((pago) => ({
    ...pago,
    vencimiento: obtenerEstadoVencimiento(
      pago.fechaVencimiento
    ),
  }))
  .filter(
    (pago) =>
      pago.vencimiento.dias !== null &&
      pago.vencimiento.dias >= 0 &&
      pago.vencimiento.dias <= 7
  )
  .sort(
    (a, b) =>
      a.vencimiento.dias -
      b.vencimiento.dias
  )

const pagosVencidos = pagosPendientes
  .map((pago) => ({
    ...pago,
    vencimiento: obtenerEstadoVencimiento(
      pago.fechaVencimiento
    ),
  }))
  .filter(
    (pago) =>
      pago.vencimiento.dias !== null &&
      pago.vencimiento.dias < 0
  )

const montoProximos7Dias =
  pagosProximos7Dias.reduce(
    (total, pago) =>
      total + Number(pago.monto),
    0
  )

const montoVencido =
  pagosVencidos.reduce(
    (total, pago) =>
      total + Number(pago.monto),
    0
  )
  // =========================================================
// PAGOS QUE REQUIEREN AVISO
// =========================================================

const pagosConAviso = pagosPendientes
  .map((pago) => ({
    ...pago,
    vencimiento: obtenerEstadoVencimiento(
      pago.fechaVencimiento
    ),
  }))
  .filter((pago) => {
    if (!ajustes.recordatorios) {
      return false
    }

    const dias = pago.vencimiento.dias

    if (dias === null) {
      return false
    }

    // Los pagos vencidos siempre requieren atención.
    if (dias < 0) {
      return true
    }

    // El día del vencimiento depende de esta preferencia.
    if (dias === 0) {
      return ajustes.recordarVencimiento
    }

    // Avisos previos según la cantidad elegida en Ajustes.
    return (
      dias > 0 &&
      dias <= Number(ajustes.diasAnticipacion)
    )
  })
  .sort(
    (a, b) =>
      a.vencimiento.dias -
      b.vencimiento.dias
  )

const montoConAviso =
  pagosConAviso.reduce(
    (total, pago) =>
      total + Number(pago.monto),
    0
  )
    // =========================================================
// FILTROS DE MOVIMIENTOS
// =========================================================

const cambiarMesMovimientos = (cantidad) => {
  setMesMovimientos((anterior) => {
    const fecha = new Date(
      anterior.anio,
      anterior.mes + cantidad,
      1
    )

    return {
      anio: fecha.getFullYear(),
      mes: fecha.getMonth(),
    }
  })

  setBusquedaMovimiento('')
}

const nombreMesSeleccionado = new Intl.DateTimeFormat(
  'es-MX',
  {
    month: 'long',
    year: 'numeric',
  }
).format(
  new Date(
    mesMovimientos.anio,
    mesMovimientos.mes,
    1
  )
)
const movimientosDelMes = movimientos
  .filter((movimiento) => {
    if (!movimiento.fecha) return false

    const [anio, mes] = movimiento.fecha
      .split('-')
      .map(Number)

    return (
      anio === mesMovimientos.anio &&
      mes - 1 === mesMovimientos.mes
    )
  })
  .sort(
    (a, b) =>
      new Date(`${b.fecha}T12:00:00`) -
      new Date(`${a.fecha}T12:00:00`)
  )

const ingresosDelMes = movimientosDelMes
  .filter(
    (movimiento) =>
      movimiento.tipo === 'ingreso'
  )
  .reduce(
    (total, movimiento) =>
      total + Number(movimiento.monto),
    0
  )

const gastosDelMes = movimientosDelMes
  .filter(
    (movimiento) =>
      movimiento.tipo === 'gasto'
  )
  .reduce(
    (total, movimiento) =>
      total + Number(movimiento.monto),
    0
  )

const balanceDelMes =
  ingresosDelMes - gastosDelMes

const movimientosFiltrados = movimientosDelMes
  .filter((movimiento) => {
    if (filtroMovimientos === 'ingresos') {
      return movimiento.tipo === 'ingreso'
    }

    if (filtroMovimientos === 'gastos') {
      return movimiento.tipo === 'gasto'
    }

    return true
  })
  .filter((movimiento) => {
    const busqueda = busquedaMovimiento
      .trim()
      .toLowerCase()

    if (!busqueda) return true

    const concepto = movimiento.concepto
      .toLowerCase()

    const categoria = nombreCategoria(
      movimiento.categoria
    ).toLowerCase()

    return (
      concepto.includes(busqueda) ||
      categoria.includes(busqueda)
    )
  })

  const hoy = new Date()

// =========================================================
// CONTROL DEL MES ACTUAL
// =========================================================
const esMesActual =
  mesMovimientos.anio === hoy.getFullYear() &&
  mesMovimientos.mes === hoy.getMonth()
  // =========================================================
  // INTERFAZ
  // =========================================================

  return (
    <div className="app">
      {/* ================= HEADER ================= */}

      <header className="header">
        <div>
<p className="saludo">
  Buenos días
  {ajustes.nombre
    ? `, ${ajustes.nombre}`
    : ''}{' '}
  👋
</p>

          <h1>Mis Finanzas</h1>
        </div>

<div className="avatar">
  {ajustes.nombre
    ? ajustes.nombre.charAt(0).toUpperCase()
    : 'D'}
</div>
      </header>

      <main>
        {pantalla === 'inicio' && (
          <>
        {/* ================= BALANCE ================= */}

        <section className="balance">
          <p>Disponible realmente</p>

          <h2>
            {formatoDinero(disponibleReal)}
          </h2>

          <div className="detalle-balance">
            <div>
              <span>Saldo actual</span>

              <strong>
                {formatoDinero(balance)}
              </strong>
            </div>

            <div>
              <span>Comprometido</span>

              <strong>
                {formatoDinero(comprometido)}
              </strong>
            </div>
          </div>
        </section>

        {/* ================= RESUMEN ================= */}

        <section className="resumen">
          <div className="tarjeta ingreso">
            <span>↑</span>

            <div>
              <p>Ingresos</p>

              <strong>
                {formatoDinero(ingresos)}
              </strong>
            </div>
          </div>

          <div className="tarjeta gasto">
            <span>↓</span>

            <div>
              <p>Gastos</p>

              <strong>
                {formatoDinero(gastos)}
              </strong>
            </div>
          </div>
        </section>

        {/* ================= BOTÓN MOVIMIENTO ================= */}

        <button
          className="nuevo-movimiento"
          onClick={() =>
            setMostrarFormulario(true)
          }
        >
          + Registrar movimiento
        </button>

        {/* ================= MOVIMIENTOS ================= */}

        <section className="movimientos-recientes">
          <div className="titulo-seccion">
            <h3>
              Movimientos recientes
            </h3>

            <span className="contador-movimientos">
              {movimientos.length}
            </span>
          </div>

          {movimientos.length === 0 ? (
            <div className="sin-movimientos">
              <div className="icono-vacio">
                ↕
              </div>

              <h4>
                Aún no tienes movimientos
              </h4>

              <p>
                Los ingresos y gastos que registres
                aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="lista-movimientos">
              {movimientos
                .slice(0, 5)
                .map((movimiento) => (
                  <div
                    className="movimiento"
                    key={movimiento.id}
                  >
                    <div
                      className={`movimiento-icono ${
                        movimiento.tipo ===
                        'ingreso'
                          ? 'movimiento-ingreso'
                          : 'movimiento-gasto'
                      }`}
                    >
                      {movimiento.tipo ===
                      'ingreso'
                        ? '↑'
                        : '↓'}
                    </div>

                    <div className="movimiento-info">
                      <strong>
                        {movimiento.concepto}
                      </strong>

                      <span>
                        {nombreCategoria(
                          movimiento.categoria
                        )}

                        {' · '}

                        {formatoFecha(
                          movimiento.fecha
                        )}
                      </span>
                    </div>

                    <div className="movimiento-derecha">
                      <strong
                        className={
                          movimiento.tipo ===
                          'ingreso'
                            ? 'cantidad-ingreso'
                            : 'cantidad-gasto'
                        }
                      >
                        {movimiento.tipo ===
                        'ingreso'
                          ? '+'
                          : '-'}

                        {formatoDinero(
                          movimiento.monto
                        )}
                      </strong>


                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* ================= PRÓXIMOS PAGOS ================= */}

        {/* ================= AVISOS DE PAGOS ================= */}

{ajustes.recordatorios &&
  pagosConAviso.length > 0 && (
    <section className="aviso-pagos">
      <div className="aviso-pagos-icono">
        !
      </div>

      <div className="aviso-pagos-contenido">
        <span>
          Pagos que requieren atención
        </span>

        <strong>
          {formatoDinero(montoConAviso)}
        </strong>

        <p>
          {pagosConAviso.length === 1
            ? 'Tienes 1 pago dentro de tu periodo de aviso.'
            : `Tienes ${pagosConAviso.length} pagos dentro de tu periodo de aviso.`}
        </p>
      </div>
    </section>
  )}

        {/* ================= PRÓXIMOS 7 DÍAS ================= */}

<section className="resumen-vencimientos">
  <div className="cabecera-vencimientos">
    <div>
      <span>Próximos 7 días</span>

      <strong>
        {formatoDinero(montoProximos7Dias)}
      </strong>
    </div>

    <div className="contador-vencimientos">
      {pagosProximos7Dias.length}
    </div>
  </div>

  <p>
    {pagosProximos7Dias.length === 0
      ? 'No tienes pagos próximos durante los siguientes 7 días.'
      : pagosProximos7Dias.length === 1
        ? 'Tienes 1 pago próximo. Conviene mantener este dinero apartado.'
        : `Tienes ${pagosProximos7Dias.length} pagos próximos. Conviene mantener este dinero apartado.`}
  </p>

  {pagosVencidos.length > 0 && (
    <div className="alerta-vencidos">
      <div>
        <span>!</span>
      </div>

      <p>
        <strong>
          {pagosVencidos.length === 1
            ? '1 pago vencido'
            : `${pagosVencidos.length} pagos vencidos`}
        </strong>

        <span>
          {formatoDinero(montoVencido)} pendiente
        </span>
      </p>
    </div>
  )}
</section>

        <section className="pagos">
          <div className="titulo-seccion">
            <h3>Próximos pagos</h3>

            <button
              onClick={() =>
                setMostrarFormularioPago(true)
              }
            >
              + Agregar
            </button>
          </div>

          {pagosPendientes.length === 0 ? (
            <div className="sin-pagos">
              <div className="icono-calendario">
                📅
              </div>

              <h4>
                No tienes pagos pendientes
              </h4>

              <p>
                Agrega tus próximos pagos para saber
                cuánto dinero tienes realmente
                disponible.
              </p>
            </div>
          ) : (
            <div className="lista-pagos">
              {pagosPendientes
                .slice(0, 5)
                .map((pago) => (
                  <div
                    className="pago-item"
                    key={pago.id}
                  >
                    <div className="pago-fecha">
                      <span>
                        {
                          pago.fechaVencimiento.split(
                            '-'
                          )[2]
                        }
                      </span>

                      <small>
                        {new Date(
                          `${pago.fechaVencimiento}T12:00:00`
                        )
                          .toLocaleDateString(
                            'es-MX',
                            {
                              month: 'short',
                            }
                          )
                          .replace('.', '')}
                      </small>
                    </div>

                    <div className="pago-info">
                      <strong>
                        {pago.concepto}
                      </strong>

                      <span>
                        {nombreCategoria(
                          pago.categoria
                        )}

                        {pago.modalidad ===
                          'recurrente' && (
                          <> · Recurrente</>
                        )}

                        {pago.modalidad ===
                          'plazo' && (
                          <>
                            {' · '}
                            Pago{' '}
                            {pago.pagoActual}/
                            {pago.totalPagos}
                          </>
                        )}
                      </span>
                      <small
  className={`estado-vencimiento ${
    obtenerEstadoVencimiento(
      pago.fechaVencimiento
    ).tipo
  }`}
>
  {
    obtenerEstadoVencimiento(
      pago.fechaVencimiento
    ).texto
  }
</small>
                    </div>

                    <div className="pago-acciones">
                      <strong className="pago-monto">
                        {formatoDinero(
                          pago.monto
                        )}
                      </strong>

                      <button
                        className="boton-pagar"
                        onClick={() =>
                          marcarComoPagado(
                            pago
                          )
                        }
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>
                </>
      )}

      {pantalla === 'pagos' && (
        <section className="pantalla-pagos">
          <div className="cabecera-pantalla">
            <div>
              <p>Control de compromisos</p>
              <h2>Pagos</h2>
            </div>

            <button
              className="agregar-pago-pantalla"
              onClick={() => setMostrarFormularioPago(true)}
            >
              + Agregar
            </button>
          </div>

          <div className="resumen-pagos">
            <div>
              <span>Comprometido</span>
              <strong>{formatoDinero(comprometido)}</strong>
            </div>

            <div>
              <span>Pendientes</span>
              <strong>{pagosPendientes.length}</strong>
            </div>
          </div>

<div className="filtros-pagos">
  <button
    className={
      filtroPagos === 'pendientes'
        ? 'filtro-activo'
        : ''
    }
    onClick={() =>
      setFiltroPagos('pendientes')
    }
  >
    Pendientes
  </button>

  <button
    className={
      filtroPagos === 'pagados'
        ? 'filtro-activo'
        : ''
    }
    onClick={() =>
      setFiltroPagos('pagados')
    }
  >
    Pagados
  </button>

  <button
    className={
      filtroPagos === 'pausados'
        ? 'filtro-activo'
        : ''
    }
    onClick={() =>
      setFiltroPagos('pausados')
    }
  >
    Pausados
  </button>

  <button
    className={
      filtroPagos === 'cancelados'
        ? 'filtro-activo'
        : ''
    }
    onClick={() =>
      setFiltroPagos('cancelados')
    }
  >
    Cancelados
  </button>
</div>

          {filtroPagos === 'pendientes' ? (
            <>
              {pagosPendientes.length === 0 ? (
                <div className="sin-pagos">
                  <div className="icono-calendario">
                    📅
                  </div>

                  <h4>No tienes pagos pendientes</h4>

                  <p>
                    Tus compromisos futuros aparecerán aquí.
                  </p>
                </div>
              ) : (
                <div className="lista-pagos-completa">
                  {pagosPendientes.map((pago) => (
                    <div
  className="tarjeta-pago-completa"
  key={pago.id}
  onClick={() => abrirDetallePago(pago)}
  role="button"
  tabIndex="0"
>
                      <div className="pago-completo-superior">
                        <div>
                          <span className="etiqueta-pago">
                            {pago.modalidad === 'unico' &&
                              'Pago único'}

                            {pago.modalidad === 'recurrente' &&
                              'Recurrente'}

                            {pago.modalidad === 'plazo' &&
                              `Pago ${pago.pagoActual} de ${pago.totalPagos}`}
                          </span>

                          <h3>{pago.concepto}</h3>

                          <p>
                            {nombreCategoria(pago.categoria)}
                          </p>
                        </div>

                        <strong>
                          {formatoDinero(pago.monto)}
                        </strong>
                      </div>

                      <div className="detalle-pago-completo">
                        <div>
                          <span>Vencimiento</span>

                          <strong>
                            {formatoFecha(
                              pago.fechaVencimiento
                            )}
                          </strong>
                        </div>

                        {pago.modalidad === 'plazo' && (
                          <div>
                            <span>Restantes</span>

                            <strong>
                              {Math.max(
                                Number(pago.totalPagos) -
                                  Number(pago.pagoActual) +
                                  1,
                                0
                              )}{' '}
                              pagos
                            </strong>
                          </div>
                        )}
                      </div>

                      {pago.modalidad === 'plazo' && (
                        <div className="deuda-futura">
                          <span>
                            Saldo futuro aproximado
                          </span>

                          <strong>
                            {formatoDinero(
                              Number(pago.monto) *
                                Math.max(
                                  Number(pago.totalPagos) -
                                    Number(pago.pagoActual) +
                                    1,
                                  0
                                )
                            )}
                          </strong>
                        </div>
                      )}

                      <button
  className="boton-pagar-grande"
  onClick={(e) => {
    e.stopPropagation()
    marcarComoPagado(pago)
  }}
>
  ✓ Marcar como pagado
</button>
                    </div>
                  ))}
                </div>
              )}
            </>
                  ) : filtroPagos === 'pagados' ? (
            <div className="lista-pagos-completa">
              {pagos.filter(
                (pago) => pago.estado === 'pagado'
              ).length === 0 ? (
                <div className="sin-pagos">
                  <div className="icono-calendario">
                    ✓
                  </div>

                  <h4>
                    Aún no tienes pagos realizados
                  </h4>

                  <p>
                    Cuando marques un compromiso como
                    pagado, aparecerá en este historial.
                  </p>
                </div>
              ) : (
                pagos
                  .filter(
                    (pago) => pago.estado === 'pagado'
                  )
                  .sort(
                    (a, b) =>
                      new Date(b.fechaPago) -
                      new Date(a.fechaPago)
                  )
                  .map((pago) => (
                    <div
                      className="tarjeta-pago-completa pago-realizado"
                      key={pago.id}
                    >
                      <div className="pago-completo-superior">
                        <div>
                          <span className="etiqueta-pagado">
                            ✓ Pagado
                          </span>

                          <h3>{pago.concepto}</h3>

                          <p>
                            {nombreCategoria(
                              pago.categoria
                            )}

                            {pago.modalidad ===
                              'recurrente' &&
                              ' · Recurrente'}

                            {pago.modalidad ===
                              'plazo' &&
                              ` · Pago ${pago.pagoActual}/${pago.totalPagos}`}
                          </p>
                        </div>

                        <strong>
                          {formatoDinero(pago.monto)}
                        </strong>
                      </div>

                      <div className="fecha-pagado">
                        Pagado el{' '}
                        {formatoFecha(pago.fechaPago)}
                      </div>
                    </div>
                  ))
              )}
            </div>
          ) : filtroPagos === 'pausados' ? (
            <div className="lista-pagos-completa">
              {pagos.filter(
                (pago) => pago.estado === 'pausado'
              ).length === 0 ? (
                <div className="sin-pagos">
                  <div className="icono-calendario">
                    Ⅱ
                  </div>

                  <h4>No tienes pagos pausados</h4>

                  <p>
                    Los pagos recurrentes que pauses aparecerán aquí.
                  </p>
                </div>
              ) : (
                pagos
                  .filter(
                    (pago) => pago.estado === 'pausado'
                  )
                  .sort((a, b) =>
                    String(a.concepto).localeCompare(
                      String(b.concepto),
                      'es'
                    )
                  )
                  .map((pago) => (
                    <div
                      className="tarjeta-pago-completa"
                      key={pago.id}
                    >
                      <div className="pago-completo-superior">
                        <div>
                          <span className="etiqueta-cancelado">
                            Ⅱ Pausado
                          </span>

                          <h3>{pago.concepto}</h3>

                          <p>
                            {nombreCategoria(pago.categoria)}
                            {' · Recurrente'}
                          </p>
                        </div>

                        <strong>
                          {formatoDinero(pago.monto)}
                        </strong>
                      </div>

                      <button
                        type="button"
                        className="boton-pagar-grande"
                        onClick={() => reanudarPago(pago)}
                      >
                        Reanudar pago
                      </button>
                    </div>
                  ))
              )}
            </div>
          ) : (
  <div className="lista-pagos-completa">
    {pagos.filter(
      (pago) =>
        pago.estado === 'cancelado'
    ).length === 0 ? (
      <div className="sin-pagos">
        <div className="icono-calendario">
          ⊘
        </div>

        <h4>
          No tienes pagos cancelados
        </h4>

        <p>
          Los compromisos que canceles
          permanecerán aquí como parte de
          tu historial.
        </p>
      </div>
    ) : (
      pagos
        .filter(
          (pago) =>
            pago.estado === 'cancelado'
        )
        .sort(
          (a, b) =>
            new Date(
              b.fechaCancelacion
            ) -
            new Date(
              a.fechaCancelacion
            )
        )
        .map((pago) => (
          <div
            className="tarjeta-pago-completa pago-cancelado"
            key={pago.id}
          >
            <div className="pago-completo-superior">
              <div>
                <span className="etiqueta-cancelado">
                  ⊘ Cancelado
                </span>

                <h3>
                  {pago.concepto}
                </h3>

                <p>
                  {nombreCategoria(
                    pago.categoria
                  )}

                  {pago.modalidad ===
                    'recurrente' &&
                    ' · Recurrente'}

                  {pago.modalidad ===
                    'plazo' &&
                    ` · Pago ${pago.pagoActual}/${pago.totalPagos}`}
                </p>
              </div>

              <strong>
                {formatoDinero(
                  pago.monto
                )}
              </strong>
            </div>

            <div className="fecha-cancelado">
              Cancelado el{' '}
              {formatoFecha(
                pago.fechaCancelacion
              )}
            </div>
          </div>
        ))
    )}
  </div>
)}
        </section>
      )}

{pantalla === 'movimientos' && (
  <section className="pantalla-movimientos">
    <div className="cabecera-pantalla">
      <div>
        <p>Historial financiero</p>
        <h2>Movimientos</h2>
      </div>

      <button
        className="agregar-pago-pantalla"
        onClick={() => setMostrarFormulario(true)}
      >
        + Agregar
      </button>
    </div>
    <div className="selector-mes">
  <button
    onClick={() => cambiarMesMovimientos(-1)}
    title="Mes anterior"
  >
    ‹
  </button>

  <div>
    <span>Periodo</span>

    <strong>
      {nombreMesSeleccionado}
    </strong>
  </div>

  <button
  onClick={() => cambiarMesMovimientos(1)}
  disabled={esMesActual}
  title="Mes siguiente"
>
  ›
</button>
</div>

    {/* ================= RESUMEN ================= */}

    <div className="resumen-movimientos">
      <div className="resumen-movimiento-item">
        <span>Ingresos</span>

        <strong className="texto-ingreso">
          {formatoDinero(ingresosDelMes)}
        </strong>
      </div>

      <div className="resumen-movimiento-item">
        <span>Gastos</span>

        <strong className="texto-gasto">
          {formatoDinero(gastosDelMes)}
        </strong>
      </div>

      <div className="resumen-movimiento-item">
        <span>Balance</span>

        <strong>
          {formatoDinero(balanceDelMes)}
        </strong>
      </div>
    </div>

    {/* ================= BÚSQUEDA ================= */}

    <div className="buscador-movimientos">
      <span>⌕</span>

      <input
        type="text"
        value={busquedaMovimiento}
        onChange={(e) =>
          setBusquedaMovimiento(e.target.value)
        }
        placeholder="Buscar movimiento..."
      />

      {busquedaMovimiento && (
        <button
          onClick={() => setBusquedaMovimiento('')}
        >
          ×
        </button>
      )}
    </div>

    {/* ================= FILTROS ================= */}

    <div className="filtros-movimientos">
      <button
        className={
          filtroMovimientos === 'todos'
            ? 'filtro-movimiento-activo'
            : ''
        }
        onClick={() =>
          setFiltroMovimientos('todos')
        }
      >
        Todos
      </button>

      <button
        className={
          filtroMovimientos === 'ingresos'
            ? 'filtro-movimiento-activo'
            : ''
        }
        onClick={() =>
          setFiltroMovimientos('ingresos')
        }
      >
        Ingresos
      </button>

      <button
        className={
          filtroMovimientos === 'gastos'
            ? 'filtro-movimiento-activo'
            : ''
        }
        onClick={() =>
          setFiltroMovimientos('gastos')
        }
      >
        Gastos
      </button>
    </div>

    {/* ================= RESULTADOS ================= */}

    <div className="contador-resultados">
      <span>
        {movimientosFiltrados.length}{' '}
        {movimientosFiltrados.length === 1
          ? 'movimiento'
          : 'movimientos'}
      </span>
    </div>

    {movimientosFiltrados.length === 0 ? (
      <div className="sin-movimientos">
        <div className="icono-vacio">⌕</div>

        <h4>No encontramos movimientos</h4>

        <p>
          Prueba cambiando el filtro o la búsqueda.
        </p>
      </div>
    ) : (
      <div className="lista-movimientos-completa">
        {movimientosFiltrados.map((movimiento) => (
          <div
  className="movimiento-completo"
  key={movimiento.id}
  onClick={() => abrirDetalleMovimiento(movimiento)}
  role="button"
  tabIndex="0"
>
            <div
              className={`movimiento-icono ${
                movimiento.tipo === 'ingreso'
                  ? 'movimiento-ingreso'
                  : 'movimiento-gasto'
              }`}
            >
              {movimiento.tipo === 'ingreso'
                ? '↑'
                : '↓'}
            </div>

            <div className="movimiento-info">
              <strong>
                {movimiento.concepto}
              </strong>

              <span>
                {nombreCategoria(
                  movimiento.categoria
                )}

                {' · '}

                {formatoFecha(movimiento.fecha)}
              </span>

              {movimiento.origenPago && (
                <small className="origen-automatico">
                  Generado desde un pago
                </small>
              )}
            </div>

            <div className="movimiento-completo-derecha">
              <strong
                className={
                  movimiento.tipo === 'ingreso'
                    ? 'cantidad-ingreso'
                    : 'cantidad-gasto'
                }
              >
                {movimiento.tipo === 'ingreso'
                  ? '+'
                  : '-'}

                {formatoDinero(
                  movimiento.monto
                )}
              </strong>
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
)}

{pantalla === 'ajustes' && (
  <section className="pantalla-ajustes">
    <div className="cabecera-ajustes">
      <p>Configuración</p>
      <h2>Ajustes</h2>
    </div>

    {/* ================= MI PERFIL ================= */}

    <div className="grupo-ajustes">
      <h3>Mi perfil</h3>

      <div className="tarjeta-ajustes">
        <div className="ajuste-perfil">
          <div className="avatar-ajustes">
            {ajustes.nombre
              ? ajustes.nombre.charAt(0).toUpperCase()
              : 'D'}
          </div>

          <div>
            <span>Nombre</span>

            <input
              type="text"
              value={ajustes.nombre}
              onChange={(e) =>
                cambiarAjuste(
                  'nombre',
                  e.target.value
                )
              }
              placeholder="Tu nombre"
            />
          </div>
        </div>
      </div>
    </div>

    {/* ================= PREFERENCIAS ================= */}

    <div className="grupo-ajustes">
      <h3>Preferencias</h3>

      <div className="tarjeta-ajustes">
        <div className="fila-ajuste">
          <div>
            <strong>Moneda</strong>

            <span>
              Moneda principal de la aplicación
            </span>
          </div>

          <select
            value={ajustes.moneda}
            onChange={(e) =>
              cambiarAjuste(
                'moneda',
                e.target.value
              )
            }
          >
            <option value="MXN">
              MXN
            </option>
          </select>
        </div>

        <div className="separador-ajuste" />

        <div className="fila-ajuste">
          <div>
            <strong>Formato de fecha</strong>

            <span>
              Cómo quieres visualizar las fechas
            </span>
          </div>

          <select
            value={ajustes.formatoFecha}
            onChange={(e) =>
              cambiarAjuste(
                'formatoFecha',
                e.target.value
              )
            }
          >
            <option value="dd/mm/aaaa">
              DD/MM/AAAA
            </option>

            <option value="aaaa-mm-dd">
              AAAA-MM-DD
            </option>
          </select>
        </div>
      </div>
    </div>

    {/* ================= RECORDATORIOS ================= */}

    <div className="grupo-ajustes">
      <h3>Recordatorios</h3>

      <div className="tarjeta-ajustes">
        <div className="fila-ajuste">
          <div>
            <strong>
              Recordatorios de pagos
            </strong>

            <span>
              Preparar avisos antes de tus vencimientos
            </span>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={ajustes.recordatorios}
              onChange={(e) =>
                cambiarAjuste(
                  'recordatorios',
                  e.target.checked
                )
              }
            />

            <span className="slider" />
          </label>
        </div>

        {ajustes.recordatorios && (
          <>
            <div className="separador-ajuste" />

            <div className="fila-ajuste">
              <div>
                <strong>
                  Avisar con anticipación
                </strong>

                <span>
                  Días antes del vencimiento
                </span>
              </div>

              <select
                value={ajustes.diasAnticipacion}
                onChange={(e) =>
                  cambiarAjuste(
                    'diasAnticipacion',
                    Number(e.target.value)
                  )
                }
              >
                <option value={1}>
                  1 día
                </option>

                <option value={2}>
                  2 días
                </option>

                <option value={3}>
                  3 días
                </option>

                <option value={5}>
                  5 días
                </option>

                <option value={7}>
                  7 días
                </option>
              </select>
            </div>

            <div className="separador-ajuste" />

            <div className="fila-ajuste">
              <div>
                <strong>
                  Avisar el día del pago
                </strong>

                <span>
                  Recordatorio en la fecha de vencimiento
                </span>
              </div>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={
                    ajustes.recordarVencimiento
                  }
                  onChange={(e) =>
                    cambiarAjuste(
                      'recordarVencimiento',
                      e.target.checked
                    )
                  }
                />

                <span className="slider" />
              </label>
            </div>
          </>
        )}
      </div>

      <p className="nota-ajustes">
        Estas preferencias quedarán guardadas.
        Las notificaciones reales se activarán
        cuando preparemos la aplicación como PWA.
      </p>
    </div>

    {/* ================= MIS DATOS ================= */}

    <div className="grupo-ajustes">
      <h3>Mis datos</h3>

      <div className="tarjeta-ajustes">
        <button
          type="button"
          className="fila-ajuste boton-ajuste"
          onClick={exportarDatos}
        >
          <div>
            <strong>
              Exportar mis datos
            </strong>

            <span>
              Crear una copia de movimientos,
              pagos y configuración
            </span>
          </div>

          <span className="flecha-ajuste">
            ›
          </span>
        </button>
        <div className="separador-ajuste" />

<button
  type="button"
  className="fila-ajuste boton-ajuste"
  onClick={() =>
    inputRespaldoRef.current?.click()
  }
>
  <div>
    <strong>
      Importar respaldo
    </strong>

    <span>
      Restaurar información desde un archivo
      de FinanzasApp
    </span>
  </div>

  <span className="flecha-ajuste">
    ›
  </span>
</button>

<input
  ref={inputRespaldoRef}
  type="file"
  accept=".json,application/json"
  onChange={importarDatos}
  style={{ display: 'none' }}
/>
<div className="separador-ajuste" />

<button
  type="button"
  className="fila-ajuste boton-ajuste"
  onClick={() =>
    inputExcelRef.current?.click()
  }
>
  <div>
    <strong>
      Importar desde Excel
    </strong>

    <span>
      Migrar movimientos desde tu archivo de Excel
    </span>
  </div>

  <span className="flecha-ajuste">
    ›
  </span>
</button>

<input
  ref={inputExcelRef}
  type="file"
  accept=".xlsx,.xlsm,.xls"
  onChange={leerExcelParaImportacion}
  style={{ display: 'none' }}
/>
{vistaPreviaExcel && (
  <div
    style={{
      padding: '16px',
      margin: '10px 14px',
      background: '#f5f7fb',
      borderRadius: '14px',
    }}
  >
    <strong>
      Vista previa del Excel
    </strong>

    <div style={{ marginTop: '10px' }}>
      <p>
        Archivo: {vistaPreviaExcel.nombreArchivo}
      </p>

      <p>
        Filas encontradas:{' '}
        <strong>
          {vistaPreviaExcel.totalFilas}
        </strong>
      </p>

      <p>
        Movimientos válidos:{' '}
        <strong>
          {vistaPreviaExcel.filasValidas}
        </strong>
      </p>

      <p>
        Filas descartadas:{' '}
        <strong>
          {vistaPreviaExcel.filasDescartadas}
        </strong>
      </p>
      <p>
  Movimientos sin fecha:{' '}
  <strong>
    {vistaPreviaExcel.movimientosSinFecha}
  </strong>
</p>
<p>
  Posibles duplicados:{' '}
  <strong>
    {vistaPreviaExcel.posiblesDuplicados}
  </strong>
</p>

<p>
  Movimientos nuevos:{' '}
  <strong>
    {vistaPreviaExcel.movimientosNuevos}
  </strong>
</p>
<p>
  Registros idénticos encontrados:{' '}
  <strong>
    {vistaPreviaExcel.duplicadosDentroExcel}
  </strong>
  <br />
  <small>
    Se conservarán; pueden ser movimientos reales.
  </small>
</p>
<hr
  style={{
    margin: '16px 0',
    border: 'none',
    borderTop: '1px solid #ddd',
  }}
/>

<strong>
  Pagos recurrentes
</strong>

<p>
  Pagos encontrados:{' '}
  <strong>
    {vistaPreviaExcel.pagosEncontrados}
  </strong>
</p>

<p>
  Marcados como activos:{' '}
  <strong>
    {vistaPreviaExcel.pagosActivos}
  </strong>
</p>

<p>
  Activos ya completados:{' '}
  <strong>
    {vistaPreviaExcel.pagosCompletados}
  </strong>
</p>

<p>
  Pendientes para migrar:{' '}
  <strong>
    {vistaPreviaExcel.pagosParaMigrar}
  </strong>
</p>
<p>
  Recurrentes indefinidos:{' '}
  <strong>
    {vistaPreviaExcel.pagosRecurrentes}
  </strong>
</p>

<p>
  Pagos a plazo:{' '}
  <strong>
    {vistaPreviaExcel.pagosPlazo}
  </strong>
</p>

<p>
  Pagos con fecha válida:{' '}
  <strong>
    {vistaPreviaExcel.pagosConFecha}
  </strong>
</p>

<p>
  Pagos sin fecha:{' '}
  <strong>
    {vistaPreviaExcel.pagosSinFecha}
  </strong>
</p>

<p>
  Pagos vencidos:{' '}
  <strong>
    {vistaPreviaExcel.pagosVencidos}
  </strong>
</p>

<p>
  Pagos que ya existen en FinanzasApp:{' '}
  <strong>
    {vistaPreviaExcel.pagosYaExistentes}
  </strong>
</p>

<p>
  Pagos nuevos para importar:{' '}
  <strong>
    {vistaPreviaExcel.pagosNuevos}
  </strong>
</p>

<small>
  Los pagos a plazo se preparan con el siguiente número pendiente.
  Por ejemplo, 5 realizados de 30 se convierte en pago 6 de 30.
</small>
<button
  type="button"
  onClick={importarMovimientosDesdeExcel}
  style={{
    width: '100%',
    marginTop: '14px',
    padding: '12px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '700',
  }}
>
  Importar {vistaPreviaExcel.movimientosNuevos} movimientos
</button>

<button
  type="button"
  onClick={importarPagosDesdeExcel}
  disabled={vistaPreviaExcel.pagosNuevos === 0}
  style={{
    width: '100%',
    marginTop: '10px',
    padding: '12px',
    border: 'none',
    borderRadius: '10px',
    cursor:
      vistaPreviaExcel.pagosNuevos === 0
        ? 'default'
        : 'pointer',
    fontWeight: '700',
    opacity:
      vistaPreviaExcel.pagosNuevos === 0
        ? 0.55
        : 1,
  }}
>
  Importar {vistaPreviaExcel.pagosNuevos} pagos
</button>
    </div>
  </div>
)}

                <div className="separador-ajuste" />

        {/* ================= REINICIAR DATOS ================= */}

        <div
          className="fila-ajuste"
          onClick={reiniciarDatosFinancieros}
          style={{ cursor: 'pointer' }}
        >
          <div>
            <strong>
              Reiniciar datos financieros
            </strong>

            <span>
              Borra movimientos y pagos para comenzar desde cero
            </span>
          </div>

          <span
            style={{
              color: '#dc2626',
              fontWeight: '700',
            }}
          >
            Reiniciar
          </span>
        </div>

        <div className="separador-ajuste" />

        <div className="fila-ajuste">
          <div>
            <strong>
              Respaldo
            </strong>

            <span>
              Protege tu información financiera
            </span>
          </div>

          <span className="estado-proximamente">
            Próximamente
          </span>
        </div>
      </div>
    </div>

    {/* ================= FUNCIÓN FUTURA ================= */}

    <div className="grupo-ajustes">
      <h3>Funciones futuras</h3>

      <div className="tarjeta-ajustes">
        <div className="funcion-futura">
          <div className="icono-funcion-futura">
            ⇄
          </div>

          <div>
            <div className="titulo-funcion-futura">
              <strong>
                Espacio compartido
              </strong>

              <span>
                Opcional
              </span>
            </div>

            <p>
              En el futuro podrás crear un espacio
              independiente para compartir únicamente
              los gastos que tú decidas con otra
              persona.
            </p>

            <small>
              Tus finanzas personales permanecerán
              separadas.
            </small>
          </div>
        </div>
      </div>
    </div>

    <div className="version-app">
      FinanzasApp · Versión local
    </div>
  </section>
)}
      </main>

      {/* ================= MENÚ INFERIOR ================= */}

      <nav className="menu-inferior">
  <button
    className={pantalla === 'inicio' ? 'activo' : ''}
    onClick={() => setPantalla('inicio')}
  >
    <span>⌂</span>
    Inicio
  </button>

  <button
    className={pantalla === 'movimientos' ? 'activo' : ''}
    onClick={() => setPantalla('movimientos')}
  >
    <span>↕</span>
    Movimientos
  </button>

  <button
    className={pantalla === 'pagos' ? 'activo' : ''}
    onClick={() => setPantalla('pagos')}
  >
    <span>📅</span>
    Pagos
  </button>

  <button
    className={pantalla === 'ajustes' ? 'activo' : ''}
    onClick={() => setPantalla('ajustes')}
  >
    <span>⚙</span>
    Ajustes
  </button>
</nav>
{/* =====================================================
    MODAL: DETALLE DEL PAGO
    ===================================================== */}

{pagoSeleccionado && !editandoPago && (
  <div
    className="fondo-modal"
    onClick={cerrarDetallePago}
  >
    <div
      className="modal detalle-pago-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cabecera-modal">
        <div>
          <span className="subtitulo-modal">
            Detalle del pago
          </span>

          <h2>
            {pagoSeleccionado.concepto}
          </h2>
        </div>

        <button
          type="button"
          className="cerrar-modal"
          onClick={cerrarDetallePago}
        >
          ×
        </button>
      </div>

      <div className="monto-detalle-pago">
        {formatoDinero(
          pagoSeleccionado.monto
        )}
      </div>

      <div className="estado-detalle-pago">
        {
          obtenerEstadoVencimiento(
            pagoSeleccionado.fechaVencimiento
          ).texto
        }
      </div>

      <div className="datos-detalle-pago">
        <div>
          <span>Categoría</span>

          <strong>
            {nombreCategoria(
              pagoSeleccionado.categoria
            )}
          </strong>
        </div>

        <div>
          <span>Vencimiento</span>

          <strong>
            {formatoFecha(
              pagoSeleccionado.fechaVencimiento
            )}
          </strong>
        </div>

        <div>
          <span>Modalidad</span>

          <strong>
            {pagoSeleccionado.modalidad ===
              'unico' && 'Pago único'}

            {pagoSeleccionado.modalidad ===
              'recurrente' && 'Recurrente'}

            {pagoSeleccionado.modalidad ===
              'plazo' && 'A plazo'}
          </strong>
        </div>

        {pagoSeleccionado.modalidad ===
          'plazo' && (
          <div>
            <span>Progreso</span>

            <strong>
              Pago{' '}
              {pagoSeleccionado.pagoActual}{' '}
              de{' '}
              {pagoSeleccionado.totalPagos}
            </strong>
          </div>
        )}
      </div>

      {pagoSeleccionado.modalidad ===
        'plazo' && (
        <div className="saldo-futuro-detalle">
          <span>
            Saldo futuro aproximado
          </span>

          <strong>
            {formatoDinero(
              Number(
                pagoSeleccionado.monto
              ) *
                Math.max(
                  Number(
                    pagoSeleccionado.totalPagos
                  ) -
                    Number(
                      pagoSeleccionado.pagoActual
                    ) +
                    1,
                  0
                )
            )}
          </strong>

          <small>
            Incluye el pago actual y los
            pagos restantes.
          </small>
        </div>
      )}

      <button
        type="button"
        className="boton-editar-pago"
        onClick={() =>
          setEditandoPago(true)
        }
      >
        Editar pago
      </button>
      {pagoSeleccionado.estado === 'pendiente' &&
        pagoSeleccionado.modalidad === 'recurrente' && (
        <button
          type="button"
          className="boton-cancelar-compromiso"
          onClick={pausarPagoSeleccionado}
        >
          Pausar pago
        </button>
      )}
      <button
  type="button"
  className="boton-cancelar-compromiso"
  onClick={cancelarPagoSeleccionado}
>
  Cancelar compromiso
</button>
     <button
  type="button"
  className="boton-eliminar-pago"
  onClick={eliminarPagoSeleccionado}
>
  Eliminar pago
</button>
    </div>
  </div>
)}
{/* =====================================================
    MODAL: EDITAR PAGO
    ===================================================== */}

{pagoSeleccionado && editandoPago && (
  <div
    className="fondo-modal"
    onClick={cerrarDetallePago}
  >
    <div
      className="modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="cabecera-modal">
        <div>
          <span className="subtitulo-modal">
            Modificar compromiso
          </span>

          <h2>Editar pago</h2>
        </div>

        <button
          type="button"
          className="cerrar-modal"
          onClick={cerrarDetallePago}
        >
          ×
        </button>
      </div>

      <form
        className="formulario"
        onSubmit={guardarEdicionPago}
      >
        {/* ================= CONCEPTO ================= */}

        <label>
          Concepto

          <input
            type="text"
            name="concepto"
            value={
              formularioEdicionPago.concepto
            }
            onChange={
              cambiarCampoEdicionPago
            }
            placeholder="Ej. Refrigerador"
          />
        </label>

        {/* ================= MONTO ================= */}

        <label>
          Monto

          <input
            type="number"
            name="monto"
            min="0"
            step="0.01"
            value={
              formularioEdicionPago.monto
            }
            onChange={
              cambiarCampoEdicionPago
            }
            placeholder="0.00"
          />
        </label>

        {/* ================= VENCIMIENTO ================= */}

        <label>
          Fecha de vencimiento

          <input
            type="date"
            name="fechaVencimiento"
            value={
              formularioEdicionPago
                .fechaVencimiento
            }
            onChange={
              cambiarCampoEdicionPago
            }
          />
        </label>

{/* ================= CATEGORÍA ================= */}

<label>
  Categoría

  <select
    name="categoria"
    value={formularioEdicionPago.categoria}
    onChange={cambiarCampoEdicionPago}
    required
  >
    <option value="">
      Selecciona una categoría
    </option>

    {categoriasGasto.map((categoria) => (
      <option
        key={categoria.valor}
        value={categoria.valor}
      >
        {categoria.nombre}
      </option>
    ))}
  </select>
</label>

        {/* ================= MODALIDAD ================= */}

        <div className="campo-formulario">
          <span className="etiqueta-formulario">
            Tipo de pago
          </span>

          <div className="selector-modalidad-edicion">
            <button
              type="button"
              className={
                formularioEdicionPago.modalidad ===
                'unico'
                  ? 'activo'
                  : ''
              }
              onClick={() =>
                cambiarModalidadEdicionPago(
                  'unico'
                )
              }
            >
              Único
            </button>

            <button
              type="button"
              className={
                formularioEdicionPago.modalidad ===
                'recurrente'
                  ? 'activo'
                  : ''
              }
              onClick={() =>
                cambiarModalidadEdicionPago(
                  'recurrente'
                )
              }
            >
              Recurrente
            </button>

            <button
              type="button"
              className={
                formularioEdicionPago.modalidad ===
                'plazo'
                  ? 'activo'
                  : ''
              }
              onClick={() =>
                cambiarModalidadEdicionPago(
                  'plazo'
                )
              }
            >
              A plazo
            </button>
          </div>
        </div>

        {/* ================= FRECUENCIA ================= */}

        {formularioEdicionPago.modalidad !==
          'unico' && (
          <label>
            Frecuencia

            <select
              name="frecuencia"
              value={
                formularioEdicionPago.frecuencia
              }
              onChange={
                cambiarCampoEdicionPago
              }
            >
              <option value="semanal">
                Semanal
              </option>

              <option value="quincenal">
                Quincenal
              </option>

              <option value="mensual">
                Mensual
              </option>

              <option value="bimestral">
                Bimestral
              </option>

              <option value="trimestral">
                Trimestral
              </option>

              <option value="semestral">
                Semestral
              </option>

              <option value="anual">
                Anual
              </option>
            </select>
          </label>
        )}

        {/* ================= PAGOS A PLAZO ================= */}

        {formularioEdicionPago.modalidad ===
          'plazo' && (
          <div className="campos-plazo-edicion">
            <label>
              Pago actual

              <input
                type="number"
                name="pagoActual"
                min="1"
                value={
                  formularioEdicionPago.pagoActual
                }
                onChange={
                  cambiarCampoEdicionPago
                }
              />
            </label>

            <label>
              Total de pagos

              <input
                type="number"
                name="totalPagos"
                min="1"
                value={
                  formularioEdicionPago.totalPagos
                }
                onChange={
                  cambiarCampoEdicionPago
                }
              />
            </label>
          </div>
        )}

        {/* ================= ACCIONES ================= */}

        <div className="acciones-edicion-pago">
          <button
            type="button"
            className="cancelar-edicion-pago"
            onClick={() =>
              setEditandoPago(false)
            }
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="guardar-edicion-pago"
          >
            Guardar cambios
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* =====================================================
          MODAL: REGISTRAR MOVIMIENTO
          ===================================================== */}

      {mostrarFormulario && (
        <div className="fondo-modal">
          <div className="modal">
            <div className="modal-cabecera">
              <div>
                <p>Nuevo movimiento</p>

                <h2>
                  Registrar movimiento
                </h2>
              </div>

              <button
                className="cerrar-modal"
                onClick={() =>
                  setMostrarFormulario(false)
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={guardarMovimiento}
            >
              {/* TIPO */}

              <div className="selector-tipo">
                <button
                  type="button"
                  className={
                    formulario.tipo ===
                    'ingreso'
                      ? 'ingreso-activo'
                      : ''
                  }
                  onClick={() =>
                    cambiarTipo('ingreso')
                  }
                >
                  ↑ Ingreso
                </button>

                <button
                  type="button"
                  className={
                    formulario.tipo ===
                    'gasto'
                      ? 'gasto-activo'
                      : ''
                  }
                  onClick={() =>
                    cambiarTipo('gasto')
                  }
                >
                  ↓ Gasto
                </button>
              </div>

              {/* MONTO */}

              <div className="campo monto-campo">
                <label>Monto</label>

                <div className="entrada-monto">
                  <span>$</span>

                  <input
                    type="number"
                    name="monto"
                    value={formulario.monto}
                    onChange={cambiarCampo}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              {/* CONCEPTO */}

              <div className="campo">
                <label>Concepto</label>

                <input
                  type="text"
                  name="concepto"
                  value={
                    formulario.concepto
                  }
                  onChange={cambiarCampo}
                  placeholder={
                    formulario.tipo ===
                    'ingreso'
                      ? 'Ej. Sueldo'
                      : 'Ej. Supermercado'
                  }
                  required
                />
              </div>

            {/* CATEGORÍA */}

              <div className="campo">
                <label>Categoría</label>

                <select
                  name="categoria"
                  value={formulario.categoria}
                  onChange={cambiarCampo}
                  required
                >
                  <option value="">
                    Selecciona una categoría
                  </option>

                  {(formulario.tipo === 'ingreso'
                    ? categoriasIngreso
                    : categoriasGasto
                  ).map((categoria) => (
                    <option
                      key={categoria.valor}
                      value={categoria.valor}
                    >
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </div>
                        
              {/* MÉTODO DE PAGO */}

              <div className="campo">
                <label>Método de pago</label>

                <select
                  name="metodoPago"
                  value={formulario.metodoPago}
                  onChange={cambiarCampo}
                >
                  <option value="">
                    Selecciona un método
                  </option>

                  <option value="efectivo">
                    Efectivo
                  </option>

                  <option value="debito">
                    Débito
                  </option>

                  <option value="credito">
                    Tarjeta de crédito
                  </option>

                  <option value="transferencia">
                    Transferencia
                  </option>

                  <option value="nomina">
                    Nómina
                  </option>

                  <option value="otro">
                    Otro
                  </option>
                </select>
              </div>
              <div className="campo">
  <label>Notas (opcional)</label>

  <textarea
    name="notas"
    value={formulario.notas}
    onChange={cambiarCampo}
    placeholder="Agrega algún detalle sobre este movimiento"
    rows="3"
  />
</div>

              {/* FECHA */}

              <div className="campo">
                <label>Fecha</label>

                <input
                  type="date"
                  name="fecha"
                  value={formulario.fecha}
                  onChange={cambiarCampo}
                  required
                />
              </div>

              {/* BOTONES */}

              <div className="acciones-formulario">
                <button
                  type="button"
                  className="boton-cancelar"
                  onClick={() =>
                    setMostrarFormulario(
                      false
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="boton-guardar"
                >
                  Guardar movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MODAL: AGREGAR PRÓXIMO PAGO
          ===================================================== */}

      {mostrarFormularioPago && (
        <div className="fondo-modal">
          <div className="modal">
            <div className="modal-cabecera">
              <div>
                <p>Nuevo compromiso</p>

                <h2>
                  Agregar próximo pago
                </h2>
              </div>

              <button
                className="cerrar-modal"
                onClick={() =>
                  setMostrarFormularioPago(
                    false
                  )
                }
              >
                ×
              </button>
            </div>

            <form onSubmit={guardarPago}>
              {/* MODALIDAD */}

              <div className="campo">
                <label>
                  Tipo de pago
                </label>

                <div className="selector-modalidad">
                  <button
                    type="button"
                    className={
                      formularioPago.modalidad ===
                      'unico'
                        ? 'modalidad-activa'
                        : ''
                    }
                    onClick={() =>
                      cambiarModalidadPago(
                        'unico'
                      )
                    }
                  >
                    Único
                  </button>

                  <button
                    type="button"
                    className={
                      formularioPago.modalidad ===
                      'recurrente'
                        ? 'modalidad-activa'
                        : ''
                    }
                    onClick={() =>
                      cambiarModalidadPago(
                        'recurrente'
                      )
                    }
                  >
                    Recurrente
                  </button>

                  <button
                    type="button"
                    className={
                      formularioPago.modalidad ===
                      'plazo'
                        ? 'modalidad-activa'
                        : ''
                    }
                    onClick={() =>
                      cambiarModalidadPago(
                        'plazo'
                      )
                    }
                  >
                    A plazo
                  </button>
                </div>
              </div>

              {/* CONCEPTO */}

              <div className="campo">
                <label>Concepto</label>

                <input
                  type="text"
                  name="concepto"
                  value={
                    formularioPago.concepto
                  }
                  onChange={
                    cambiarCampoPago
                  }
                  placeholder="Ej. Internet"
                  required
                />
              </div>

              {/* MONTO */}

              <div className="campo monto-campo">
                <label>Monto</label>

                <div className="entrada-monto">
                  <span>$</span>

                  <input
                    type="number"
                    name="monto"
                    value={
                      formularioPago.monto
                    }
                    onChange={
                      cambiarCampoPago
                    }
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              {/* CATEGORÍA */}

<div className="campo">
  <label>Categoría</label>

  <select
    name="categoria"
    value={formularioPago.categoria}
    onChange={cambiarCampoPago}
    required
  >
    <option value="">
      Selecciona una categoría
    </option>

    {categoriasGasto.map((categoria) => (
      <option
        key={categoria.valor}
        value={categoria.valor}
      >
        {categoria.nombre}
      </option>
    ))}
  </select>
</div>

              {/* FECHA DE VENCIMIENTO */}

              <div className="campo">
                <label>
                  Fecha de vencimiento
                </label>

                <input
                  type="date"
                  name="fechaVencimiento"
                  value={
                    formularioPago.fechaVencimiento
                  }
                  onChange={
                    cambiarCampoPago
                  }
                  required
                />
              </div>

              {/* FRECUENCIA */}

              {formularioPago.modalidad !==
                'unico' && (
                <div className="campo">
                  <label>
                    Frecuencia
                  </label>

                  <select
                    name="frecuencia"
                    value={
                      formularioPago.frecuencia
                    }
                    onChange={
                      cambiarCampoPago
                    }
                  >
                    <option value="semanal">
                      Semanal
                    </option>

                    <option value="quincenal">
                      Quincenal
                    </option>

                    <option value="mensual">
                      Mensual
                    </option>

                    <option value="bimestral">
                      Bimestral
                    </option>

                    <option value="trimestral">
                      Trimestral
                    </option>

                    <option value="semestral">
                      Semestral
                    </option>

                    <option value="anual">
                      Anual
                    </option>
                  </select>
                </div>
              )}

              {/* PAGOS A PLAZO */}

              {formularioPago.modalidad ===
                'plazo' && (
                <div className="fila-pagos">
                  <div className="campo">
                    <label>
                      Pago actual
                    </label>

                    <input
                      type="number"
                      name="pagoActual"
                      value={
                        formularioPago.pagoActual
                      }
                      onChange={
                        cambiarCampoPago
                      }
                      min="1"
                      required
                    />
                  </div>

                  <div className="campo">
                    <label>
                      Total de pagos
                    </label>

                    <input
                      type="number"
                      name="totalPagos"
                      value={
                        formularioPago.totalPagos
                      }
                      onChange={
                        cambiarCampoPago
                      }
                      min="1"
                      placeholder="12"
                      required
                    />
                  </div>
                </div>
              )}

              {/* BOTONES */}

              <div className="acciones-formulario">
                <button
                  type="button"
                  className="boton-cancelar"
                  onClick={() =>
                    setMostrarFormularioPago(
                      false
                    )
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="boton-guardar"
                >
                  Guardar pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* =====================================================
    MODAL: DETALLE DEL MOVIMIENTO
    ===================================================== */}

{movimientoSeleccionado && (
  <div
    className="fondo-modal"
    onClick={cerrarDetalleMovimiento}
  >
    <div
      className="modal modal-detalle-movimiento"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-cabecera">
        <div>
          <p>Movimiento</p>

          <h2>
            {editandoMovimiento
              ? 'Editar movimiento'
              : 'Detalle del movimiento'}
          </h2>
        </div>

        <button
          className="cerrar-modal"
          onClick={cerrarDetalleMovimiento}
        >
          ×
        </button>
      </div>

      {!editandoMovimiento ? (
        <>
          {/* ================= DETALLE ================= */}

          <div className="detalle-movimiento-principal">
            <div
              className={`detalle-movimiento-icono ${
                movimientoSeleccionado.tipo === 'ingreso'
                  ? 'movimiento-ingreso'
                  : 'movimiento-gasto'
              }`}
            >
              {movimientoSeleccionado.tipo === 'ingreso'
                ? '↑'
                : '↓'}
            </div>

            <span>
              {movimientoSeleccionado.tipo === 'ingreso'
                ? 'Ingreso'
                : 'Gasto'}
            </span>

            <strong
              className={
                movimientoSeleccionado.tipo === 'ingreso'
                  ? 'cantidad-ingreso'
                  : 'cantidad-gasto'
              }
            >
              {movimientoSeleccionado.tipo === 'ingreso'
                ? '+'
                : '-'}

              {formatoDinero(
                movimientoSeleccionado.monto
              )}
            </strong>

            <h3>
              {movimientoSeleccionado.concepto}
            </h3>
          </div>

          <div className="detalle-movimiento-datos">
            <div>
              <span>Categoría</span>

              <strong>
                {nombreCategoria(
                  movimientoSeleccionado.categoria
                )}
              </strong>
            </div>

              <div>
              <span>Método de pago</span>

              <strong>
                {nombreMetodoPago(
                  movimientoSeleccionado.metodoPago
                )}
              </strong>
            </div>

            <div>
              <span>Fecha</span>

              <strong>
                {formatoFecha(
                  movimientoSeleccionado.fecha
                )}
              </strong>
            </div>
            {movimientoSeleccionado.notas && (
  <div>
    <span>Notas</span>

    <strong>
      {movimientoSeleccionado.notas}
    </strong>
  </div>
)}
          </div>

          {movimientoSeleccionado.origenPago && (
            <div className="aviso-movimiento-vinculado">
              <span>🔗</span>

              <div>
                <strong>
                  Movimiento vinculado
                </strong>

                <p>
                  Este gasto fue generado automáticamente
                  desde un pago realizado. Para mantener
                  correcta tu información financiera, no
                  puede editarse ni eliminarse desde aquí.
                </p>
              </div>
            </div>
          )}

          {!movimientoSeleccionado.origenPago && (
            <div className="acciones-detalle-movimiento">
              <button
                className="boton-eliminar-detalle"
                onClick={eliminarMovimientoSeleccionado}
              >
                Eliminar
              </button>

              <button
                className="boton-editar-detalle"
                onClick={() =>
                  setEditandoMovimiento(true)
                }
              >
                Editar
              </button>
            </div>
          )}
        </>
      ) : (
        /* ================= EDICIÓN ================= */

        <form onSubmit={guardarEdicionMovimiento}>
          <div className="selector-tipo">
            <button
              type="button"
              className={
                formularioEdicion.tipo === 'ingreso'
                  ? 'ingreso-activo'
                  : ''
              }
              onClick={() =>
                cambiarTipoEdicion('ingreso')
              }
            >
              ↑ Ingreso
            </button>

            <button
              type="button"
              className={
                formularioEdicion.tipo === 'gasto'
                  ? 'gasto-activo'
                  : ''
              }
              onClick={() =>
                cambiarTipoEdicion('gasto')
              }
            >
              ↓ Gasto
            </button>
          </div>

          <div className="campo monto-campo">
            <label>Monto</label>

            <div className="entrada-monto">
              <span>$</span>

              <input
                type="number"
                name="monto"
                value={formularioEdicion.monto}
                onChange={cambiarCampoEdicion}
                min="0.01"
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="campo">
            <label>Concepto</label>

            <input
              type="text"
              name="concepto"
              value={formularioEdicion.concepto}
              onChange={cambiarCampoEdicion}
              required
            />
          </div>

          <div className="campo">
            <label>Categoría</label>

            <select
              name="categoria"
              value={formularioEdicion.categoria}
              onChange={cambiarCampoEdicion}
              required
            >
              <option value="">
                Selecciona una categoría
              </option>

              {(formularioEdicion.tipo === 'ingreso'
                ? categoriasIngreso
                : categoriasGasto
              ).map((categoria) => (
                <option
                  key={categoria.valor}
                  value={categoria.valor}
                >
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
  <label>Método de pago</label>

  <select
    name="metodoPago"
    value={formularioEdicion.metodoPago}
    onChange={cambiarCampoEdicion}
  >
    <option value="">
      Sin especificar
    </option>

    <option value="efectivo">
      Efectivo
    </option>

    <option value="debito">
      Débito
    </option>

    <option value="credito">
      Tarjeta de crédito
    </option>

    <option value="transferencia">
      Transferencia
    </option>

    <option value="nomina">
      Nómina
    </option>

    <option value="otro">
      Otro
    </option>
  </select>
</div>
<div className="campo">
  <label>Notas (opcional)</label>

  <textarea
    name="notas"
    value={formularioEdicion.notas}
    onChange={cambiarCampoEdicion}
    placeholder="Agrega algún detalle sobre este movimiento"
    rows="3"
  />
</div>

          <div className="campo">
            <label>Fecha</label>

            <input
              type="date"
              name="fecha"
              value={formularioEdicion.fecha}
              onChange={cambiarCampoEdicion}
              required
            />
          </div>

          <div className="acciones-formulario">
            <button
              type="button"
              className="boton-cancelar"
              onClick={() =>
                setEditandoMovimiento(false)
              }
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="boton-guardar"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      )}
    </div>
  </div>
)}
{/* =====================================================
    MODAL: CONFIRMAR PAGO
===================================================== */}

{pagoPorConfirmar && (
  <div
    className="fondo-modal"
    onClick={() => {
      setPagoPorConfirmar(null)
      setMetodoPagoConfirmacion('')
    }}
  >
    <div
      className="modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-cabecera">
        <div>
          <p>Registrar pago</p>
          <h2>Confirmar pago</h2>
        </div>

        <button
          type="button"
          className="cerrar-modal"
          onClick={() => {
            setPagoPorConfirmar(null)
            setMetodoPagoConfirmacion('')
          }}
        >
          ×
        </button>
      </div>

      <div className="detalle-movimiento-principal">
        <span>
          Vas a registrar como pagado
        </span>

        <strong className="cantidad-gasto">
          -{formatoDinero(pagoPorConfirmar.monto)}
        </strong>

        <h3>
          {pagoPorConfirmar.concepto}
        </h3>
      </div>

      <div className="campo">
        <label>Método de pago</label>

        <select
          value={metodoPagoConfirmacion}
          onChange={(e) =>
            setMetodoPagoConfirmacion(e.target.value)
          }
        >
          <option value="">
            Selecciona cómo pagaste
          </option>

          <option value="efectivo">
            Efectivo
          </option>

          <option value="debito">
            Débito
          </option>

          <option value="credito">
            Tarjeta de crédito
          </option>

          <option value="transferencia">
            Transferencia
          </option>

          <option value="nomina">
            Nómina
          </option>

          <option value="otro">
            Otro
          </option>
        </select>
      </div>

      <div className="acciones-formulario">
        <button
          type="button"
          className="boton-cancelar"
          onClick={() => {
            setPagoPorConfirmar(null)
            setMetodoPagoConfirmacion('')
          }}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="boton-guardar"
          onClick={confirmarPago}
        >
          Confirmar pago
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  )
}

export default App