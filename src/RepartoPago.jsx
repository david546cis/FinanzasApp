import { useCallback, useEffect, useMemo, useState } from 'react'

import { supabase } from './lib/supabase.js'

const mx = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0)

const card = { background: '#f8fafc', border: '1px solid #dce5f0', borderRadius: 13, padding: 13, marginTop: 12 }

const field = { width: '100%', padding: 10, border: '1px solid #cbd5e1', borderRadius: 9, marginTop: 5, boxSizing: 'border-box' }

const btn = { border: 0, borderRadius: 9, padding: '10px 12px', background: '#214d8b', color: 'white', fontWeight: 600, cursor: 'pointer' }

const modoTexto = m => m === 'igual' ? 'Partes iguales' : m === 'ingresos' ? 'Según ingresos' : 'Porcentajes manuales'

const cents = n => Math.round((Number(n) || 0) * 100)

export default function RepartoPago({ pago, espacioId, userId, integrantes = [], inicialmenteAbierto = false }) {

  const [acuerdos, setAcuerdos] = useState([])

  const [cuotas, setCuotas] = useState([])

  const [aportes, setAportes] = useState([])

  const [porcentajes, setPorcentajes] = useState([])

  const [modo, setModo] = useState('igual')

  const [manual, setManual] = useState({})

  const [cantidad, setCantidad] = useState('')

  const [nota, setNota] = useState('')

  const [motivo, setMotivo] = useState('')

  const [ocupado, setOcupado] = useState(false)

  const [cargando, setCargando] = useState(true)

  const [error, setError] = useState('')

  const [mensaje, setMensaje] = useState('')

  const [abierto, setAbierto] = useState(inicialmenteAbierto)

  const [editando, setEditando] = useState(false)

  const [verHistorial, setVerHistorial] = useState(false)

  const [nombres, setNombres] = useState({})

  useEffect(() => {
    setAcuerdos([])
    setCuotas([])
    setAportes([])
    setCantidad('')
    setNota('')
    setMotivo('')
    setEditando(false)
    setVerHistorial(false)
    setError('')
    setMensaje('')
  }, [pago?.id, pago?.fecha_vencimiento])

  const compromisoCancelado = pago?.estado === 'cancelado'
  const compromisoCerrado = pago?.estado !== 'pendiente'
  const vencimientoActual = pago?.fecha_vencimiento

  const reparto = useMemo(() => acuerdos.find(r => r.estado === 'activo') || null, [acuerdos])

  const anteriores = useMemo(() => acuerdos.filter(r => r.estado === 'cancelado'), [acuerdos])

  const cuotasActuales = useMemo(() => cuotas.filter(c => c.reparto_id === reparto?.id), [cuotas, reparto])

  const miCuota = cuotasActuales.find(c => c.user_id === userId)

  const cuotaPorId = useMemo(() => Object.fromEntries(cuotas.map(c => [c.id, c])), [cuotas])

  const totalPorUsuario = useMemo(() => {

    const resultado = {}

    for (const a of aportes) {

      if (a.es_prueba === true) continue

      const id = cuotaPorId[a.cuota_id]?.user_id

      if (id) resultado[id] = (resultado[id] || 0) + cents(a.monto)

    }

    return resultado

  }, [aportes, cuotaPorId])

  const totalPruebas = useMemo(() => aportes.filter(a => a.es_prueba === true).reduce((suma, a) => suma + cents(a.monto), 0) / 100, [aportes])

  const aportado = id => (totalPorUsuario[id] || 0) / 100

  const pendiente = c => Math.max(0, cents(c.monto_asignado) - (totalPorUsuario[c.user_id] || 0)) / 100

  const tieneHistorial = anteriores.length > 0 || Boolean(reparto?.reparto_anterior_id)

  const tieneAportes = aportes.length > 0

  const nombreDe = id => nombres[id] || (id === userId ? 'Tú' : `Integrante ${String(id || '').slice(0, 8)}`)

  useEffect(() => {

    let vigente = true

    setNombres({})

    if (!espacioId) return undefined

    supabase.rpc('nombres_integrantes_espacio', { p_espacio_id: espacioId }).then(({ data, error: e }) => {

      if (!vigente) return

      if (e) setError(e.message)

      else setNombres(Object.fromEntries((data || []).map(x => [x.user_id, x.nombre?.trim() || ''])))

    })

    return () => { vigente = false }

  }, [espacioId])

  const cargar = useCallback(async () => {

    if (!pago?.id || !pago?.fecha_vencimiento) return

    const { data: r, error: er } = await supabase.from('repartos_pagos_compartidos')

      .select('*').eq('pago_id', pago.id).eq('fecha_vencimiento', pago.fecha_vencimiento)

      .order('creado_en', { ascending: false })

    if (er) throw er

    const acuerdosNuevos = r || []

    const activos = acuerdosNuevos.filter(x => x.estado === 'activo')

    if (activos.length > 1) throw Error('Se detectaron varios acuerdos activos. Contacta a soporte.')

    const ids = acuerdosNuevos.map(x => x.id)

    let nuevasCuotas = []

    let nuevosAportes = []

    if (ids.length) {

      const { data: c, error: ec } = await supabase.from('cuotas_reparto_compartido').select('*').in('reparto_id', ids)

      if (ec) throw ec

      nuevasCuotas = c || []

      if (nuevasCuotas.length) {

        const { data: a, error: ea } = await supabase.from('aportaciones_reparto_compartido')

          .select('*').in('cuota_id', nuevasCuotas.map(x => x.id)).order('creado_en', { ascending: false })

        if (ea) throw ea

        nuevosAportes = a || []

      }

    }

    setAcuerdos(acuerdosNuevos)

    setCuotas(nuevasCuotas)

    setAportes(nuevosAportes)

  }, [pago?.id, pago?.fecha_vencimiento])

  useEffect(() => {

    let vigente = true

    setCargando(true)

    cargar().catch(e => { if (vigente) setError(e.message) }).finally(() => { if (vigente) setCargando(false) })

    return () => { vigente = false }

  }, [cargar])

  useEffect(() => {

    if (!abierto || !espacioId) return

    let vigente = true

    supabase.rpc('porcentajes_ingresos_espacio', { p_espacio_id: espacioId }).then(({ data, error: e }) => {

      if (!vigente) return

      if (e) setError(e.message)

      else setPorcentajes(data || [])

    })

    return () => { vigente = false }

  }, [abierto, espacioId, editando])

  const ejecutar = async (fn, exito = 'Operación guardada correctamente.') => {

    setOcupado(true); setError(''); setMensaje('')

    try { await fn(); await cargar(); setMensaje(exito) }

    catch (e) { setError(e.message || 'No se pudo guardar') }

    finally { setOcupado(false) }

  }

  const parametros = () => {

    const ids = integrantes.map(i => i.user_id)

    if (ids.length < 2) throw Error('Se requieren al menos dos integrantes.')

    let p = null

    if (modo === 'manual') {

      const valores = ids.map(id => manual[id] == null || manual[id] === '' ? NaN : Number(manual[id]))

      if (valores.some(v => !Number.isFinite(v) || v < 0 || v > 100 || Math.round(v * 10000) !== v * 10000) || Math.abs(valores.reduce((a, b) => a + b, 0) - 100) > 0.000001) {

        throw Error('Los porcentajes deben tener hasta 4 decimales y sumar 100%.')

      }

      p = Object.fromEntries(ids.map((id, i) => [id, valores[i]]))

    }

    if (modo === 'ingresos' && (!porcentajes.length || porcentajes.some(x => !x.configurado))) {

      throw Error('Todos deben registrar sus ingresos antes del reparto proporcional.')

    }

    return p

  }

  const iniciarEdicion = () => {

    if (!reparto || compromisoCerrado) return

    setModo(reparto.modalidad)

    setManual(Object.fromEntries(cuotasActuales.map(c => [c.user_id, String(c.porcentaje)])))

    setMotivo('')

    setError(''); setMensaje(''); setEditando(true)

  }

  const guardar = () => ejecutar(async () => {

    if (compromisoCerrado) throw Error('Este compromiso ya no está pendiente.')

    if (!reparto) throw Error('No existe un acuerdo activo.')

    const p = parametros()

    if (tieneAportes || tieneHistorial) {

      if (motivo.trim().length < 5 || motivo.trim().length > 500) throw Error('Escribe un motivo de 5 a 500 caracteres.')

      const { error: e } = await supabase.rpc('sustituir_reparto_compartido', {

        p_reparto_id: reparto.id, p_motivo: motivo.trim(), p_modalidad: modo, p_porcentajes_manuales: p

      })

      if (e) throw e

    } else {

      const { error: e } = await supabase.rpc('modificar_reparto_sin_aportaciones', {

        p_pago_id: pago.id, p_modalidad: modo, p_porcentajes_manuales: p

      })

      if (e) throw e

    }

    setEditando(false); setMotivo('')

  }, 'Distribución actualizada correctamente.')

  const crear = () => ejecutar(async () => {

    if (compromisoCerrado) throw Error('Este compromiso ya no está pendiente.')

    if (anteriores.length) throw Error('Este vencimiento tiene historial cancelado. No puede crearse directamente otro reparto.')

    const { error: e } = await supabase.rpc('crear_reparto_pago_compartido', {

      p_pago_id: pago.id, p_fecha_vencimiento: pago.fecha_vencimiento,

      p_modalidad: modo, p_porcentajes_manuales: parametros()

    })

    if (e) throw e

  })

  const aportar = () => ejecutar(async () => {

    if (compromisoCerrado) throw Error('Este compromiso ya no está pendiente.')

    if (!miCuota) throw Error('No se encontró tu cuota.')

    const monto = Number(cantidad)

    if (!Number.isFinite(monto) || monto <= 0 || !/^(?:\d+)(?:\.\d{1,2})?$/.test(cantidad.trim())) throw Error('Escribe un importe válido con hasta dos decimales.')

    if (cents(monto) > cents(pendiente(miCuota))) throw Error('La aportación excede tu saldo pendiente real.')

    const { error: e } = await supabase.rpc('registrar_aportacion_reparto', {

      p_cuota_id: miCuota.id, p_monto: monto, p_nota: nota.trim()

    })

    if (e) throw e

    setCantidad(''); setNota('')

  }, 'Aportación registrada correctamente.')

  const formulario = () => <>

    <label style={{ display: 'block', marginTop: 10 }}>Modalidad

      <select style={field} value={modo} onChange={e => setModo(e.target.value)}>

        <option value="igual">Partes iguales</option>

        <option value="ingresos">Proporcional a ingresos</option>

        <option value="manual">Porcentajes manuales</option>

      </select>

    </label>

    {modo === 'ingresos' && <div style={{ marginTop: 10 }}>

      {!porcentajes.length ? 'Consultando porcentajes…' : porcentajes.some(x => !x.configurado) ? 'Falta configurar el ingreso de un integrante.' : porcentajes.map(x => <p key={x.user_id}>{nombreDe(x.user_id)} · {Number(x.porcentaje).toFixed(2)}%</p>)}

    </div>}

    {modo === 'manual' && integrantes.map(i => <label key={i.user_id} style={{ display: 'block', marginTop: 9 }}>

      {nombreDe(i.user_id)} · porcentaje

      <input style={field} type="number" min="0" max="100" step="0.0001" value={manual[i.user_id] ?? ''} onChange={e => setManual(m => ({ ...m, [i.user_id]: e.target.value }))} />

    </label>)}

  </>

  return <div style={card}>

    <button type="button" style={{ ...btn, background: '#e8f0fc', color: '#214d8b', width: '100%' }} onClick={() => setAbierto(v => !v)}>

      {abierto ? 'Ocultar distribución' : 'Distribuir pago / Ver aportaciones'}

    </button>

    {abierto && <div style={{ marginTop: 12, fontSize: 13 }}>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}

      {mensaje && <p role="status" style={{ color: '#15803d' }}>{mensaje}</p>}

      {compromisoCerrado && <p style={{ color: '#92400e' }}><strong>Compromiso {pago?.estado === 'pagado' ? 'pagado' : 'cancelado'}.</strong> Los acuerdos y aportaciones anteriores permanecen disponibles solo para consulta.</p>}

      {cargando ? <p>Consultando acuerdos…</p> : <>

        {!reparto && !compromisoCerrado && (

          anteriores.length > 0

            ? <p style={{ color: '#92400e' }}>Este vencimiento tiene acuerdos cancelados y no tiene uno activo. La creación directa está bloqueada; requiere revisión.</p>

            : <>

                <p>Vencimiento <strong>{vencimientoActual}</strong>: todavía no tiene distribución. Crea el acuerdo de este periodo; las aportaciones de vencimientos anteriores permanecen en su historial y no se transfieren.</p><p>Elige cómo repartir <strong>{mx(pago.monto)}</strong> para este vencimiento.</p>

                {formulario()}

                <button type="button" style={{ ...btn, marginTop: 12 }} disabled={ocupado || (modo === 'ingresos' && (!porcentajes.length || porcentajes.some(x => !x.configurado)))} onClick={crear}>Confirmar distribución</button>

              </>

        )}

        {reparto && <>

          <p><strong>Vencimiento:</strong> {vencimientoActual}<br/><strong>Acuerdo:</strong> {modoTexto(reparto.modalidad)} · {mx(reparto.monto_total)}</p>

          {!editando && !compromisoCerrado && <button type="button" style={{ ...btn, background: '#e8f0fc', color: '#214d8b', marginBottom: 10 }} disabled={ocupado} onClick={iniciarEdicion}>

            {tieneAportes || tieneHistorial ? 'Cambiar acuerdo conservando historial' : 'Modificar distribución'}

          </button>}

          {editando && !compromisoCerrado && <div style={{ padding: 12, border: '1px solid #b6c9e4', borderRadius: 12, background: '#fff', marginBottom: 12 }}>

            <strong>{tieneAportes || tieneHistorial ? 'Sustituir acuerdo (se conserva el historial)' : 'Modificar distribución'}</strong>

            {formulario()}

            {(tieneAportes || tieneHistorial) && <>

              <p style={{ color: '#475569' }}>Las aportaciones anteriores seguirán reconocidas. La nueva cuota de cada persona no puede ser menor que lo ya aportado.</p>

              <label style={{ display: 'block', marginTop: 9 }}>Motivo del cambio

                <input style={field} value={motivo} maxLength={500} onChange={e => setMotivo(e.target.value)} placeholder="Por ejemplo: Ajuste acordado entre integrantes" />

              </label>

            </>}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>

              <button type="button" style={btn} disabled={ocupado || (modo === 'ingresos' && (!porcentajes.length || porcentajes.some(x => !x.configurado)))} onClick={guardar}>

                {tieneAportes || tieneHistorial ? 'Confirmar sustitución' : 'Guardar distribución'}

              </button>

              <button type="button" style={{ ...btn, background: '#e2e8f0', color: '#334155' }} disabled={ocupado} onClick={() => setEditando(false)}>Volver sin guardar</button>

            </div>

          </div>}

          {cuotasActuales.map(c => <div key={c.id} style={{ borderTop: '1px solid #e2e8f0', padding: '9px 0' }}>

            <strong>{nombreDe(c.user_id)}</strong> · {Number(c.porcentaje).toFixed(2)}%

            <div>Debe: {mx(c.monto_asignado)} · Aportaciones reales (incluye acuerdos anteriores): {mx(aportado(c.user_id))}</div>

            <div style={{ color: '#64748b' }}>Pendiente: {mx(pendiente(c))}</div>

          </div>)}

          {!compromisoCerrado && miCuota && pendiente(miCuota) > 0 && <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>

            <strong>Registrar mi aportación</strong>

              <p style={{ color: '#64748b' }}>Este registro no mueve dinero del fondo ni marca la renta como pagada.</p>

            <label style={{ display: 'block', marginTop: 9 }}>Importe (máximo {mx(pendiente(miCuota))})

              <input style={field} type="number" min="0.01" max={pendiente(miCuota)} step="0.01" value={cantidad} onChange={e => setCantidad(e.target.value)} />

            </label>

            <label style={{ display: 'block', marginTop: 9 }}>Nota (opcional)

              <input style={field} maxLength={500} value={nota} onChange={e => setNota(e.target.value)} />

            </label>

            <button type="button" style={{ ...btn, marginTop: 10 }} disabled={ocupado} onClick={aportar}>Registrar aportación</button>

          </div>}

        </>}

        {aportes.length > 0 && <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 12, paddingTop: 10 }}>

          <strong>Historial de aportaciones</strong>

            {totalPruebas > 0 && <p style={{ color: '#92400e' }}>Registros de prueba: {mx(totalPruebas)}. No se incluyen en el pendiente real.</p>}

          {aportes.map(a => <p key={a.id} style={{ margin: '7px 0', color: '#475569' }}>

            {nombreDe(cuotaPorId[a.cuota_id]?.user_id)} · +{mx(a.monto)} {a.es_prueba === true ? '· PRUEBA (no cuenta como dinero real)' : '· Registro real'} · {a.fecha}{a.nota ? ` · ${a.nota}` : ''}

            {cuotaPorId[a.cuota_id]?.reparto_id !== reparto?.id ? ' · Acuerdo anterior' : ''}

          </p>)}

        </div>}

        {anteriores.length > 0 && <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 12, paddingTop: 10 }}>

          <button type="button" style={{ ...btn, background: '#e8f0fc', color: '#214d8b' }} onClick={() => setVerHistorial(v => !v)}>

            {verHistorial ? 'Ocultar acuerdos anteriores' : `Ver acuerdos anteriores (${anteriores.length})`}

          </button>

          {verHistorial && anteriores.map(r => <div key={r.id} style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>

            <strong>{modoTexto(r.modalidad)}</strong> · {mx(r.monto_total)} · Cancelado

            <div>Motivo: {r.motivo_cancelacion || 'Sin motivo registrado'}</div>

            {cuotas.filter(c => c.reparto_id === r.id).map(c => <div key={c.id} style={{ color: '#64748b' }}>{nombreDe(c.user_id)}: {mx(c.monto_asignado)}</div>)}

          </div>)}

        </div>}

        <p style={{ fontSize: 11, color: '#64748b' }}>Las aportaciones al reparto no ingresan automáticamente dinero al fondo común ni registran pagos directos. Las pruebas se conservan solo como historial.</p>

      </>}

    </div>}

  </div>

}
