import { useEffect, useRef, useState, type ChangeEvent } from "react";
import Sidebar from "../components/Sidebar";
import ImagenThumbnail from "../components/ImagenThumbnail";
import COLORS from "../utils/Colors";
import { databaseService, ApiError } from "../services/databaseService";
import { CARPETA_INSTRUCCIONES, CARPETA_PREGUNTAS_POR_CATEGORIA, CATEGORIA_LABELS, CATEGORIAS } from "../utils/categorias";
import type { ArchivoBucket } from "../utils/types";

interface CarpetaConfig {
  carpeta: string;
  titulo: string;
  descripcion: string;
}

// Misma idea que src/routes/admin/imagenes.ts (CARPETAS_PERMITIDAS) y
// src/utils/categorias.ts (fuente de verdad de estos valores): una
// carpeta global para instrucciones + una carpeta de preguntas por cada
// categoría, para que el selector de un formulario de Emociones no
// termine mostrando imágenes pensadas para Aprendizaje, etc.
const CARPETA_INSTRUCCIONES_CONFIG: CarpetaConfig = {
  carpeta: CARPETA_INSTRUCCIONES,
  titulo: "Instrucciones de sección",
  descripcion: "Imágenes que reemplazan (o acompañan) el texto de instrucción de una sección — compartidas por las 3 categorías de formulario.",
};

const CARPETAS_PREGUNTAS_CONFIG: CarpetaConfig[] = CATEGORIAS.map(categoria => ({
  carpeta: CARPETA_PREGUNTAS_POR_CATEGORIA[categoria],
  titulo: `Preguntas — ${CATEGORIA_LABELS[categoria]}`,
  descripcion: `Imágenes de apoyo para el enunciado de una pregunta de formularios de ${CATEGORIA_LABELS[categoria]}.`,
}));

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
    const archivos = Array.from(event.target.files ?? []);
    event.target.value = ""; // permite volver a elegir el mismo archivo después
    if (archivos.length === 0) return;

    setSubiendo(true);
    try {
      await databaseService.admin.subirImagen({ carpeta, archivos });
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
            multiple
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
            <ImagenThumbnail
              key={img.key}
              src={img.url}
              name={img.key.split("/").pop() ?? img.key}
              onDelete={() => eliminar(img)}
            />
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

        <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 900 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Instrucciones (todas las categorías)
            </h3>
            <GaleriaImagenes {...CARPETA_INSTRUCCIONES_CONFIG} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLORS.neutro500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Preguntas por categoría
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {CARPETAS_PREGUNTAS_CONFIG.map(c => <GaleriaImagenes key={c.carpeta} {...c} />)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
