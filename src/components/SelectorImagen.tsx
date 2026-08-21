import { useEffect, useState } from "react";
import Modal from "./Modal";
import COLORS from "../utils/Colors";
import { databaseService, ApiError } from "../services/databaseService";
import type { ArchivoBucket } from "../utils/types";

interface SelectorImagenProps {
  /** Prefijo del bucket a listar — debe estar en el allowlist del backend */
  carpeta: string;
  /** URL actualmente elegida, o "" si no hay ninguna */
  value: string;
  onChange: (url: string) => void;
  /** Si se omite, no se renderiza el <label> (para usarlo inline en una fila) */
  label?: string;
}

// Selector de imágenes predefinidas (subidas al bucket de antemano, ver
// scripts/upload-form-emociones-assets.ts) para usar como imagen de una
// pregunta o instrucción de sección — reemplaza tener que pegar una URL
// a mano. La lista se pide al backend recién al abrir el modal, no en
// cada render (son ilustraciones de varios MB cada una).
export default function SelectorImagen({ carpeta, value, onChange, label }: SelectorImagenProps) {
  const [open, setOpen] = useState(false);
  const [imagenes, setImagenes] = useState<ArchivoBucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    databaseService.admin.listarImagenes(carpeta)
      .then(setImagenes)
      .catch(err => setError(err instanceof ApiError ? err.message : "No se pudieron cargar las imágenes"))
      .finally(() => setLoading(false));
  }, [open, carpeta]);

  return (
    <div>
      {label && (
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: COLORS.neutro700, marginBottom: 6 }}>
          {label}
        </label>
      )}

      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={value}
            alt=""
            style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8, border: `1px solid ${COLORS.neutro100}`, flexShrink: 0 }}
          />
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${COLORS.neutro100}`, background: "#fff", color: COLORS.neutro700, fontSize: 13, cursor: "pointer" }}
          >
            Cambiar
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: "transparent", color: COLORS.neutro500, fontSize: 13, cursor: "pointer" }}
          >
            Quitar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 14px", borderRadius: 8,
            border: `1px dashed ${COLORS.neutro100}`, background: COLORS.neutro50,
            color: COLORS.neutro700, fontSize: 13, cursor: "pointer",
          }}
        >
          <i className="ti ti-photo" style={{ fontSize: 15 }} aria-hidden="true" />
          Elegir imagen
        </button>
      )}

      {open && (
        <Modal title="Elegir imagen" onClose={() => setOpen(false)}>
          {loading ? (
            <p style={{ fontSize: 13, color: COLORS.neutro500, margin: 0 }}>Cargando imágenes...</p>
          ) : error ? (
            <p style={{ fontSize: 13, color: COLORS.rojo600, margin: 0 }}>{error}</p>
          ) : imagenes.length === 0 ? (
            <p style={{ fontSize: 13, color: COLORS.neutro500, margin: 0 }}>
              No hay imágenes disponibles en esta carpeta todavía.
            </p>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              maxHeight: 360,
              overflowY: "auto",
            }}>
              {imagenes.map(img => {
                const seleccionada = img.url === value;
                return (
                  <button
                    key={img.key}
                    type="button"
                    onClick={() => { onChange(img.url); setOpen(false); }}
                    style={{
                      padding: 0,
                      border: `2px solid ${seleccionada ? COLORS.violeta400 : "transparent"}`,
                      borderRadius: 8,
                      overflow: "hidden",
                      cursor: "pointer",
                      background: COLORS.neutro50,
                      lineHeight: 0,
                    }}
                  >
                    <img
                      src={img.url}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
