import { useState } from "react";

interface ClipboardCopyProps {
  label?: string;
  copyText: string;
}

function ClipboardIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 8.5L6.25 11.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5.25" y="4.25" width="7.5" height="8.5" rx="1.25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.75 4.25V3.75C10.75 3.06 10.19 2.5 9.5 2.5H4.25C3.56 2.5 3 3.06 3 3.75V10C3 10.69 3.56 11.25 4.25 11.25H5.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

async function copyTextToClipboard(text: string): Promise<void> {
  const clipboard = (navigator as Navigator & { clipboard?: Clipboard }).clipboard;
  if (clipboard) {
    await clipboard.writeText(text);
    return;
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "true");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("No se pudo copiar el texto al portapapeles");
    }
  } finally {
    document.body.removeChild(input);
  }
}

export default function ClipboardCopy({ label, copyText }: ClipboardCopyProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyClick = async () => {
    copyTextToClipboard(copyText)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 1500);
      })
      .catch((error: unknown) => {
        console.error("No se pudo copiar el texto", error);
      });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 4px" }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 600, color: "#525150", whiteSpace: "nowrap" }}>
          {label}
        </span>
      )}
      <input
        type="text"
        value={copyText}
        readOnly
        aria-label={label ?? "Texto que se copiará"}
        style={{
          width: 190,
          padding: "7px 9px",
          border: "1px solid #D6D4CE",
          borderRadius: 7,
          background: "#E8E7E2",
          color: "#525150",
          fontSize: 11,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <button
        type="button"
        onClick={handleCopyClick}
        aria-label={isCopied ? "Texto copiado" : "Copiar texto"}
        title={isCopied ? "Texto copiado" : "Copiar texto"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          padding: 0,
          border: "1px solid #D4BFFF",
          borderRadius: 7,
          background: "#F0EBFF",
          color: "#6A2FE0",
          cursor: "pointer",
        }}
      >
        <ClipboardIcon copied={isCopied} />
      </button>
    </div>
  );
}