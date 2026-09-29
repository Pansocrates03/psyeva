import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import COLORS from "@/utils/Colors";
import Reactivo from "./Reactivo";
import { databaseService, ApiError } from "@/services/databaseService";
import type { CategoriaFormulario, EstudianteConEstado, GrupoConProgreso, PreguntaSesion } from "@/utils/types";
import {
  cardBodyStyle,
  cardStyle,
  CompletadoStep,
  ConfirmacionStep,
  InstruccionStep,
  LogoHeader,
  BienvenidaStep,
  SeleccionarAlumnoStep,
  SeleccionarFormularioStep,
  SeleccionarGrupoStep,
} from "@/components/encuesta/Pasos";
import type { FormularioDisponible } from "@/components/encuesta/Pasos";

interface EvaluacionActiva {
  evaluacionId: string;
  estado: "cerrado" | "abierto" | "publico";
}

type Seccion =
  | "bienvenida"
  | "seleccionarGrupo"
  | "seleccionarFormulario"
  | "seleccionarAlumno"
  | "confirmacion"
  | "instruccion"
  | "respondiendo"
  | "completado";

interface SesionActiva {
  sesionId: string;
  preguntas: PreguntaSesion[];
}

const FONDOS_POR_CATEGORIA: Record<CategoriaFormulario, { base: string; brillo: string; sombra: string }> = {
  emociones: { base: COLORS.violeta50, brillo: "#E5DAFF", sombra: "#F8F5FF" },
  bienestar_psicologico: { base: COLORS.verde50, brillo: "#DDF4C5", sombra: "#F7FCEF" },
  aprendizaje: { base: COLORS.azul50, brillo: "#CDEBFF", sombra: "#F3FAFF" },
};

function crearFondoMagico(categoria: CategoriaFormulario) {
  const colores = FONDOS_POR_CATEGORIA[categoria];
  return `radial-gradient(ellipse at 15% 20%, ${colores.brillo} 0%, transparent 48%), radial-gradient(ellipse at 85% 80%, ${colores.sombra} 0%, transparent 50%), linear-gradient(135deg, ${colores.base} 0%, ${colores.sombra} 100%)`;
}

export default function Encuesta() {
  const { id: evaluacionIdParam } = useParams<{ id?: string }>();
  const [seccion, setSeccion] = useState<Seccion>("bienvenida");
  const [estadoValidacion, setEstadoValidacion] = useState<"cargando" | "lista" | "error">("cargando");
  const [reintentoValidacion, setReintentoValidacion] = useState(0);
  const [escuela, setEscuela] = useState("");
  const [evaluacionActiva, setEvaluacionActiva] = useState<EvaluacionActiva | null>(null);
  const [grupos, setGrupos] = useState<GrupoConProgreso[]>([]);
  const [grupo, setGrupo] = useState<GrupoConProgreso | null>(null);
  const [formulario, setFormulario] = useState<FormularioDisponible | null>(null);
  const [estudiantes, setEstudiantes] = useState<EstudianteConEstado[]>([]);
  const [alumno, setAlumno] = useState<EstudianteConEstado | null>(null);
  const [sesion, setSesion] = useState<SesionActiva | null>(null);
  const [indexActual, setIndexActual] = useState(0);
  const [respuestasLocal, setRespuestasLocal] = useState<Record<string, number>>({});
  const [iniciando, setIniciando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [avanzando, setAvanzando] = useState(false);
  const [pasoError, setPasoError] = useState<string | null>(null);
  const [cargandoGrupos, setCargandoGrupos] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const PASOS: Seccion[] = ["bienvenida", "seleccionarGrupo", "seleccionarFormulario", "seleccionarAlumno"];
  const pasoActual = PASOS.indexOf(seccion);
  const fondoEncuesta = formulario ? crearFondoMagico(formulario.categoria) : undefined;

  const reiniciar = () => {
    setSeccion("bienvenida");
    setGrupo(null); setFormulario(null); setEstudiantes([]); setAlumno(null);
    setSesion(null); setIndexActual(0); setRespuestasLocal({});
  };

  useEffect(() => {
    let vigente = true;
    setEstadoValidacion("cargando");
    setLinkError(null);

    if (!evaluacionIdParam) {
      setLinkError("No se indicó qué evaluación abrir.");
      setEstadoValidacion("error");
      return () => { vigente = false; };
    }

    databaseService.facilitador.entrarPorEvaluacion(evaluacionIdParam)
      .then(evaluacion => {
        if (!vigente) return;
        if (evaluacion.estado !== "abierto") {
          setLinkError("Esta evaluación no está aceptando respuestas.");
          setEstadoValidacion("error");
          return;
        }
        setEscuela(evaluacion.colegioNombre);
        setEvaluacionActiva(evaluacion);
        setEstadoValidacion("lista");
      })
      .catch(err => {
        if (!vigente) return;
        setLinkError(err instanceof ApiError ? err.message : "No se pudo verificar esta evaluación.");
        setEstadoValidacion("error");
      });

    return () => { vigente = false; };
  }, [evaluacionIdParam, reintentoValidacion]);

  const handleContinuarBienvenida = async () => {
    if (!evaluacionActiva) return;
    setCargandoGrupos(true);
    setPasoError(null);
    try {
      const { grupos } = await databaseService.facilitador.listarGrupos(evaluacionActiva.evaluacionId);
      setGrupos(grupos); setSeccion("seleccionarGrupo");
    } catch (err) {
      setPasoError(err instanceof ApiError ? err.message : "No se pudieron cargar los grupos");
    } finally {
      setCargandoGrupos(false);
    }
  };

  const handleSeleccionarGrupo = (g: GrupoConProgreso) => {
    setGrupo(g); setSeccion("seleccionarFormulario");
  };

  const handleSeleccionarFormulario = async (f: FormularioDisponible) => {
    if (!grupo || !evaluacionActiva) return;
    setFormulario(f); setPasoError(null);
    try {
      const { estudiantes } = await databaseService.facilitador.listarEstudiantes(grupo.grupoId, evaluacionActiva.evaluacionId);
      setEstudiantes(estudiantes); setSeccion("seleccionarAlumno");
    } catch (err) {
      setPasoError(err instanceof ApiError ? err.message : "No se pudieron cargar los estudiantes");
    }
  };

  const handleSeleccionarAlumno = (a: EstudianteConEstado) => {
    setAlumno(a); setSeccion("confirmacion");
  };

  const handleIniciar = async () => {
    if (!alumno || !formulario || !evaluacionActiva) return;
    setIniciando(true);
    try {
      const { sesion: sesionResult, preguntas } = await databaseService.facilitador.iniciarSesion({
        estudianteId: alumno.estudianteId, formularioId: formulario.formularioId, evaluacionId: evaluacionActiva.evaluacionId,
      });
      const respuestasPrevias: Record<string, number> = {};
      preguntas.forEach(p => {
        if (p.textoLibre) {
          const opcion = p.opcionesRespuesta.find(o => o.texto === p.textoLibre);
          if (opcion) respuestasPrevias[p.id] = opcion.valor;
        }
      });
      const primerPendiente = preguntas.findIndex(p => !p.textoLibre);
      setSesion({ sesionId: sesionResult.sesionId, preguntas });
      setRespuestasLocal(respuestasPrevias);
      setIndexActual(primerPendiente === -1 ? 0 : primerPendiente);
      const primeraPregunta = preguntas[primerPendiente === -1 ? 0 : primerPendiente];
      setSeccion(primeraPregunta?.instruccionImagenUrl || primeraPregunta?.instruccionTexto ? "instruccion" : "respondiendo");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo iniciar la evaluación");
    } finally { setIniciando(false); }
  };

  const continuarInstruccion = () => setSeccion("respondiendo");

  const volverPreguntaAnterior = () => {
    if (indexActual === 0 || !sesion) return;
    const anteriorIndex = indexActual - 1;
    const anteriorPregunta = sesion.preguntas[anteriorIndex];
    const preguntaActual = sesion.preguntas[indexActual];
    setIndexActual(anteriorIndex);
    setSeccion(anteriorPregunta?.seccionId !== preguntaActual?.seccionId && (anteriorPregunta?.instruccionImagenUrl || anteriorPregunta?.instruccionTexto) ? "instruccion" : "respondiendo");
  };

  const avanzarConRespuesta = async (valor: number) => {
    if (!sesion) return;
    const pregunta = sesion.preguntas[indexActual];
    if (!pregunta) return;
    const opcion = pregunta.opcionesRespuesta.find(o => o.valor === valor);
    if (!opcion) return;
    setEnviando(true);
    try {
      await databaseService.facilitador.guardarRespuesta({ sesionId: sesion.sesionId, preguntaId: pregunta.id, textoLibre: opcion.texto });
      const esUltima = indexActual === sesion.preguntas.length - 1;
      if (!esUltima) {
        const siguienteIndex = indexActual + 1;
        const siguientePregunta = sesion.preguntas[siguienteIndex];
        setIndexActual(siguienteIndex);
        setSeccion(siguientePregunta?.seccionId !== pregunta.seccionId && (siguientePregunta?.instruccionImagenUrl || siguientePregunta?.instruccionTexto) ? "instruccion" : "respondiendo");
        return;
      }
      try {
        await databaseService.facilitador.completarSesion(sesion.sesionId);
        setSeccion("completado");
      } catch (err) {
        alert(err instanceof ApiError && err.status === 409 ? "Faltan preguntas por responder antes de terminar." : err instanceof ApiError ? err.message : "No se pudo completar la evaluación");
      }
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo guardar la respuesta");
    } finally { setEnviando(false); }
  };

  const preguntaActual = sesion?.preguntas[indexActual];
  const handleSeleccionarOpcion = (valor: number) => {
    if (!preguntaActual || enviando || avanzando) return;
    setRespuestasLocal(prev => ({ ...prev, [preguntaActual.id]: valor }));
  };

  const handleConfirmarRespuesta = () => {
    if (!preguntaActual || enviando || avanzando) return;
    const valorSeleccionado = respuestasLocal[preguntaActual.id];
    if (valorSeleccionado == null) return;
    void avanzarConRespuesta(valorSeleccionado);
  };

  const siguienteAlumno = () => {
    setSesion(null); setIndexActual(0); setRespuestasLocal({}); setAlumno(null); setSeccion("seleccionarAlumno");
    if (grupo && evaluacionActiva) {
      databaseService.facilitador.listarEstudiantes(grupo.grupoId, evaluacionActiva.evaluacionId)
        .then(({ estudiantes }) => setEstudiantes(estudiantes)).catch(() => {});
    }
  };

  return (
    <div className={fondoEncuesta ? "encuesta-fondo-magico" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: fondoEncuesta ?? `linear-gradient(135deg, ${COLORS.violeta50} 0%, ${COLORS.neutro50} 60%, ${COLORS.azul50} 100%)`, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {estadoValidacion !== "lista" ? (
        <div style={{ ...cardStyle, maxWidth: "calc(100vw - 32px)" }}>
          <LogoHeader />
          <div style={cardBodyStyle}>
            <p style={{ margin: 0, fontSize: 14, color: estadoValidacion === "error" ? COLORS.rojo400 : COLORS.neutro700, textAlign: "center" }}>
              {estadoValidacion === "cargando" ? "Verificando que la evaluación esté disponible..." : linkError}
            </p>
            {estadoValidacion === "error" && <button onClick={() => setReintentoValidacion(value => value + 1)} style={{ width: "100%", marginTop: 16, padding: 11, border: 0, borderRadius: 8, background: COLORS.violeta400, color: "white", fontWeight: 600, cursor: "pointer" }}>Reintentar</button>}
          </div>
        </div>
      ) : <>
        {(seccion === "bienvenida" || seccion === "seleccionarGrupo" || seccion === "seleccionarFormulario" || seccion === "seleccionarAlumno") && <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
          {PASOS.map((s, i) => { const activo = s === seccion; const completado = PASOS.indexOf(s) < pasoActual; return <React.Fragment key={s}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: completado ? COLORS.verde400 : activo ? COLORS.violeta400 : COLORS.neutro100, color: completado || activo ? "#fff" : COLORS.neutro400, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>{completado ? <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg> : i + 1}</div>
            {i < PASOS.length - 1 && <div style={{ width: 28, height: 2, borderRadius: 2, background: completado ? COLORS.verde400 : COLORS.neutro100 }} />}
          </React.Fragment>; })}
        </div>}
        {pasoError && <p style={{ marginBottom: 12, fontSize: 13, color: COLORS.rojo400, textAlign: "center" }}>{pasoError}</p>}
        {seccion === "bienvenida" && <BienvenidaStep onContinue={() => void handleContinuarBienvenida()} loading={cargandoGrupos} />}
        {seccion === "seleccionarGrupo" && <SeleccionarGrupoStep escuela={escuela} grupos={grupos} onBack={reiniciar} onContinue={handleSeleccionarGrupo} />}
        {seccion === "seleccionarFormulario" && grupo && <SeleccionarFormularioStep escuela={escuela} grupo={grupo} onBack={() => setSeccion("seleccionarGrupo")} onContinue={handleSeleccionarFormulario} />}
        {seccion === "seleccionarAlumno" && grupo && formulario && <SeleccionarAlumnoStep escuela={escuela} grupo={grupo} formulario={formulario} estudiantes={estudiantes} onBack={() => setSeccion("seleccionarFormulario")} onContinue={handleSeleccionarAlumno} />}
        {seccion === "confirmacion" && alumno && formulario && <ConfirmacionStep alumno={alumno} formulario={formulario} iniciando={iniciando} onIniciar={handleIniciar} />}
        {seccion === "instruccion" && sesion && preguntaActual && alumno && <InstruccionStep key={preguntaActual.id} pregunta={preguntaActual} nombreEstudiante={alumno.nombreCompleto} onContinue={continuarInstruccion} />}
        {seccion === "respondiendo" && sesion && preguntaActual && alumno && <div style={{ width: "100%" }}><Reactivo pregunta={preguntaActual.texto} imagenUrl={preguntaActual.imagenUrl ?? undefined} instruccionTexto={preguntaActual.instruccionTexto ?? undefined} instruccionImagenUrl={preguntaActual.instruccionImagenUrl ?? undefined} opciones={preguntaActual.opcionesRespuesta.map(o => ({ label: o.texto, value: o.valor }))} numeroPregunta={indexActual + 1} totalPreguntas={sesion.preguntas.length} nombreEstudiante={alumno.nombreCompleto} valorSeleccionado={respuestasLocal[preguntaActual.id] ?? null} onSeleccionar={handleSeleccionarOpcion} onConfirmar={handleConfirmarRespuesta} onAnterior={indexActual > 0 ? volverPreguntaAnterior : undefined} avanzando={avanzando || enviando} esUltima={indexActual === sesion.preguntas.length - 1} background={fondoEncuesta} /></div>}
        {seccion === "completado" && alumno && <CompletadoStep alumno={alumno} onSiguienteAlumno={siguienteAlumno} />}
      </>}
    </div>
  );
}
