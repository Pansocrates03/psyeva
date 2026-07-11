import type { CSSProperties, ReactNode } from "react";
import COLORS from "../utils/Colors";

export type TableAlign = "left" | "center" | "right";

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  align?: TableAlign;
  width?: string;
  render?: (row: T, index: number) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  getRowKey: (row: T, index: number) => string | number;
  emptyState?: ReactNode;
  rowStyle?: (row: T, index: number) => CSSProperties;
  hoverable?: boolean;
}

export default function Table<T>({
  columns,
  data,
  getRowKey,
  emptyState,
  rowStyle,
  hoverable = true,
}: TableProps<T>) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: COLORS.neutro50 }}>
          {columns.map(column => (
            <th
              key={column.key}
              style={{
                padding: "10px 20px",
                textAlign: column.align ?? "left",
                fontSize: 12,
                fontWeight: 600,
                color: COLORS.neutro500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                borderBottom: `1px solid ${COLORS.neutro100}`,
                width: column.width,
              }}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length > 0 ? data.map((row, index) => (
          <tr
            key={getRowKey(row, index)}
            style={{
              borderBottom: index < data.length - 1 ? `1px solid ${COLORS.neutro50}` : "none",
              transition: "background 0.1s",
              ...(rowStyle?.(row, index) ?? {}),
            }}
            onMouseEnter={hoverable ? event => {
              event.currentTarget.style.background = COLORS.neutro50;
            } : undefined}
            onMouseLeave={hoverable ? event => {
              event.currentTarget.style.background = "transparent";
            } : undefined}
          >
            {columns.map(column => (
              <td
                key={`${String(getRowKey(row, index))}-${column.key}`}
                style={{
                  padding: "14px 20px",
                  textAlign: column.align ?? "left",
                  fontSize: 14,
                  color: COLORS.neutro700,
                  verticalAlign: "top",
                }}
              >
                {column.render ? column.render(row, index) : (row as Record<string, unknown>)[column.key] as ReactNode}
              </td>
            ))}
          </tr>
        )) : (
          <tr>
            <td colSpan={columns.length} style={{ padding: "16px 20px", textAlign: "center", color: COLORS.neutro500 }}>
              {emptyState ?? "No hay registros disponibles."}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
