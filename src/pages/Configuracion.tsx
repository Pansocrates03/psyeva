import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Sidebar from "../components/Sidebar";
import COLORS from "../utils/Colors";
import { databaseService, ApiError } from "../services/databaseService";
import type { ArchivoBucket } from "../utils/types";

interface CarpetaConfig {
  carpeta: string;
  titulo: string;
  descripcion: string;
}

// Mismas dos carpetas del allowlist de src/routes/admin/imagenes.ts —
// planas y compartidas entre todos los formularios, no una por set.
const CARPETAS: CarpetaConfig[] = [
  {
    carpeta: "assets/instrucciones",
    titulo: "Instrucciones de sección",
    descripcion: "Imágenes que reemplazan (o acompañan) el texto de instrucción de una sección.",
  },
  {
    carpeta: "assets/preguntas",
    titulo: "Imágenes de preguntas",
    descripcion: "Imágenes de apoyo para el enunciado de una pregunta puntual.",
  },
];

function GaleriaImagenes({ carpeta, titulo, descripcion }: CarpetaConfig) {
  const [imagenes, setImagenes] = useState<ArchivoBucket[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargar = () => {
    setLoading(true);
    setError(null);
    databaseService.admin.listarImagenes(carpeta)
      .then(setImagenes)
      .catch(err => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las imágenes"))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [carpeta]);

  const handleArchivoElegido = async (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    event.target.value = ""; // permite volver a elegir el mismo archivo después
    if (!archivo) return;

    setSubiendo(true);
    try {
      await databaseService.admin.subirImagen({ carpeta, archivo });
      cargar();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (img: ArchivoBucket) => {
    if (!confirm("¿Eliminar esta imagen? Si ya está usada en alguna pregunta o sección, esa referencia se va a romper.")) {
      return;
    }
    try {
      await databaseService.admin.eliminarImagen(carpeta, img.key);
      setImagenes(prev => prev.filter(i => i.key !== img.key));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar la imagen");
    }
  };

  return (
    <div style={{ background: "#fff", border: `1px solid ${COLORS.neutro100}`, borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: COLORS.neutro900 }}>{titulo}</h3>
          <p style={{ margin: 0, fontSize: 12, color: COLORS.neutro500 }}>{descripcion}</p>
        </div>

        <div style={{ flexShrink: 0 }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: "none" }}
            onChange={handleArchivoElegido}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 14px", borderRadius: 8,
              background: subiendo ? COLORS.neutro100 : COLORS.violeta400,
              border: "none",
              color: subiendo ? COLORS.neutro400 : "#fff",
              fontSize: 13, fontWeight: 600,
              cursor: subiendo ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <i className="ti ti-upload" style={{ fontSize: 14 }} aria-hidden="true" />
            {subiendo ? "Subiendo..." : "Subir imagen"}
          </button>
        </div>
      </div>

      {error ? (
        <p style={{ fontSize: 13, color: COLORS.rojo600, margin: 0 }}>{error}</p>
      ) : loading ? (
        <p style={{ fontSize: 13, color: COLORS.neutro500, margin: 0 }}>Cargando imágenes...</p>
      ) : imagenes.length === 0 ? (
        <p style={{ fontSize: 13, color: COLORS.neutro400, margin: 0 }}>Todavía no hay imágenes en esta carpeta.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
          {imagenes.map(img => (
            <div
              key={img.key}
              style={{
                position: "relative", borderRadius: 10, overflow: "hidden",
                border: `1px solid ${COLORS.neutro100}`, background: COLORS.neutro50,
              }}
            >
              <img src={img.url} alt="" loading="lazy" style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
              <button
                type="button"
                onClick={() => eliminar(img)}
                aria-label="Eliminar imagen"
                style={{
                  position: "absolute", top: 6, right: 6,
                  width: 26, height: 26, borderRadius: "50%",
                  border: "none", background: "rgba(0,0,0,0.55)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Configuracion() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.neutro50, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <Sidebar />

      <main style={{ flex: 1, padding: "32px 40px", minWidth: 0 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 4px", fontSize: 12, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Gestión
          </p>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: COLORS.neutro900 }}>Configuración</h1>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 600, color: COLORS.neutro900 }}>Imágenes de formularios</h2>
          <p style={{ margin: 0, fontSize: 13, color: COLORS.neutro500, maxWidth: 640 }}>
            Estas son las imágenes disponibles para elegir al armar una encuesta en "Encuestas base"
            (instrucción de sección o enunciado de una pregunta). Subilas o borralas acá — ya no hace
            falta pedirle a un desarrollador que las cargue a mano.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 900 }}>
          {CARPETAS.map(c => <GaleriaImagenes key={c.carpeta} {...c} />)}
        </div>
      </main>
    </div>
  );
}
