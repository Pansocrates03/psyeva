-- Migración de evaluacion.acepta_respuestas / reportes_publicados
-- a un único estado. Ejecutar una vez en bases ya existentes.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION codigo_evaluacion_aleatorio()
RETURNS TEXT AS $$
DECLARE
  caracteres CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  aleatorios BYTEA := gen_random_bytes(6);
  resultado TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 0..5 LOOP
    resultado := resultado || substr(caracteres, (get_byte(aleatorios, i) & 31) + 1, 1);
  END LOOP;
  RETURN resultado;
END;
$$ LANGUAGE plpgsql VOLATILE;

DO $$ BEGIN
  CREATE TYPE estado_evaluacion AS ENUM ('cerrado', 'abierto', 'publico');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Quitar objetos que aún dependen de las columnas antiguas; se recrean
-- con la nueva definición al aplicar db/procedures.sql después.
DROP VIEW IF EXISTS vista_progreso_evaluacion;
DROP FUNCTION IF EXISTS iniciar_sesion(UUID, UUID, UUID);

ALTER TABLE evaluacion
  ADD COLUMN IF NOT EXISTS codigo_acceso CHAR(6) DEFAULT codigo_evaluacion_aleatorio();
ALTER TABLE evaluacion ALTER COLUMN codigo_acceso SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'evaluacion'::regclass AND conname = 'evaluacion_codigo_acceso_key'
  ) THEN
    ALTER TABLE evaluacion ADD CONSTRAINT evaluacion_codigo_acceso_key UNIQUE (codigo_acceso);
  END IF;
END $$;

ALTER TABLE evaluacion ADD COLUMN IF NOT EXISTS estado estado_evaluacion;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluacion' AND column_name = 'acepta_respuestas'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'evaluacion' AND column_name = 'reportes_publicados'
  ) THEN
    UPDATE evaluacion
    SET estado = CASE
      WHEN reportes_publicados THEN 'publico'::estado_evaluacion
      WHEN acepta_respuestas THEN 'abierto'::estado_evaluacion
      ELSE 'cerrado'::estado_evaluacion
    END;
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
