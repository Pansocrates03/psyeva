import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ApiError, databaseService } from "../../services/databaseService";
import COLORS from "../../utils/Colors";
import type { ArchivoBucket } from "../../utils/types";

function IconoCarpeta({ className }: { className?: string }) {
    return (
        <svg className={className} width="22" height="20" viewBox="0 0 22 20" fill="none" aria-hidden="true">
            <path d="M1.5 4.5A2.5 2.5 0 0 1 4 2h5l2 2h7A2.5 2.5 0 0 1 20.5 6.5v9A2.5 2.5 0 0 1 18 18H4a2.5 2.5 0 0 1-2.5-2.5v-11Z" fill={COLORS.ambar400} />
            <path d="M1.5 7h19" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" />
        </svg>
    );
}

function IconoActualizar() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 7v5h-5M4 17v-5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5.6 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconoNuevaCarpeta() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-10Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M12 10v6m-3-3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

function IconoSubir() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconoChevron() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconoEnlaceExterno() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 4h6v6m0-6-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const UUID_REGEX = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

export default function DetalleAnalisisReportes({ evaluacionId, modo = "admin" }: {
    evaluacionId: string;
    modo?: "admin" | "facilitador";
}) {
    const esAdmin = modo === "admin";
    const [archivos, setArchivos] = useState<ArchivoBucket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [recarga, setRecarga] = useState(0);
    const [subiendo, setSubiendo] = useState(false);
    const [carpetaActual, setCarpetaActual] = useState("");
    const [mostrarCrearCarpeta, setMostrarCrearCarpeta] = useState(false);
    const [nombreCarpeta, setNombreCarpeta] = useState("");
    const [creandoCarpeta, setCreandoCarpeta] = useState(false);
    const [resultadoCarga, setResultadoCarga] = useState<{ subidos: number; archivos: string[] } | null>(null);
    const [carpetas, setCarpetas] = useState<string[]>([]);
    const inputArchivosRef = useRef<HTMLInputElement>(null);

    const subirArchivos = async (event: ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget;
        const seleccionados = Array.from(input.files ?? []);
        input.value = "";
        if (!evaluacionId || seleccionados.length === 0) return;
        if (seleccionados.length > 100) {
            window.alert("No se pueden subir más de 100 archivos a la vez.");
            return;
        }

        setSubiendo(true);
        setResultadoCarga(null);
        try {
            const resultado = await databaseService.admin.subirArchivosReportes(evaluacionId, seleccionados, carpetaActual);
            setResultadoCarga(resultado);
            setRecarga(actual => actual + 1);
        } catch (err) {
            window.alert(err instanceof ApiError ? err.message : "No se pudieron subir los reportes");
        } finally {
            setSubiendo(false);
        }
    };

    const crearCarpeta = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!evaluacionId || !nombreCarpeta.trim()) return;
        setCreandoCarpeta(true);
        try {
            await databaseService.admin.crearCarpetaReportes(evaluacionId, carpetaActual, nombreCarpeta.trim());
            setNombreCarpeta("");
            setMostrarCrearCarpeta(false);
            setRecarga(actual => actual + 1);
        } catch (err) {
            window.alert(err instanceof ApiError ? err.message : "No se pudo crear la carpeta");
        } finally {
            setCreandoCarpeta(false);
        }
    };

    useEffect(() => {
        let activo = true;
        if (!UUID_REGEX.test(evaluacionId)) {
            setError("El identificador de la evaluación no es un UUID válido");
            setLoading(false);
            return () => { activo = false; };
        }

        setLoading(true);
        setError(null);

        (esAdmin
            ? databaseService.admin.listarArchivosReportes(evaluacionId, carpetaActual)
            : databaseService.facilitador.listarArchivosReportes(evaluacionId, carpetaActual))
            .then(data => {
                if (activo) {
                    setArchivos(data.files);
                    setCarpetas(data.folders);
                }
            })
            .catch(err => {
                if (activo) setError(err instanceof ApiError ? err.message : "No se pudieron cargar los archivos");
            })
            .finally(() => {
                if (activo) setLoading(false);
            });

        return () => { activo = false; };
    }, [recarga, evaluacionId, carpetaActual, esAdmin]);

    const navegarCarpeta = (ruta: string) => {
        setCarpetaActual(ruta);
        setResultadoCarga(null);
    };
    const segmentosCarpeta = carpetaActual ? carpetaActual.split("/") : [];

    return (
        <div style={{ marginTop: 24, background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${COLORS.neutro100}` }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.neutro900 }}>Archivos en storage</h3>
                    <div style={{ fontSize: 12, color: COLORS.neutro500, marginTop: 2 }}>
                        {loading ? "Cargando carpeta..." : `${archivos.length} archivos · ${carpetas.length} carpetas`}
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                        type="button"
                        onClick={() => setRecarga(actual => actual + 1)}
                        disabled={loading || subiendo || creandoCarpeta}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "8px 12px", borderRadius: 8,
                            border: `1px solid ${COLORS.neutro100}`, background: "#fff",
                            color: COLORS.neutro700, fontSize: 12, fontWeight: 600,
                            cursor: loading || subiendo ? "wait" : "pointer", opacity: loading || subiendo ? 0.6 : 1,
                        }}
                    >
                        <IconoActualizar />
                        Actualizar
                    </button>
                    {esAdmin && <button
                        type="button"
                        onClick={() => setMostrarCrearCarpeta(actual => !actual)}
                        disabled={loading || subiendo || creandoCarpeta || !evaluacionId}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "8px 12px", borderRadius: 8,
                            border: `1px solid ${COLORS.neutro100}`, background: "#fff",
                            color: COLORS.neutro700, fontSize: 12, fontWeight: 600,
                            cursor: loading || subiendo || creandoCarpeta ? "wait" : "pointer",
                            opacity: loading || subiendo || creandoCarpeta ? 0.6 : 1,
                        }}
                    >
                        <IconoNuevaCarpeta />
                        Crear carpeta
                    </button>}
                    {esAdmin && <input
                        ref={inputArchivosRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        multiple
                        onChange={subirArchivos}
                        disabled={subiendo || creandoCarpeta || !evaluacionId}
                        style={{ display: "none" }}
                    />}
                    {esAdmin && <button
                        type="button"
                        onClick={() => inputArchivosRef.current?.click()}
                        disabled={subiendo || creandoCarpeta || !evaluacionId}
                        aria-busy={subiendo}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "8px 12px", borderRadius: 8,
                            border: `1px solid ${COLORS.violeta100}`, background: COLORS.violeta50,
                            color: COLORS.violeta600, fontSize: 12, fontWeight: 600,
                            cursor: subiendo || creandoCarpeta || !evaluacionId ? "wait" : "pointer",
                            opacity: subiendo || creandoCarpeta || !evaluacionId ? 0.6 : 1,
                        }}
                    >
                        {!subiendo && <IconoSubir />}
                        {subiendo ? "Subiendo..." : "Subir archivos"}
                    </button>}
                </div>
                
            </div>

            {esAdmin && mostrarCrearCarpeta && (
                <form
                    onSubmit={crearCarpeta}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 20px", borderBottom: `1px solid ${COLORS.neutro100}` }}
                >
                    <label htmlFor="nombre-nueva-carpeta" style={{ color: COLORS.neutro700, fontSize: 13, fontWeight: 600 }}>
                        Nombre de carpeta
                    </label>
                    <input
                        id="nombre-nueva-carpeta"
                        autoFocus
                        value={nombreCarpeta}
                        onChange={event => setNombreCarpeta(event.target.value)}
                        maxLength={100}
                        placeholder="Ej. Reportes grupales"
                        disabled={creandoCarpeta}
                        style={{ flex: 1, minWidth: 120, padding: "8px 10px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 7, fontSize: 13 }}
                    />
                    <button
                        type="submit"
                        disabled={creandoCarpeta || !nombreCarpeta.trim()}
                        style={{ padding: "8px 12px", border: 0, borderRadius: 7, background: COLORS.violeta600, color: "#fff", fontSize: 12, fontWeight: 600, cursor: creandoCarpeta ? "wait" : "pointer", opacity: creandoCarpeta || !nombreCarpeta.trim() ? 0.6 : 1 }}
                    >
                        {creandoCarpeta ? "Creando..." : "Guardar"}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setMostrarCrearCarpeta(false); setNombreCarpeta(""); }}
                        disabled={creandoCarpeta}
                        style={{ padding: "8px 10px", border: `1px solid ${COLORS.neutro100}`, borderRadius: 7, background: "#fff", color: COLORS.neutro700, fontSize: 12, cursor: "pointer" }}
                    >
                        Cancelar
                    </button>
                </form>
            )}

            <nav aria-label="Ruta de carpetas" style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "10px 20px", borderBottom: `1px solid ${COLORS.neutro50}`, fontSize: 12 }}>
                <button type="button" onClick={() => navegarCarpeta("")} style={{ border: 0, padding: 0, background: "transparent", color: carpetaActual ? COLORS.violeta600 : COLORS.neutro700, cursor: carpetaActual ? "pointer" : "default", fontWeight: 600 }}>
                    Reportes
                </button>
                {segmentosCarpeta.map((segmento, indice) => (
                    <span key={`${segmento}-${indice}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span aria-hidden="true" style={{ color: COLORS.neutro400 }}>/</span>
                        <button type="button" onClick={() => navegarCarpeta(segmentosCarpeta.slice(0, indice + 1).join("/"))} style={{ border: 0, padding: 0, background: "transparent", color: indice === segmentosCarpeta.length - 1 ? COLORS.neutro700 : COLORS.violeta600, cursor: indice === segmentosCarpeta.length - 1 ? "default" : "pointer", fontWeight: 600 }}>
                            {segmento}
                        </button>
                    </span>
                ))}
            </nav>

            {error ? (
                <div role="alert" style={{ padding: "18px 20px", color: COLORS.rojo600, fontSize: 13 }}>
                    {error}
                </div>
            ) : loading ? (
                <div role="status" style={{ padding: "18px 20px", color: COLORS.neutro500, fontSize: 13 }}>
                    Cargando archivos del storage...
                </div>
            ) : archivos.length === 0 && carpetas.length === 0 ? (
                <div style={{ padding: "18px 20px", color: COLORS.neutro500, fontSize: 13 }}>
                    Esta carpeta está vacía.
                </div>
            ) : (
                <div>
                    {carpetas.map(carpeta => {
                        const ruta = carpetaActual ? `${carpetaActual}/${carpeta}` : carpeta;
                        return (
                            <button
                                key={ruta}
                                type="button"
                                onClick={() => navegarCarpeta(ruta)}
                                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", minHeight: 44, padding: "8px 20px", border: 0, borderBottom: `1px solid ${COLORS.neutro50}`, background: "#fff", textAlign: "left", color: COLORS.neutro700, fontSize: 13, cursor: "pointer" }}
                                onMouseEnter={event => { event.currentTarget.style.background = COLORS.violeta50; }}
                                onMouseLeave={event => { event.currentTarget.style.background = "#fff"; }}
                            >
                                <IconoCarpeta />
                                <span style={{ flex: 1 }}>{carpeta}</span>
                                <span style={{ display: "inline-flex", color: COLORS.neutro400 }}><IconoChevron /></span>
                            </button>
                        );
                    })}
                    {archivos.map(archivo => {
                        const nombre = archivo.key.split("/").pop() ?? archivo.key;
                        return (
                            <a
                                key={archivo.key}
                                href={archivo.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    minHeight: 44, padding: "8px 20px",
                                    borderBottom: `1px solid ${COLORS.neutro50}`,
                                    textDecoration: "none", color: COLORS.neutro700, fontSize: 13,
                                }}
                                onMouseEnter={event => { event.currentTarget.style.background = COLORS.violeta50; }}
                                onMouseLeave={event => { event.currentTarget.style.background = "#fff"; }}
                            >
                                <svg
                                    width="20"
                                    height="22"
                                    viewBox="0 0 20 22"
                                    fill="none"
                                    aria-hidden="true"
                                    style={{ flexShrink: 0 }}
                                >
                                    <path d="M3 1.75h8l5.25 5.3v12.2A1.75 1.75 0 0 1 14.5 21h-11A1.75 1.75 0 0 1 1.75 19.25v-15.75A1.75 1.75 0 0 1 3.5 1.75Z" fill="#FFF5F5" stroke={COLORS.rojo400} strokeWidth="1.5" />
                                    <path d="M11 2v5.5h5.25" stroke={COLORS.rojo400} strokeWidth="1.5" strokeLinejoin="round" />
                                    <path d="M4.2 12.5h11.6v4.7H4.2z" fill={COLORS.rojo400} />
                                    <text x="10" y="16" textAnchor="middle" fill="#fff" fontSize="4.3" fontWeight="700" fontFamily="Arial, sans-serif">PDF</text>
                                </svg>
                                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {nombre}
                                </span>
                                <span style={{ display: "inline-flex", color: COLORS.neutro400 }}><IconoEnlaceExterno /></span>
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}