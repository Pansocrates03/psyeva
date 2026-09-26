-- Migración de producción: códigos cortos y estado único de evaluación.
-- Conserva las filas, UUID, sesiones, respuestas, grupos, alumnos y reportes.
-- Ejecutar una sola vez desde la raíz del proyecto:
--   psql -v ON_ERROR_STOP=1 -U postgres -d psyeva1 -f db/migracion-produccion-estado-evaluacion.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE estado_evaluacion AS ENUM ('cerrado', 'abierto', 'publico');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION codigo_evaluacion_aleatorio()
RETURNS TEXT AS $$
DECLARE
  caracteres CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  aleatorios BYTEA;
  resultado TEXT;
  i INTEGER;
BEGIN
  LOOP
    aleatorios := gen_random_bytes(6);
    resultado := '';
    FOR i IN 0..5 LOOP
      resultado := resultado || substr(caracteres, (get_byte(aleatorios, i) & 31) + 1, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM evaluacion ev WHERE ev.codigo_acceso::text = resultado
    );
  END LOOP;
  RETURN resultado;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Completa códigos faltantes sin cambiar UUIDs ni referencias existentes.
ALTER TABLE evaluacion ADD COLUMN IF NOT EXISTS codigo_acceso CHAR(6);
DO $$
DECLARE
  v_id UUID;
BEGIN
  FOR v_id IN SELECT id FROM evaluacion WHERE codigo_acceso IS NULL LOOP
    UPDATE evaluacion
    SET codigo_acceso = codigo_evaluacion_aleatorio()
    WHERE id = v_id;
  END LOOP;
END $$;
ALTER TABLE evaluacion ALTER COLUMN codigo_acceso SET DEFAULT codigo_evaluacion_aleatorio();
ALTER TABLE evaluacion ALTER COLUMN codigo_acceso SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'evaluacion'::regclass
      AND conname = 'evaluacion_codigo_acceso_key'
  ) THEN
    ALTER TABLE evaluacion
      ADD CONSTRAINT evaluacion_codigo_acceso_key UNIQUE (codigo_acceso);
  END IF;
END $$;

-- La vista actual puede depender de las columnas booleanas que se retirarán.
DROP VIEW IF EXISTS vista_progreso_evaluacion;

ALTER TABLE evaluacion ADD COLUMN IF NOT EXISTS estado estado_evaluacion;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'evaluacion' AND column_name = 'acepta_respuestas'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'evaluacion' AND column_name = 'reportes_publicados'
  ) THEN
    EXECUTE $sql$
      UPDATE evaluacion
      SET estado = COALESCE(estado, CASE
        WHEN reportes_publicados THEN 'publico'::estado_evaluacion
        WHEN acepta_respuestas THEN 'abierto'::estado_evaluacion
        ELSE 'cerrado'::estado_evaluacion
      END)
    $sql$;
  ELSE
    UPDATE evaluacion SET estado = 'cerrado' WHERE estado IS NULL;
  END IF;
END $$;

ALTER TABLE evaluacion ALTER COLUMN estado SET DEFAULT 'cerrado';
ALTER TABLE evaluacion ALTER COLUMN estado SET NOT NULL;
DROP INDEX IF EXISTS idx_evaluacion_acepta;
DROP INDEX IF EXISTS idx_evaluacion_publicados;
ALTER TABLE evaluacion DROP COLUMN IF EXISTS acepta_respuestas;
ALTER TABLE evaluacion DROP COLUMN IF EXISTS reportes_publicados;
CREATE INDEX IF NOT EXISTS idx_evaluacion_estado ON evaluacion(estado);

COMMENT ON COLUMN evaluacion.estado IS 'Ciclo de vida: cerrado, abierto o publico.';
COMMENT ON COLUMN evaluacion.codigo_acceso IS 'Código corto público para compartir enlaces; no es un mecanismo de autenticación.';

CREATE OR REPLACE VIEW vista_progreso_evaluacion AS
SELECT
  ev.id AS evaluacion_id,
  ev.codigo_acceso,
  ev.nombre,
  ev.fecha,
  ev.estado,
  ev.colegio_id,
  c.nombre AS colegio_nombre,
  COUNT(DISTINCT g.id) AS total_grupos,
  COUNT(DISTINCT e.id) AS total_alumnos,
  COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'completada') AS sesiones_completadas,
  COUNT(DISTINCT s.id) FILTER (WHERE s.estado != 'completada') AS sesiones_pendientes,
  COUNT(DISTINCT r.id) AS total_reportes
FROM evaluacion ev
JOIN colegio c ON c.id = ev.colegio_id
LEFT JOIN grupo g ON g.evaluacion_id = ev.id
LEFT JOIN estudiante e ON e.grupo_id = g.id
LEFT JOIN sesion s ON s.evaluacion_id = ev.id
LEFT JOIN reporte r ON r.evaluacion_id = ev.id
GROUP BY ev.id, c.nombre;

CREATE OR REPLACE FUNCTION iniciar_sesion(
  p_estudiante_id UUID,
  p_formulario_id UUID,
  p_evaluacion_id UUID
)
RETURNS TABLE (sesion_id UUID, estado estado_sesion, es_nueva BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_estado_evaluacion estado_evaluacion;
  v_sesion_id UUID;
  v_estado estado_sesion;
BEGIN
  SELECT ev.estado INTO v_estado_evaluacion
  FROM evaluacion AS ev
  WHERE ev.id = p_evaluacion_id;

  IF v_estado_evaluacion IS NULL THEN
    RAISE EXCEPTION 'evaluacion_no_encontrada'
      USING HINT = 'La evaluación no existe';
  END IF;
  IF v_estado_evaluacion <> 'abierto' THEN
    RAISE EXCEPTION 'evaluacion_cerrada'
      USING HINT = 'La evaluación no está aceptando respuestas';
  END IF;

  SELECT s.id, s.estado INTO v_sesion_id, v_estado
  FROM sesion AS s
  WHERE s.estudiante_id = p_estudiante_id
    AND s.formulario_id = p_formulario_id
    AND s.evaluacion_id = p_evaluacion_id;

  IF FOUND THEN
    IF v_estado = 'completada' THEN
      RAISE EXCEPTION 'sesion_ya_completada'
        USING HINT = 'Este alumno ya completó este formulario';
    END IF;
    RETURN QUERY SELECT v_sesion_id, v_estado, FALSE;
    RETURN;
  END IF;

  INSERT INTO sesion (estudiante_id, formulario_id, evaluacion_id, estado)
  VALUES (p_estudiante_id, p_formulario_id, p_evaluacion_id, 'pendiente')
  RETURNING id INTO v_sesion_id;

  RETURN QUERY SELECT v_sesion_id, 'pendiente'::estado_sesion, TRUE;
END;
$$;

COMMENT ON FUNCTION iniciar_sesion IS
  'Crea o recupera una sesión de forma atómica. Solo permite evaluaciones abiertas.';

COMMIT;
