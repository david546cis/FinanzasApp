import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase.js'
import './MetasAhorro.css'

const dinero = valor => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(valor) || 0)
const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const vacia = () => ({ nombre: '', descripcion: '', monto_objetivo: '', fecha_objetivo: '' })
const validarMonto = valor => Number.isFinite(Number(valor)) && Number(valor) > 0 && Math.round(Number(valor) * 100) === Number(valor) * 100

export default function MetasAhorro({ userId, espacioId = null, onVolver }) {
  const [metas, setMetas] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [seleccionada, setSeleccionada] = useState(null)
  const [formulario, setFormulario] = useState(null)
  const [datos, setDatos] = useState(vacia())
  const [movForm, setMovForm] = useState(null)
  const [movDatos, setMovDatos] = useState({ tipo: 'aportacion', monto: '', motivo: '', fecha: hoy() })
  const [cargando, setCargando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const cargar = useCallback(async () => {
    if (!userId) return
    const consulta = supabase.from('metas_ahorro').select('*').order('creado_en', { ascending: false })
    const { data, error: fallo } = await (espacioId ? consulta.eq('espacio_id', espacioId) : consulta.eq('propietario_id', userId).is('espacio_id', null))
    if (fallo) throw fallo
    const lista = data || []
    const ids = lista.map(meta => meta.id)
    let historial = []
    if (ids.length) {
      // Consultas en lotes para evitar URLs demasiado largas.
      for (let i = 0; i < ids.length; i += 100) {
        let desde = 0
        while (true) {
          const { data: pagina, error: falloMov } = await supabase.from('movimientos_ahorro').select('*').in('meta_id', ids.slice(i, i + 100)).order('creado_en', { ascending: false }).range(desde, desde + 999)
          if (falloMov) throw falloMov
          historial.push(...(pagina || []))
          if ((pagina || []).length < 1000) break
          desde += 1000
        }
      }
    }
    setMetas(lista)
    setMovimientos(historial)
  }, [userId, espacioId])

  useEffect(() => {
    let activo = true
    setMetas([]); setMovimientos([]); setSeleccionada(null); setFormulario(null); setMovForm(null); setError(''); setAviso('')
    const refrescar = async () => { if (!activo) return; setCargando(true); try { await cargar() } catch (e) { if (activo) setError(e.message || 'No se pudieron cargar las metas.') } finally { if (activo) setCargando(false) } }
    refrescar()
    const foco = () => { if (document.visibilityState === 'visible') refrescar() }
    document.addEventListener('visibilitychange', foco)
    window.addEventListener('focus', foco)
    const canal = supabase.channel(`metas-${espacioId || userId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metas_ahorro' }, refrescar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos_ahorro' }, refrescar)
      .subscribe()
    return () => { activo = false; document.removeEventListener('visibilitychange', foco); window.removeEventListener('focus', foco); supabase.removeChannel(canal) }
  }, [cargar, espacioId, userId])

  const saldos = useMemo(() => {
    const resultado = {}
    for (const mov of movimientos) resultado[mov.meta_id] = (resultado[mov.meta_id] || 0) + (mov.tipo === 'aportacion' ? 1 : -1) * Number(mov.monto)
    return resultado
  }, [movimientos])
  const total = metas.filter(m => m.estado !== 'cancelada').reduce((s, m) => s + (saldos[m.id] || 0), 0)
  const meta = metas.find(m => m.id === seleccionada)
  const historial = movimientos.filter(m => m.meta_id === seleccionada).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creado_en.localeCompare(a.creado_en))
  const saldo = meta ? saldos[meta.id] || 0 : 0

  const ejecutar = async (operacion, mensaje) => {
    if (ocupado) return
    setOcupado(true); setError(''); setAviso('')
    try { await operacion(); await cargar(); setAviso(mensaje) }
    catch (e) { setError(e.message || 'No se pudo completar la operación.') }
    finally { setOcupado(false) }
  }
  const rpc = async (nombre, parametros) => { const { error: fallo } = await supabase.rpc(nombre, parametros); if (fallo) throw fallo }
  const guardarMeta = e => {
    e.preventDefault()
    if (!validarMonto(datos.monto_objetivo)) { setError('El objetivo debe ser mayor que cero y tener máximo dos decimales.'); return }
    ejecutar(async () => {
      if (formulario === 'editar') await rpc('editar_meta_ahorro', { p_meta_id: seleccionada, p_nombre: datos.nombre.trim(), p_monto_objetivo: Number(datos.monto_objetivo), p_fecha_objetivo: datos.fecha_objetivo || null, p_descripcion: datos.descripcion.trim() || null })
      else await rpc('crear_meta_ahorro', { p_nombre: datos.nombre.trim(), p_monto_objetivo: Number(datos.monto_objetivo), p_fecha_objetivo: datos.fecha_objetivo || null, p_espacio_id: espacioId, p_descripcion: datos.descripcion.trim() || null })
      setFormulario(null); setDatos(vacia())
    }, formulario === 'editar' ? 'Meta actualizada.' : '¡Meta creada!')
  }
  const guardarMovimiento = e => {
    e.preventDefault()
    if (!validarMonto(movDatos.monto)) { setError('Escribe un importe positivo con máximo dos decimales.'); return }
    ejecutar(async () => {
      await rpc('registrar_movimiento_ahorro', { p_meta_id: seleccionada, p_tipo: movDatos.tipo, p_monto: Number(movDatos.monto), p_motivo: movDatos.motivo.trim(), p_fecha: movDatos.fecha })
      setMovForm(null); setMovDatos({ tipo: 'aportacion', monto: '', motivo: '', fecha: hoy() })
    }, movDatos.tipo === 'retiro' ? 'Retiro registrado con su motivo.' : '¡Aportación registrada!')
  }
  const cambiarEstado = accion => {
    if (accion === 'cancelar' && !window.confirm('¿Cancelar esta meta? Su historial se conservará, pero no podrás registrar más movimientos ni reactivarla. Si tiene dinero, primero retíralo con su motivo.')) return
    ejecutar(() => rpc('cambiar_estado_meta_ahorro', { p_meta_id: seleccionada, p_accion: accion }), 'Estado de la meta actualizado.')
  }
  const abrirEdicion = () => { setDatos({ nombre: meta.nombre, descripcion: meta.descripcion || '', monto_objetivo: String(meta.monto_objetivo), fecha_objetivo: meta.fecha_objetivo || '' }); setFormulario('editar'); setMovForm(null) }
  const progreso = m => Math.min(100, Math.max(0, (saldos[m.id] || 0) / Number(m.monto_objetivo) * 100))
  const restanteMensual = m => {
    if (!m.fecha_objetivo) return null
    const fin = new Date(`${m.fecha_objetivo}T12:00:00`)
    const ahora = new Date()
    const meses = Math.max(1, Math.ceil((fin - ahora) / (1000 * 60 * 60 * 24 * 30.4375)))
    if (fin < ahora) return 'Fecha objetivo vencida'
    return `${dinero(Math.max(0, Number(m.monto_objetivo) - (saldos[m.id] || 0)) / meses)} aprox. por mes`
  }

  return <section className="metas-modulo">
    <div className="metas-cabecera"><div><p>{espacioId ? 'Nuestro hogar · proyectos compartidos' : 'Mis finanzas · proyectos privados'}</p><h2>Metas y ahorros</h2></div><span className="metas-icono">✦</span></div>
    {onVolver && <button className="metas-enlace" type="button" onClick={onVolver}>← Volver {espacioId ? 'al resumen' : 'a mis finanzas'}</button>}
    {error && <p className="metas-error" role="alert">{error}</p>}
    {aviso && <p className="metas-exito" role="status">{aviso}</p>}
    {!meta && <>
      <div className="metas-balance"><span>Ahorrado en metas activas</span><strong>{dinero(total)}</strong><small>{metas.length} {metas.length === 1 ? 'proyecto registrado' : 'proyectos registrados'} · Independiente del balance de movimientos</small></div>
      <button className="metas-principal" type="button" onClick={() => { setFormulario(formulario === 'crear' ? null : 'crear'); setDatos(vacia()) }}>+ Crear nueva meta</button>
      {formulario === 'crear' && <form className="metas-panel metas-form" onSubmit={guardarMeta}>
        <h3>Nuevo proyecto</h3><label>Nombre de la meta<input required maxLength={120} value={datos.nombre} onChange={e => setDatos({ ...datos, nombre: e.target.value })} placeholder="Ej. Viaje a Japón 🇯🇵" /></label>
        <label>Monto objetivo (MXN)<input required type="number" min="0.01" step="0.01" value={datos.monto_objetivo} onChange={e => setDatos({ ...datos, monto_objetivo: e.target.value })} /></label>
        <label>Fecha objetivo (opcional)<input type="date" value={datos.fecha_objetivo} onChange={e => setDatos({ ...datos, fecha_objetivo: e.target.value })} /></label>
        <label>Descripción (opcional)<textarea maxLength={500} value={datos.descripcion} onChange={e => setDatos({ ...datos, descripcion: e.target.value })} /></label>
        <button disabled={ocupado} className="metas-principal">Guardar meta</button><button type="button" className="metas-enlace" onClick={() => setFormulario(null)}>Cancelar</button>
      </form>}
      {cargando && !metas.length && <p className="metas-ayuda">Cargando metas…</p>}
      {!cargando && !metas.length && <div className="metas-panel metas-vacio"><span>🌱</span><h3>Todo gran proyecto comienza con una meta</h3><p>Crea una meta y registra aportaciones conforme vayas ahorrando.</p></div>}
      {metas.map(m => <button key={m.id} type="button" className="metas-panel metas-tarjeta" onClick={() => { setSeleccionada(m.id); setFormulario(null); setMovForm(null); setError(''); setAviso('') }}><div className="metas-fila"><strong>{m.nombre}</strong><span className="metas-estado">{m.estado}</span></div><div className="metas-cantidad">{dinero(saldos[m.id] || 0)} <small>de {dinero(m.monto_objetivo)}</small></div><div className="metas-barra"><span style={{ width: `${progreso(m)}%` }} /></div><div className="metas-fila metas-detalle"><span>{progreso(m).toFixed(0)}% completado</span><span>{m.fecha_objetivo || 'Sin fecha límite'} →</span></div></button>)}
    </>}
    {meta && <>
      <button className="metas-enlace" onClick={() => { setSeleccionada(null); setFormulario(null); setMovForm(null); setError(''); setAviso('') }}>← Todas las metas</button>
      <div className="metas-panel"><div className="metas-fila"><h3>{meta.nombre}</h3><span className="metas-estado">{meta.estado}</span></div>{meta.descripcion && <p className="metas-ayuda">{meta.descripcion}</p>}
        <div className="metas-cantidad">{dinero(saldo)} <small>de {dinero(meta.monto_objetivo)}</small></div><div className="metas-barra"><span style={{ width: `${progreso(meta)}%` }} /></div><p className="metas-ayuda">Faltan {dinero(Math.max(0, Number(meta.monto_objetivo) - saldo))} · {progreso(meta).toFixed(1)}% alcanzado</p>
        {meta.fecha_objetivo && <p className="metas-ayuda">Objetivo: {meta.fecha_objetivo} · {restanteMensual(meta)}</p>}
        {meta.estado !== 'cancelada' && <div className="metas-botones"><button disabled={ocupado || meta.estado === 'pausada'} onClick={() => { setMovForm('nuevo'); setMovDatos({ tipo: 'aportacion', monto: '', motivo: '', fecha: hoy() }); setFormulario(null) }}>+ Aportar</button><button disabled={ocupado || meta.estado === 'pausada' || saldo <= 0} className="metas-retirar" onClick={() => { setMovForm('nuevo'); setMovDatos({ tipo: 'retiro', monto: '', motivo: '', fecha: hoy() }); setFormulario(null) }}>− Retirar</button></div>}
      </div>
      {movForm && <form className="metas-panel metas-form" onSubmit={guardarMovimiento}><h3>{movDatos.tipo === 'retiro' ? 'Registrar retiro' : 'Registrar aportación'}</h3><label>Monto (MXN)<input required type="number" min="0.01" step="0.01" value={movDatos.monto} onChange={e => setMovDatos({ ...movDatos, monto: e.target.value })} /></label><label>{movDatos.tipo === 'retiro' ? '¿Por qué se retiró este dinero?' : 'Motivo o nota de la aportación'}<textarea required maxLength={500} value={movDatos.motivo} onChange={e => setMovDatos({ ...movDatos, motivo: e.target.value })} placeholder={movDatos.tipo === 'retiro' ? 'Ej. Emergencia familiar' : 'Ej. Ahorro de esta quincena'} /></label><label>Fecha<input required type="date" value={movDatos.fecha} onChange={e => setMovDatos({ ...movDatos, fecha: e.target.value })} /></label><button disabled={ocupado} className="metas-principal">Confirmar {movDatos.tipo === 'retiro' ? 'retiro' : 'aportación'}</button><button type="button" className="metas-enlace" onClick={() => setMovForm(null)}>Cancelar</button></form>}
      {formulario === 'editar' && <form className="metas-panel metas-form" onSubmit={guardarMeta}><h3>Editar proyecto</h3><label>Nombre<input required maxLength={120} value={datos.nombre} onChange={e => setDatos({ ...datos, nombre: e.target.value })} /></label><label>Monto objetivo<input required type="number" min="0.01" step="0.01" value={datos.monto_objetivo} onChange={e => setDatos({ ...datos, monto_objetivo: e.target.value })} /></label><label>Fecha objetivo<input type="date" value={datos.fecha_objetivo} onChange={e => setDatos({ ...datos, fecha_objetivo: e.target.value })} /></label><label>Descripción<textarea maxLength={500} value={datos.descripcion} onChange={e => setDatos({ ...datos, descripcion: e.target.value })} /></label><button className="metas-principal" disabled={ocupado}>Guardar cambios</button><button type="button" className="metas-enlace" onClick={() => setFormulario(null)}>Cancelar</button></form>}
      <div className="metas-panel"><h3>Administrar meta</h3><div className="metas-botones"><button disabled={ocupado || meta.estado === 'cancelada'} onClick={abrirEdicion}>Editar</button>{meta.estado === 'pausada' ? <button disabled={ocupado} onClick={() => cambiarEstado('reanudar')}>Reanudar</button> : <button disabled={ocupado || meta.estado === 'cancelada'} onClick={() => cambiarEstado('pausar')}>Pausar</button>}<button className="metas-retirar" disabled={ocupado || meta.estado === 'cancelada' || saldo > 0} title={saldo > 0 ? 'Retira primero el saldo para conservar su historial' : ''} onClick={() => cambiarEstado('cancelar')}>Cancelar meta</button></div>{saldo > 0 && <p className="metas-ayuda">Para cancelar, primero registra el retiro del saldo con su motivo. Así el historial queda claro.</p>}</div>
      <div className="metas-panel"><h3>Historial de ahorro</h3>{!historial.length && <p className="metas-ayuda">Todavía no hay aportaciones ni retiros.</p>}{historial.map(m => <div className="metas-historial" key={m.id}><div><strong>{m.tipo === 'aportacion' ? '↗ Aportación' : '↙ Retiro'}</strong><small>{m.fecha} · {m.usuario_id === userId ? 'Tú' : 'Otro integrante'}</small><p>{m.motivo}</p></div><strong className={m.tipo === 'retiro' ? 'metas-rojo' : 'metas-verde'}>{m.tipo === 'retiro' ? '−' : '+'}{dinero(m.monto)}</strong></div>)}</div>
    </>}
  </section>
}
