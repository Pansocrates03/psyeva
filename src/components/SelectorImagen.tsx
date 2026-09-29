import { useEffect, useState } from "react";
import Modal from "./Modal";
import ImagenThumbnail from "./ImagenThumbnail";
import COLORS from "../utils/Colors";
import { databaseService, ApiError } from "../services/databaseService";
import type { ArchivoBucket } from "../utils/types";

interface SelectorImagenProps {
  /** Prefijo del bucket a listar — debe estar en el allowlist del backend */
  carpeta: string;
  /** URL (firmada) de la imagen actualmente elegida, para mostrarla — "" si no hay ninguna */
  value: string;
  /**
   * key + url de la imagen elegida (el bucket es privado: se guarda el
   * key, la url firmada es solo para la vista previa inmediata y expira).
   * Al quitar la imagen se llama con key y url vacíos.
   */
  onChange: (seleccion: { key: string; url: string }) => void;
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
            aria-label="Cambiar imagen"
            title="Cambiar imagen"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, padding: 0, borderRadius: 8,
              border: `1px solid ${COLORS.violeta100}`, background: "#fff",
              color: COLORS.violeta600, cursor: "pointer",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Quitar imagen"
            title="Quitar imagen"
            onClick={() => onChange({ key: "", url: "" })}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${COLORS.neutro200}`, background: "#fff",
              color: COLORS.neutro500, cursor: "pointer",
              transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = COLORS.rojo50;
              e.currentTarget.style.borderColor = COLORS.rojo600;
              e.currentTarget.style.color = COLORS.rojo600;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = COLORS.neutro200;
              e.currentTarget.style.color = COLORS.neutro500;
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2.75C11.0215 2.75 10.1871 3.37503 9.87787 4.24993C9.73983 4.64047 9.31134 4.84517 8.9208 4.70713C8.53026 4.56909 8.32557 4.1406 8.46361 3.75007C8.97804 2.29459 10.3661 1.25 12 1.25C13.634 1.25 15.022 2.29459 15.5365 3.75007C15.6745 4.1406 15.4698 4.56909 15.0793 4.70713C14.6887 4.84517 14.2602 4.64047 14.1222 4.24993C13.813 3.37503 12.9785 2.75 12 2.75Z" fill="#1C274C"/>
            <path d="M2.75 6C2.75 5.58579 3.08579 5.25 3.5 5.25H20.5001C20.9143 5.25 21.2501 5.58579 21.2501 6C21.2501 6.41421 20.9143 6.75 20.5001 6.75H3.5C3.08579 6.75 2.75 6.41421 2.75 6Z" fill="#1C274C"/>
            <path d="M5.91508 8.45011C5.88753 8.03681 5.53015 7.72411 5.11686 7.75166C4.70356 7.77921 4.39085 8.13659 4.41841 8.54989L4.88186 15.5016C4.96735 16.7844 5.03641 17.8205 5.19838 18.6336C5.36678 19.4789 5.6532 20.185 6.2448 20.7384C6.83639 21.2919 7.55994 21.5307 8.41459 21.6425C9.23663 21.75 10.2751 21.75 11.5607 21.75H12.4395C13.7251 21.75 14.7635 21.75 15.5856 21.6425C16.4402 21.5307 17.1638 21.2919 17.7554 20.7384C18.347 20.185 18.6334 19.4789 18.8018 18.6336C18.9637 17.8205 19.0328 16.7844 19.1183 15.5016L19.5818 8.54989C19.6093 8.13659 19.2966 7.77921 18.8833 7.75166C18.47 7.72411 18.1126 8.03681 18.0851 8.45011L17.6251 15.3492C17.5353 16.6971 17.4712 17.6349 17.3307 18.3405C17.1943 19.025 17.004 19.3873 16.7306 19.6431C16.4572 19.8988 16.083 20.0647 15.391 20.1552C14.6776 20.2485 13.7376 20.25 12.3868 20.25H11.6134C10.2626 20.25 9.32255 20.2485 8.60915 20.1552C7.91715 20.0647 7.54299 19.8988 7.26957 19.6431C6.99616 19.3873 6.80583 19.025 6.66948 18.3405C6.52891 17.6349 6.46488 16.6971 6.37503 15.3492L5.91508 8.45011Z" fill="#1C274C"/>
            <path d="M9.42546 10.2537C9.83762 10.2125 10.2051 10.5132 10.2464 10.9254L10.7464 15.9254C10.7876 16.3375 10.4869 16.7051 10.0747 16.7463C9.66256 16.7875 9.29502 16.4868 9.25381 16.0746L8.75381 11.0746C8.71259 10.6625 9.0133 10.2949 9.42546 10.2537Z" fill="#1C274C"/>
            <path d="M15.2464 11.0746C15.2876 10.6625 14.9869 10.2949 14.5747 10.2537C14.1626 10.2125 13.795 10.5132 13.7538 10.9254L13.2538 15.9254C13.2126 16.3375 13.5133 16.7051 13.9255 16.7463C14.3376 16.7875 14.7051 16.4868 14.7464 16.0746L15.2464 11.0746Z" fill="#1C274C"/>
            </svg>
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
        <Modal title="Elegir imagen" onClose={() => setOpen(false)} width="min(900px, calc(100vw - 32px))">
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
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
              maxHeight: "65vh",
              overflowY: "auto",
              padding: 2,
            }}>
              {imagenes.map(img => {
                const seleccionada = img.url === value;
                return (
                  <ImagenThumbnail
                    key={img.key}
                    src={img.url}
                    name={img.key.split("/").pop() ?? img.key}
                    selected={seleccionada}
                    onClick={() => { onChange({ key: img.key, url: img.url }); setOpen(false); }}
                    size="md"
                  />
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
