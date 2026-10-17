import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import MetasAhorro from './MetasAhorro.jsx'
import RepartoPago from './RepartoPago.jsx'
const panel = { background: 'var(--card-bg, #fff)', color: '#172235', borderRadius: 16, padding: 18, marginBottom: 16, border: '1px solid #dce3eb' }
const campo = { width: '100%', padding: 12, borderRadius: 9, border: '1px solid #bbc7d5', margin: '7px 0 12px', boxSizing: 'border-box' }
const boton = { padding: '11px 15px', borderRadius: 9, border: 0, background: '#214d8b', color: 'white', cursor: 'pointer', margin: '5px 6px 5px 0' }
const fechaHoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const moneda = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(n)||0)
export default function EspacioCompartido({ userId, managementOnly = false, onMembershipChange }) {
  const [espacios, setEspacios] = useState([])
  const [actual, setActual] = useState('')
  const [integrantes, setIntegrantes] = useState([])
  const [aportaciones, setAportaciones] = useState([])
  const [pagos, setPagos] = useState([])
  const [vencimientosPagados, setVencimientosPagados] = useState([])
  const [nombre, setNombre] = useState('Nuestro hogar')
  const [codigo, setCodigo] = useState('')
  const [invitacion, setInvitacion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [pago, setPago] = useState({concepto:'',monto:'',fecha_vencimiento:fechaHoy(),categoria:'hogar',modalidad:'unico',frecuencia:'mensual',total_pagos:'',pago_actual:'1',metodo_pago:''})
  const [editarPago, setEditarPago] = useState(null)
  const [nuevoAdmin, setNuevoAdmin] = useState('')
  const [seccion, setSeccion] = useState('resumen')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [vistaPago, setVistaPago] = useState('lista')
  const [ingresoNeto, setIngresoNeto] = useState('')
  const [porcentajes, setPorcentajes] = useState([])
  const [cargandoIngresos, setCargandoIngresos] = useState(false)
  const [detallePagoId, setDetallePagoId] = useState(null)
  const [filtroPagos, setFiltroPagos] = useState('pendientes')
  const [busquedaPagos, setBusquedaPagos] = useState('')
  const [repartosRegistrados, setRepartosRegistrados] = useState({})
  const cargarEspacios = useCallback(async () => {
    if (!userId) return
    const {data: miembros,error: em} = await supabase.from('espacios_integrantes').select('espacio_id').eq('user_id',userId)
    if(em) throw em
    const ids = (miembros||[]).map(m=>m.espacio_id)
    if (!ids.length) {setEspacios([]);setActual('');onMembershipChange?.(false);return}
    const {data,error:e} = await supabase.from('espacios_compartidos').select('id,nombre,creado_por').in('id',ids)
    if(e) throw e
    setEspacios(data||[])
    onMembershipChange?.((data||[]).length>0)
    setActual(prev => ids.includes(prev) ? prev : ids[0])
  },[userId,onMembershipChange])
  const cargarDatos = useCallback(async () => {
    if(!actual) {setIntegrantes([]);setPagos([]);setAportaciones([]);setVencimientosPagados([]);setRepartosRegistrados({});return}
    const [mi,pa,vp] = await Promise.all([
      supabase.from('espacios_integrantes').select('user_id,agregado_en').eq('espacio_id',actual),
      supabase.from('pagos_compartidos').select('*').eq('espacio_id',actual).order('fecha_vencimiento',{ascending:true}).limit(1000),
      supabase.from('vencimientos_pagados_compartidos').select('id,pago_id,fecha_vencimiento,fecha_pago,confirmado_por,confirmado_en,nota').eq('espacio_id',actual).order('confirmado_en',{ascending:false}).limit(1000),
    ])
    if(mi.error||pa.error||vp.error) throw mi.error||pa.error||vp.error
    setIntegrantes(mi.data||[]);setPagos(pa.data||[]);setVencimientosPagados(vp.data||[])
    // El historial compartido se obtiene únicamente de aportaciones a cuotas de pagos.
    const { data: acuerdos, error: errorAcuerdos } = await supabase.from('repartos_pagos_compartidos')
      .select('id,pago_id,fecha_vencimiento').eq('espacio_id', actual)
    if (errorAcuerdos) throw errorAcuerdos
    const idsAcuerdos = (acuerdos || []).map(r => r.id)
    let historial = []
    if (idsAcuerdos.length) {
      const { data: cuotasHist, error: errorCuotas } = await supabase.from('cuotas_reparto_compartido')
        .select('id,user_id,reparto_id').in('reparto_id', idsAcuerdos)
      if (errorCuotas) throw errorCuotas
      if ((cuotasHist || []).length) {
        const { data: registros, error: errorRegistros } = await supabase.from('aportaciones_reparto_compartido')
          .select('id,cuota_id,monto,fecha,nota,es_prueba,creado_en')
          .in('cuota_id', cuotasHist.map(c => c.id))
          .order('fecha', { ascending: false }).order('creado_en', { ascending: false })
        if (errorRegistros) throw errorRegistros
        const cuotaIndice = Object.fromEntries(cuotasHist.map(c => [c.id, c]))
        const acuerdoIndice = Object.fromEntries(acuerdos.map(r => [r.id, r]))
        const pagoIndice = Object.fromEntries((pa.data || []).map(p => [p.id, p]))
        historial = (registros || []).map(a => {
          const cuota = cuotaIndice[a.cuota_id]
          const acuerdo = acuerdoIndice[cuota?.reparto_id]
          return { ...a, integrante_id: cuota?.user_id, pago_id: acuerdo?.pago_id,
            concepto: pagoIndice[acuerdo?.pago_id]?.concepto || 'Compromiso compartido',
            fecha_vencimiento: acuerdo?.fecha_vencimiento }
        })
      }
    }
    setAportaciones(historial)
    const ids=(pa.data||[]).map(p=>p.id)
    if(ids.length){const {data:repartos,error:er}=await supabase.from('repartos_pagos_compartidos').select('pago_id,fecha_vencimiento,estado').in('pago_id',ids);if(er)throw er;setRepartosRegistrados(Object.fromEntries((repartos||[]).filter(r=>r.estado==='activo').map(r=>[`${r.pago_id}:${r.fecha_vencimiento}`,true])))}else setRepartosRegistrados({})
  },[actual])
  useEffect(()=>{ let activo=true; (async()=>{try{await cargarEspacios()}catch(e){if(activo)setError(e.message)}})();return()=>{activo=false}},[cargarEspacios])
  useEffect(()=>{let activo=true;const actualizar=()=>{cargarDatos().catch(e=>{if(activo)setError(e.message)})};actualizar();if(!actual)return()=>{activo=false};const canal=supabase.channel(`compartido-${actual}-${userId}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'pagos_compartidos',filter:`espacio_id=eq.${actual}`},actualizar)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'aportaciones_reparto_compartido'},actualizar)
    .subscribe();const foco=()=>{if(document.visibilityState==='visible')actualizar()};document.addEventListener('visibilitychange',foco);return()=>{activo=false;document.removeEventListener('visibilitychange',foco);supabase.removeChannel(canal)}},[actual,userId,cargarDatos])
  const cargarIngresos = useCallback(async () => {
    if (!userId) return
    const { data: propio, error: ep } = await supabase.from('ingresos_para_reparto').select('ingreso_mensual_neto').eq('user_id', userId).maybeSingle()
    if (ep) throw ep
    setIngresoNeto(propio?.ingreso_mensual_neto != null ? String(propio.ingreso_mensual_neto) : '')
    if (!actual) { setPorcentajes([]); return }
    const { data, error: er } = await supabase.rpc('porcentajes_ingresos_espacio', { p_espacio_id: actual })
    if (er) throw er
    setPorcentajes(data || [])
  }, [actual, userId])
  useEffect(() => {
    if (!managementOnly || !userId) return
    cargarIngresos().catch(e => setError(e.message))
  }, [managementOnly, userId, cargarIngresos])
  const guardarIngreso = async (evento) => {
    evento.preventDefault()
    const monto = Number(ingresoNeto)
    if (!Number.isFinite(monto) || monto <= 0 || Math.round(monto * 100) !== monto * 100) {
      setError('Escribe un ingreso neto mensual válido, con máximo dos decimales.')
      return
    }
    setCargandoIngresos(true); setError(''); setMensaje('')
    try {
      const { error: e } = await supabase.rpc('guardar_ingreso_para_reparto', { p_ingreso_mensual_neto: monto })
      if (e) throw e
      await cargarIngresos()
      setMensaje('Tu ingreso mensual se guardó de forma privada.')
    } catch (e) { setError(e.message || 'No se pudo guardar el ingreso.') }
    finally { setCargandoIngresos(false) }
  }
  const ejecutar=async(fn,exito)=>{setCargando(true);setError('');setMensaje('');try{await fn();setMensaje(exito);await cargarEspacios();await cargarDatos()}catch(e){setError(e?.message||'No se pudo completar la operación')}finally{setCargando(false)}}
  const rpc=async(nombre,args)=>{const {data,error:e}=await supabase.rpc(nombre,args);if(e)throw e;return data}
  const espacio=espacios.find(e=>e.id===actual)
  const admin=espacio?.creado_por===userId
  const crear=()=>ejecutar(async()=>{const id=await rpc('crear_espacio_compartido',{p_nombre:nombre.trim()});setActual(id)},'Espacio creado correctamente.')
  const unirse=()=>ejecutar(async()=>{const id=await rpc('aceptar_invitacion_espacio',{p_codigo:codigo.trim()});setCodigo('');setActual(id)},'Te uniste al espacio.')
  const invitar=()=>ejecutar(async()=>{const id=await rpc('generar_invitacion_espacio',{p_espacio_id:actual});setInvitacion(id)},'Código generado; válido durante 24 horas y para un solo uso.')
  const salir=()=>{if(!window.confirm('¿Salir de este espacio? Tus datos personales no cambiarán.'))return;ejecutar(async()=>{await rpc('salir_espacio_compartido',{p_espacio_id:actual});setActual('')},'Te desvinculaste del espacio.')}
  const transferir=()=>{if(!nuevoAdmin||!window.confirm('¿Transferir la administración a este integrante?'))return;ejecutar(async()=>{await rpc('transferir_administracion_espacio',{p_espacio_id:actual,p_nuevo_administrador:nuevoAdmin});setNuevoAdmin('')},'Administración transferida.')}
  const cerrar=()=>{if(window.prompt('Se eliminará permanentemente el historial compartido. Escribe ELIMINAR ESPACIO:')!=='ELIMINAR ESPACIO')return;ejecutar(async()=>{await rpc('cerrar_espacio_compartido',{p_espacio_id:actual,p_confirmacion:'ELIMINAR ESPACIO'});setActual('')},'Espacio cerrado.')}
  const guardarPago = e => {
    e.preventDefault()
    ejecutar(async () => {
      if (editarPago && pagos.some(x => x.id === editarPago && x.estado === 'cancelado'))
        throw Error('Un compromiso cancelado no puede editarse.')
      if (editarPago && aportaciones.some(a => a.pago_id === editarPago) || editarPago && vencimientosPagados.some(v => v.pago_id === editarPago) || editarPago && Object.keys(repartosRegistrados).some(k => k.startsWith(`${editarPago}:`)))
        throw Error('Este pago tiene un reparto registrado. No se pueden cambiar sus datos financieros.')
      const fila = {
        concepto: pago.concepto.trim(), monto: Number(pago.monto),
        fecha_vencimiento: pago.fecha_vencimiento, categoria: pago.categoria,
        metodo_pago: pago.metodo_pago || null, modalidad: pago.modalidad,
        frecuencia: pago.modalidad === 'unico' ? null : pago.frecuencia,
        pago_actual: pago.modalidad === 'plazo' ? Number(pago.pago_actual) : null,
        total_pagos: pago.modalidad === 'plazo' ? Number(pago.total_pagos) : null,
        modificado_en: new Date().toISOString()
      }
      if (!fila.concepto || !Number.isFinite(fila.monto) || fila.monto <= 0 || !fila.fecha_vencimiento)
        throw Error('Revisa el concepto, el monto y la fecha del pago.')
      if (fila.modalidad === 'plazo' && (!(fila.total_pagos > 0) || !(fila.pago_actual > 0) || fila.pago_actual > fila.total_pagos))
        throw Error('Revisa los plazos.')
      const r = editarPago
        ? await supabase.from('pagos_compartidos').update(fila).eq('id', editarPago).eq('espacio_id', actual).select('id').single()
        : await supabase.from('pagos_compartidos').insert({ ...fila, espacio_id: actual, creado_por: userId, estado: 'pendiente' }).select('id').single()
      if (r.error) throw r.error
      const idGuardado = r.data?.id
      if (!idGuardado) throw Error('No se pudo confirmar el pago guardado.')
      setEditarPago(null)
      setPago({ concepto: '', monto: '', fecha_vencimiento: fechaHoy(), categoria: 'hogar', modalidad: 'unico', frecuencia: 'mensual', total_pagos: '', pago_actual: '1', metodo_pago: '' })
      setMostrarFormulario(false)
      setDetallePagoId(idGuardado)
      setVistaPago('detalle')
    }, editarPago ? 'Cambios guardados correctamente.' : 'Pago guardado correctamente.')
  }
  const nuevoPago = () => {
    setError(''); setMensaje(''); setEditarPago(null)
    setPago({ concepto: '', monto: '', fecha_vencimiento: fechaHoy(), categoria: 'hogar', modalidad: 'unico', frecuencia: 'mensual', total_pagos: '', pago_actual: '1', metodo_pago: '' })
    setDetallePagoId(null); setVistaPago('formulario')
  }
  const cancelarFormularioPago = () => {
    setEditarPago(null)
    setVistaPago(detallePagoId ? 'detalle' : 'lista')
    setError('')
  }
  const cancelarCompromiso = p => {
    if (p.estado === 'cancelado') { setError('Este compromiso ya está cancelado.'); return }
    const motivo = window.prompt(`¿Por qué deseas cancelar "${p.concepto}"?\n\nSe conservarán los acuerdos y aportaciones anteriores.\n\nMotivo (5 a 500 caracteres):`)
    if (motivo === null) return
    const limpio = motivo.trim()
    if (limpio.length < 5 || limpio.length > 500) { setError('El motivo debe tener entre 5 y 500 caracteres.'); return }
    if (!window.confirm(`¿Confirmas la cancelación definitiva de "${p.concepto}"?\n\nNo podrás registrar nuevas aportaciones ni crear nuevos repartos.`)) return
    ejecutar(async () => {
      await rpc('cancelar_compromiso_compartido', { p_pago_id: p.id, p_motivo: limpio, p_alcance: 'recurrencia' })
      setEditarPago(null); setMostrarFormulario(false)
    }, 'Compromiso cancelado. Se conservaron los acuerdos y las aportaciones.')
  }
  const marcarComoPagado = p => {
    if (cargando || p.estado !== 'pendiente') return
    const fecha = fechaHoy()
    const siguiente = p.modalidad === 'unico' ? 'El compromiso quedará pagado.' : 'El sistema avanzará al siguiente vencimiento o finalizará el último plazo.'
    if (!window.confirm(`¿Confirmas que el pago de «${p.concepto}» por ${moneda(p.monto)}, con vencimiento ${p.fecha_vencimiento}, YA FUE ENTREGADO realmente?\n\nLas aportaciones registradas no equivalen por sí solas a un pago entregado.\n\n${siguiente}\n\nNo confirmes si solo hiciste pruebas.`)) return
    ejecutar(async () => {
      await rpc('confirmar_pago_compartido', {p_pago_id:p.id,p_fecha_pago:fecha,p_nota:'Confirmado manualmente desde FinanzasApp'})
    }, 'Pago confirmado. Se conservó el historial y se actualizó el vencimiento correspondiente.')
  }
  const editarPa=p=>{if(p.estado!=='pendiente'){setError('Solo puedes editar compromisos pendientes.');return}if(Object.keys(repartosRegistrados).some(k=>k.startsWith(`${p.id}:`)) || vencimientosPagados.some(v=>v.pago_id===p.id)){setError('El reparto de este pago está confirmado. Por seguridad, la edición de sus datos requiere la función de actualización controlada.');return}setSeccion('pagos');setVistaPago('formulario');setDetallePagoId(p.id);setEditarPago(p.id);setError('');setMensaje('');setPago({concepto:p.concepto,monto:String(p.monto),fecha_vencimiento:p.fecha_vencimiento,categoria:p.categoria,metodo_pago:p.metodo_pago||'',modalidad:p.modalidad,frecuencia:p.frecuencia||'mensual',pago_actual:String(p.pago_actual||1),total_pagos:String(p.total_pagos||'')})}
  const input=(obj,set,key,type='text')=><input style={campo} type={type} value={obj[key]??''} onChange={e=>set({...obj,[key]:e.target.value})} required={['concepto','monto','fecha','fecha_vencimiento'].includes(key)} />
  const selector=(obj,set,key,opts)=><select style={campo} value={obj[key]} onChange={e=>set({...obj,[key]:e.target.value})}>{opts.map(([v,t])=><option key={v} value={v}>{t}</option>)}</select>
  const categorias=[['hogar','Hogar'],['alimentacion','Alimentación'],['servicios','Servicios'],['transporte','Transporte'],['salud','Salud'],['entretenimiento','Entretenimiento'],['deudas','Deudas'],['ahorro','Ahorro'],['otros','Otros']]
  const tarjeta = {background:'#fff',border:'1px solid #e1e7ef',borderRadius:18,padding:18,marginBottom:14}
  const titulo = {margin:'0 0 12px',fontSize:17,color:'#18263b'}
  const suave = {fontSize:13,color:'#64748b',lineHeight:1.5}
  const secundario = {...boton,background:'#edf3fb',color:'#214d8b'}
  const peligro = {...boton,background:'#a32937'}
  const campoConEtiqueta=(etiqueta,contenido)=><label style={{display:'block',fontSize:13,fontWeight:600,marginBottom:3,color:'#334155'}}>{etiqueta}{contenido}</label>
  const abrirDetallePago=id=>{setDetallePagoId(id);setSeccion('pagos');setVistaPago('detalle');setMostrarFormulario(false);setEditarPago(null);setError('')}
  const volver=()=>{setDetallePagoId(null);setSeccion('resumen');setVistaPago('lista');setMostrarFormulario(false);setEditarPago(null)}
  const seleccion=<select aria-label="Seleccionar espacio" style={{...campo,margin:'6px 0'}} value={actual} onChange={e=>{setActual(e.target.value);setInvitacion('');volver()}}>{espacios.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
  const formularioPago=<form onSubmit={guardarPago}>
    {campoConEtiqueta('Concepto',input(pago,setPago,'concepto'))}
    {campoConEtiqueta('Monto',input(pago,setPago,'monto','number'))}
    {campoConEtiqueta('Vencimiento',input(pago,setPago,'fecha_vencimiento','date'))}
    {campoConEtiqueta('Categoría',selector(pago,setPago,'categoria',categorias))}
    {campoConEtiqueta('Modalidad',selector(pago,setPago,'modalidad',[['unico','Único'],['recurrente','Recurrente'],['plazo','A plazos']]))}
    {pago.modalidad!=='unico'&&campoConEtiqueta('Frecuencia',selector(pago,setPago,'frecuencia',[['semanal','Semanal'],['quincenal','Quincenal'],['mensual','Mensual'],['bimestral','Bimestral'],['trimestral','Trimestral'],['semestral','Semestral'],['anual','Anual']]))}
    {pago.modalidad==='plazo'&&<>{campoConEtiqueta('Pago actual',input(pago,setPago,'pago_actual','number'))}{campoConEtiqueta('Total de pagos',input(pago,setPago,'total_pagos','number'))}</>}
    {campoConEtiqueta('Método de pago',selector(pago,setPago,'metodo_pago',[['','Sin especificar'],['efectivo','Efectivo'],['debito','Débito'],['credito','Crédito'],['transferencia','Transferencia']]))}
    <button style={boton} disabled={cargando}>{editarPago?'Guardar cambios':'Agregar pago'}</button>
    <button type="button" style={secundario} onClick={cancelarFormularioPago}>Cancelar</button>
  </form>
  return <section style={{padding:'4px 0 24px',maxWidth:680,margin:'0 auto'}}>
    <div style={{marginBottom:18}}><p style={{...suave,margin:'0 0 3px'}}>Finanzas independientes de tus cuentas personales</p><h2 style={{margin:'0 0 5px',fontSize:23}}>{espacio?.nombre||'Espacio compartido'}</h2>{espacio&&<span style={suave}>{integrantes.length} {integrantes.length===1?'integrante':'integrantes'}</span>}</div>
    {error&&<p role="alert" style={{color:'#b91c1c',background:'#fff1f2',padding:12,borderRadius:10}}>{error}</p>}
    {mensaje&&<p role="status" style={{color:'#166534',background:'#ecfdf5',padding:12,borderRadius:10}}>{mensaje}</p>}
    {!espacios.length&&<div style={tarjeta}><h3 style={titulo}>Activar espacio compartido</h3><p style={suave}>Crea un espacio o únete al que te invitaron.</p>{campoConEtiqueta('Nombre del espacio',<input style={campo} value={nombre} maxLength={100} onChange={e=>setNombre(e.target.value)}/>)}<button style={boton} disabled={cargando||!nombre.trim()} onClick={crear}>Crear espacio</button><hr style={{border:0,borderTop:'1px solid #e5e7eb',margin:'18px 0'}}/>{campoConEtiqueta('Código de invitación',<input style={campo} value={codigo} onChange={e=>setCodigo(e.target.value)} placeholder="Pega el código recibido"/>)}<button style={boton} disabled={cargando||!codigo.trim()} onClick={unirse}>Unirme</button></div>}
    {!!espacios.length&&<>
      {espacios.length>1&&<div style={tarjeta}>{seleccion}</div>}
      {managementOnly?<>
        <div style={tarjeta}>
          <h3 style={titulo}>Ingresos para distribuir gastos</h3>
          <p style={suave}>Cada integrante captura su propio ingreso mensual neto. El importe es privado; en el espacio se comparten solamente los porcentajes calculados.</p>
          <form onSubmit={guardarIngreso}>
            {campoConEtiqueta('Mi ingreso mensual neto (MXN)', <input style={campo} type="number" min="0.01" step="0.01" required value={ingresoNeto} onChange={e=>setIngresoNeto(e.target.value)} placeholder="Ej. 15000.00" />)}
            <button style={boton} disabled={cargandoIngresos}>{cargandoIngresos ? 'Guardando…' : 'Guardar mi ingreso'}</button>
            <button type="button" style={secundario} disabled={cargandoIngresos} onClick={()=>cargarIngresos().catch(e=>setError(e.message))}>Actualizar porcentajes</button>
          </form>
          {porcentajes.length>0 && <div style={{marginTop:12}}>
            <strong style={{fontSize:14}}>Distribución proporcional</strong>
            {porcentajes.some(p=>!p.configurado) ? <p style={suave}>Falta que uno o más integrantes registren su ingreso. Aún no se puede calcular el reparto automático.</p> : porcentajes.map(p=><div key={p.user_id} style={{display:'flex',justifyContent:'space-between',padding:'9px 0',borderBottom:'1px solid #edf0f5',fontSize:13}}><span>{p.user_id===userId?'Tú':`Integrante ${p.user_id.slice(0,8)}…`}</span><strong>{Number(p.porcentaje).toFixed(2)}%</strong></div>)}
          </div>}
          <p style={{...suave,marginTop:12}}>Estos porcentajes son informativos por ahora. Todavía no se aplican automáticamente a los pagos existentes.</p>
        </div>
        <div style={tarjeta}><h3 style={titulo}>Integrantes</h3><p style={suave}>{admin?'Administras este espacio':'Eres integrante de este espacio'}</p>{integrantes.map(i=><div key={i.user_id} style={{padding:'11px 0',borderBottom:'1px solid #edf0f5',fontSize:14}}>{i.user_id===userId?'Tú':`Integrante ${i.user_id.slice(0,8)}…`}{i.user_id===espacio?.creado_por?' · Administrador':''}</div>)}<p style={suave}>Mostramos identificadores abreviados para proteger la privacidad.</p></div>
        <div style={tarjeta}><h3 style={titulo}>Invitaciones</h3>{admin?<><p style={suave}>Cada invitación dura 24 horas y puede utilizarse una sola vez.</p><button style={boton} disabled={cargando} onClick={invitar}>Generar invitación</button>{invitacion&&<div><input style={campo} readOnly value={invitacion}/><button style={secundario} onClick={()=>navigator.clipboard.writeText(invitacion).then(()=>setMensaje('Código copiado.')).catch(()=>setError('No se pudo copiar.'))}>Copiar código</button></div>}</>:<p style={suave}>Solicita una invitación al administrador.</p>}</div>
        <div style={tarjeta}><h3 style={titulo}>Administración y desvinculación</h3>{!admin&&<button style={peligro} disabled={cargando} onClick={salir}>Desvincularme del espacio</button>}{admin&&integrantes.length>1&&<><p style={suave}>Para desvincularte, transfiere primero la administración a otro integrante.</p>{campoConEtiqueta('Nuevo administrador',<select style={campo} value={nuevoAdmin} onChange={e=>setNuevoAdmin(e.target.value)}><option value="">Selecciona integrante</option>{integrantes.filter(i=>i.user_id!==userId).map(i=><option key={i.user_id} value={i.user_id}>{i.user_id.slice(0,8)}…</option>)}</select>)}<button style={boton} disabled={cargando||!nuevoAdmin} onClick={transferir}>Transferir administración</button></>}{admin&&integrantes.length===1&&<><p style={suave}>Eres la única persona vinculada. Cerrar el espacio eliminará su historial compartido, no tus datos personales.</p><button style={peligro} disabled={cargando} onClick={cerrar}>Cerrar espacio definitivamente</button></>}</div>
        <div style={tarjeta}><h3 style={titulo}>Otros espacios</h3>{campoConEtiqueta('Nombre del nuevo espacio',<input style={campo} value={nombre} onChange={e=>setNombre(e.target.value)}/>)}<button style={secundario} disabled={cargando||!nombre.trim()} onClick={crear}>Crear otro espacio</button>{campoConEtiqueta('Código de invitación',<input style={campo} value={codigo} onChange={e=>setCodigo(e.target.value)}/>)}<button style={secundario} disabled={cargando||!codigo.trim()} onClick={unirse}>Unirme a otro espacio</button></div>
      </>:<>
        {seccion==='resumen'&&<>
                      <div style={{...tarjeta,background:'#173b70',color:'#fff',border:0,padding:22}}>
              <p style={{margin:'0 0 10px',opacity:.85,fontSize:13}}>Aportaciones registradas en pagos compartidos</p>
              <strong style={{fontSize:32}}>{moneda(aportaciones.filter(a=>!a.es_prueba).reduce((s,a)=>s+Number(a.monto),0))}</strong>
              <p style={{margin:'10px 0 0',opacity:.85,fontSize:12}}>Total histórico de aportaciones reales; no representa saldo disponible ni pagos liquidados.</p>
            </div>
<div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}><button type="button" onClick={()=>setSeccion('movimientos')} style={{...tarjeta,cursor:'pointer',textAlign:'left',color:'#173b70',minWidth:0}}><span style={{fontSize:24}}>↕</span><h3 style={{...titulo,margin:'8px 0 4px'}}>Movimientos</h3><span style={suave}>Historial de aportaciones a pagos</span></button><button type="button" onClick={()=>setSeccion('pagos')} style={{...tarjeta,cursor:'pointer',textAlign:'left',color:'#173b70',minWidth:0}}><span style={{fontSize:24}}>▦</span><h3 style={{...titulo,margin:'8px 0 4px'}}>Pagos</h3><span style={suave}>Consultar y programar</span></button></div>
          <button type="button" onClick={()=>setSeccion('metas')} style={{...tarjeta,width:'100%',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:14,color:'#173b70'}}><span style={{fontSize:28}}>✦</span><span><strong>Metas y ahorros</strong><br/><span style={suave}>Japón, automóvil, hogar y vacaciones</span></span><span style={{marginLeft:'auto'}}>→</span></button>
          <div style={tarjeta}><h3 style={titulo}>Próximos pagos</h3>{pagos.filter(p=>p.estado==='pendiente').slice(0,3).map(p=><button type="button" key={p.id} onClick={()=>abrirDetallePago(p.id)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'13px 4px',border:0,borderBottom:'1px solid #edf0f5',background:'transparent',cursor:'pointer',textAlign:'left',color:'#172235'}}><span><strong>{p.concepto}</strong><br/><small style={suave}>{p.fecha_vencimiento}</small></span><span style={{textAlign:'right'}}><strong>{moneda(p.monto)}</strong><br/><small style={{color:'#214d8b'}}>Ver detalle →</small></span></button>)}{!pagos.some(p=>p.estado==='pendiente')&&<p style={suave}>No hay pagos pendientes.</p>}</div>
          <p style={{...suave,textAlign:'center'}}>Las invitaciones y la desvinculación se administran desde Ajustes.</p>
        </>}
        {seccion==='metas'&&<MetasAhorro userId={userId} espacioId={actual} onVolver={volver}/>}
                {seccion==='movimientos'&&<>
          <button type="button" style={secundario} onClick={volver}>← Resumen</button>
          <div style={tarjeta}>
            <h3 style={titulo}>Movimientos · aportaciones a pagos compartidos</h3>
            <p style={suave}>Historial automático de las aportaciones registradas desde Pagos. Las metas y ahorros conservan su propio historial. Los registros de prueba no se suman al total real.</p>
            {!aportaciones.length && <p style={suave}>Todavía no hay aportaciones a compromisos compartidos.</p>}
            {aportaciones.map(a=><div key={a.id} style={{padding:'14px 0',borderTop:'1px solid #edf0f5'}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:12}}>
                <div style={{minWidth:0}}>
                  <strong>{a.concepto}</strong>
                  <div style={suave}>{a.integrante_id===userId?'Tú':`Integrante ${String(a.integrante_id||'').slice(0,8)}…`} · {a.fecha}</div>
                  <div style={suave}>Vencimiento: {a.fecha_vencimiento || 'Sin fecha'} {a.es_prueba?'· PRUEBA':''}</div>
                  {a.nota && <div style={suave}>{a.nota}</div>}
                </div>
                <strong style={{color:a.es_prueba?'#92400e':'#167347',whiteSpace:'nowrap'}}>{moneda(a.monto)}</strong>
              </div>
              {a.pago_id && <button type="button" style={{...secundario,marginTop:8}} onClick={()=>abrirDetallePago(a.pago_id)}>Ver compromiso →</button>}
            </div>)}
          </div>
        </>}
{seccion==='pagos'&&<>
          <button type="button" style={secundario} onClick={() => {
            if (vistaPago === 'formulario') cancelarFormularioPago()
            else if (vistaPago === 'detalle') { setDetallePagoId(null); setVistaPago('lista') }
            else volver()
          }}>
            {vistaPago === 'formulario' ? '← Volver sin guardar' : vistaPago === 'detalle' ? '← Todos los pagos' : '← Resumen'}
          </button>
          <div style={tarjeta}>
          {vistaPago === 'formulario' ? <>
            <h3 style={titulo}>{editarPago ? 'Editar pago' : 'Nuevo pago compartido'}</h3>
            <p style={suave}>Completa los datos y guarda. Después volverás al detalle del pago.</p>
            {formularioPago}
          </> : vistaPago === 'detalle' ? <>
          {(()=>{
            const p=pagos.find(x=>x.id===detallePagoId)
            if(!p)return <p style={suave}>Este pago ya no está disponible.</p>
            return <><div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'start'}}><div><h3 style={{...titulo,marginBottom:5}}>{p.concepto}</h3><span style={suave}>Vence {p.fecha_vencimiento} · {p.estado}</span></div><strong style={{fontSize:21,color:'#173b70',whiteSpace:'nowrap'}}>{moneda(p.monto)}</strong></div><div style={{...suave,background:'#f3f6fa',padding:12,borderRadius:12,marginTop:14}}>Categoría: {p.categoria||'Sin categoría'}<br/>Modalidad: {p.modalidad||'Único'}{p.frecuencia?` · ${p.frecuencia}`:''}<br/>Método: {p.metodo_pago||'Sin especificar'}</div><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}}><button type="button" style={secundario} onClick={()=>editarPa(p)} disabled={cargando||p.estado==='cancelado'||Object.keys(repartosRegistrados).some(k=>k.startsWith(`${p.id}:`)) || vencimientosPagados.some(v=>v.pago_id===p.id)} title={p.estado==='cancelado'?'Un compromiso cancelado no puede editarse':Object.keys(repartosRegistrados).some(k=>k.startsWith(`${p.id}:`))?'Este pago tiene un reparto registrado':'Editar los datos del pago'}>Editar datos</button>{p.estado!=='cancelado'&&<button type="button" style={peligro} disabled={cargando} onClick={()=>cancelarCompromiso(p)}>Cancelar compromiso</button>}</div>{Object.keys(repartosRegistrados).some(k=>k.startsWith(`${p.id}:`))&&p.estado!=='cancelado'&&<p style={suave}>Este pago tiene un reparto registrado. Sus datos principales están protegidos; puedes cambiar el acuerdo desde su distribución o cancelar el compromiso completo.</p>}{p.estado==='cancelado'&&<div style={{background:'#fff7ed',border:'1px solid #fdba74',borderRadius:12,padding:14,marginTop:14,color:'#9a3412'}}>
<strong>Compromiso cancelado definitivamente</strong>
<p style={{margin:'8px 0 4px',fontSize:13}}><strong>Fecha de cancelación:</strong> {p.fecha_cancelacion||'No registrada'}</p>
<p style={{margin:'4px 0',fontSize:13}}><strong>Motivo:</strong> {p.motivo_cancelacion||'No registrado'}</p>
<p style={{margin:'4px 0',fontSize:13}}><strong>Alcance:</strong> {p.alcance_cancelacion==='recurrencia'?'Compromiso completo':p.alcance_cancelacion==='vencimiento'?'Vencimiento individual':'No especificado'}</p>
<p style={{margin:'9px 0 0',fontSize:12}}>Los acuerdos y las aportaciones anteriores se conservan para consulta.</p>
</div>}
{p.estado==='pendiente' && <div style={{marginTop:16,padding:14,border:'1px solid #bbd7c6',borderRadius:12,background:'#f2faf5'}}><strong style={{color:'#166534'}}>Confirmación del pago</strong><p style={{...suave,margin:'8px 0'}}>Registra la liquidación únicamente cuando el dinero se haya entregado. Las aportaciones por sí solas no confirman el pago.</p><button type="button" style={{...boton,background:'#167347'}} disabled={cargando} onClick={()=>marcarComoPagado(p)}>{cargando?'Procesando…':'✓ Marcar como pagado'}</button></div>}{vencimientosPagados.some(v=>v.pago_id===p.id) && <div style={{...tarjeta,marginTop:14,background:'#f8fafc'}}><h4 style={{margin:'0 0 8px'}}>Historial de vencimientos pagados</h4>{vencimientosPagados.filter(v=>v.pago_id===p.id).map(v=><div key={v.id} style={{padding:'9px 0',borderTop:'1px solid #e2e8f0',fontSize:13}}><strong>Vencimiento {v.fecha_vencimiento}</strong><div>Pagado el {v.fecha_pago} · {v.confirmado_por===userId?'Confirmado por ti':'Confirmado por otro integrante'}</div>{v.nota&&<div style={suave}>{v.nota}</div>}</div>)}</div>}{p.estado==='pendiente' && <RepartoPago key={`${p.id}:${p.fecha_vencimiento}`} pago={p} espacioId={actual} userId={userId} integrantes={integrantes} inicialmenteAbierto />}</>
          })()}
          </> : <>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}><h3 style={titulo}>Pagos compartidos</h3><button type="button" style={boton} onClick={nuevoPago}>+ Nuevo pago</button></div>
          <input aria-label="Buscar pagos" placeholder="Buscar por concepto…" value={busquedaPagos} onChange={e=>setBusquedaPagos(e.target.value)} style={{...campo,marginTop:8}}/>
          <div style={{display:'flex',gap:6,marginBottom:14}}>{[['pendientes','Pendientes'],['todos','Todos'],['otros','Otros']].map(([v,t])=><button key={v} type="button" onClick={()=>setFiltroPagos(v)} style={{...secundario,margin:0,flex:1,padding:'9px 5px',background:filtroPagos===v?'#214d8b':'#edf3fb',color:filtroPagos===v?'white':'#214d8b',fontSize:12}}>{t}</button>)}</div>
          {(()=>{const visibles=pagos.filter(p=>(filtroPagos==='todos'||(filtroPagos==='pendientes'?p.estado==='pendiente':p.estado!=='pendiente'))&&p.concepto.toLowerCase().includes(busquedaPagos.toLowerCase()));return <><p style={{...suave,margin:'4px 0 10px'}}>{visibles.length} {visibles.length===1?'pago encontrado':'pagos encontrados'}</p>{visibles.map(p=><button type="button" key={p.id} onClick={()=>abrirDetallePago(p.id)} style={{display:'flex',width:'100%',alignItems:'center',justifyContent:'space-between',gap:10,textAlign:'left',padding:'15px 10px',border:'1px solid #e1e7ef',borderRadius:13,marginBottom:9,background:'#fff',cursor:'pointer',color:'#172235'}}><span style={{minWidth:0}}><strong style={{display:'block',overflow:'hidden',textOverflow:'ellipsis'}}>{p.concepto}</strong><small style={suave}>{p.fecha_vencimiento} · {p.estado}{repartosRegistrados[`${p.id}:${p.fecha_vencimiento}`]?' · Repartido':''}</small></span><span style={{textAlign:'right',flexShrink:0}}><strong>{moneda(p.monto)}</strong><br/><small style={{color:'#214d8b'}}>Detalle →</small></span></button>)}{!visibles.length&&<p style={suave}>No hay pagos con estos filtros.</p>}</>})()}
          </>}
          {vistaPago !== 'formulario' && <p style={suave}>Registra aportaciones desde la distribución del compromiso. Se reflejarán automáticamente en Movimientos.</p>}
        </div></>}
      </>}
    </>}
  </section>
}
