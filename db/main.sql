-- ============================================================
-- PSYEVA — Esquema PostgreSQL
-- ============================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE categoria_formulario AS ENUM (
  'emociones',
  'bienestar',
  'aprendizaje',
  'autoestima'
);

CREATE TYPE tipo_respuesta AS ENUM (
  'opcion_multiple',
  'texto_libre'
);

CREATE TYPE estado_sesion AS ENUM (
  'pendiente',
  'en_progreso',
  'completada'
);

CREATE TYPE tipo_reporte AS ENUM (
  'individual',
  'grupal',
  'general'
);

-- ============================================================
-- COLEGIO
-- ============================================================

CREATE TABLE colegio (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(255) NOT NULL,
  clave_acceso VARCHAR(100) NOT NULL UNIQUE,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FORMULARIO
-- Independiente de colegios y análisis — es el catálogo base
-- ============================================================

CREATE TABLE formulario (
  id          UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      VARCHAR(255)          NOT NULL,
  descripcion TEXT,
  categoria   categoria_formulario  NOT NULL,
  activo      BOOLEAN               NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP             NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PREGUNTA
-- ============================================================

CREATE TABLE pregunta (
  id             UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id  UUID             NOT NULL REFERENCES formulario(id) ON DELETE CASCADE,
  texto          TEXT             NOT NULL,
  imagen_url     VARCHAR(500),
  tipo_respuesta tipo_respuesta   NOT NULL DEFAULT 'opcion_multiple',
  orden          SMALLINT         NOT NULL,
  UNIQUE (formulario_id, orden)
);

-- ============================================================
-- OPCION DE RESPUESTA
-- ============================================================

CREATE TABLE opcion_respuesta (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta_id UUID      NOT NULL REFERENCES pregunta(id) ON DELETE CASCADE,
  texto       VARCHAR(500) NOT NULL,
  orden       SMALLINT  NOT NULL,
  UNIQUE (pregunta_id, orden)
);

-- ============================================================
-- ANÁLISIS
-- Una fotografía en el tiempo de un colegio
-- ============================================================

CREATE TABLE analisis (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id  UUID      NOT NULL REFERENCES colegio(id) ON DELETE RESTRICT,
  nombre      VARCHAR(255) NOT NULL,
  fecha       DATE      NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GRUPO
-- Los grupos pertenecen al análisis, no al colegio,
-- porque cambian cada año/semestre
-- ============================================================

CREATE TABLE grupo (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  analisis_id UUID      NOT NULL REFERENCES analisis(id) ON DELETE CASCADE,
  nombre      VARCHAR(100) NOT NULL,
  grado       VARCHAR(50),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ESTUDIANTE
-- ============================================================

CREATE TABLE estudiante (
  id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id       UUID      NOT NULL REFERENCES grupo(id) ON DELETE RESTRICT,
  nombre_completo VARCHAR(255) NOT NULL,
  curp           VARCHAR(18) UNIQUE,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ASIGNACION
-- Qué formularios debe responder cada grupo
-- ============================================================

CREATE TABLE asignacion (
  id            UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id      UUID      NOT NULL REFERENCES grupo(id) ON DELETE CASCADE,
  formulario_id UUID      NOT NULL REFERENCES formulario(id) ON DELETE RESTRICT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (grupo_id, formulario_id)
);

-- ============================================================
-- SESION
-- Registro de cada vez que un estudiante responde un formulario
-- analisis_id desnormalizado para simplificar queries de exportación
-- ============================================================

CREATE TABLE sesion (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID          NOT NULL REFERENCES estudiante(id) ON DELETE RESTRICT,
  formulario_id UUID          NOT NULL REFERENCES formulario(id) ON DELETE RESTRICT,
  analisis_id   UUID          NOT NULL REFERENCES analisis(id) ON DELETE RESTRICT,
  estado        estado_sesion NOT NULL DEFAULT 'pendiente',
  iniciada_at   TIMESTAMP,
  completada_at TIMESTAMP,
  UNIQUE (estudiante_id, formulario_id, analisis_id)
);

-- ============================================================
-- RESPUESTA
-- ============================================================

CREATE TABLE respuesta (
  id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id      UUID      NOT NULL REFERENCES sesion(id) ON DELETE CASCADE,
  pregunta_id    UUID      NOT NULL REFERENCES pregunta(id) ON DELETE RESTRICT,
  opcion_id      UUID      REFERENCES opcion_respuesta(id) ON DELETE RESTRICT,
  texto_libre    TEXT,
  respondida_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (sesion_id, pregunta_id),
  -- Validación: debe tener opcion_id o texto_libre, nunca ambos vacíos
  CONSTRAINT respuesta_valor_requerido CHECK (
    opcion_id IS NOT NULL OR texto_libre IS NOT NULL
  )
);

-- ============================================================
-- REPORTE
-- Tres tipos: individual (por estudiante), grupal, general
-- Las FK son opcionales según el tipo
-- ============================================================

CREATE TABLE reporte (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          tipo_reporte NOT NULL,
  analisis_id   UUID         NOT NULL REFERENCES analisis(id) ON DELETE RESTRICT,
  grupo_id      UUID         REFERENCES grupo(id) ON DELETE RESTRICT,
  estudiante_id UUID         REFERENCES estudiante(id) ON DELETE RESTRICT,
  archivo_url   VARCHAR(500) NOT NULL,
  publicado     BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),

  -- Validaciones de integridad por tipo
  CONSTRAINT reporte_grupal_requiere_grupo CHECK (
    tipo != 'grupal' OR grupo_id IS NOT NULL
  ),
  CONSTRAINT reporte_individual_requiere_estudiante CHECK (
    tipo != 'individual' OR estudiante_id IS NOT NULL
  ),
  CONSTRAINT reporte_general_sin_grupo CHECK (
    tipo != 'general' OR (grupo_id IS NULL AND estudiante_id IS NULL)
  ),
  CONSTRAINT reporte_individual_sin_grupo CHECK (
    tipo != 'individual' OR grupo_id IS NULL
  )
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Búsquedas frecuentes por colegio
CREATE INDEX idx_analisis_colegio     ON analisis(colegio_id);

-- Navegación grupo → análisis
CREATE INDEX idx_grupo_analisis       ON grupo(analisis_id);

-- Navegación estudiante → grupo
CREATE INDEX idx_estudiante_grupo     ON estudiante(grupo_id);

-- Exportación de respuestas por análisis (query más frecuente)
CREATE INDEX idx_sesion_analisis      ON sesion(analisis_id);
CREATE INDEX idx_sesion_estudiante    ON sesion(estudiante_id);
CREATE INDEX idx_sesion_formulario    ON sesion(formulario_id);

-- Respuestas por sesión
CREATE INDEX idx_respuesta_sesion     ON respuesta(sesion_id);

-- Reportes por análisis y tipo
CREATE INDEX idx_reporte_analisis     ON reporte(analisis_id);
CREATE INDEX idx_reporte_tipo         ON reporte(tipo);
CREATE INDEX idx_reporte_publicado    ON reporte(publicado) WHERE publicado = TRUE;

-- Asignaciones por grupo
CREATE INDEX idx_asignacion_grupo     ON asignacion(grupo_id);

-- ============================================================
-- COMENTARIOS DE TABLAS
-- ============================================================

COMMENT ON TABLE colegio          IS 'Instituciones educativas. La clave_acceso autentica al facilitador.';
COMMENT ON TABLE formulario       IS 'Catálogo de formularios/encuestas disponibles para asignar.';
COMMENT ON TABLE pregunta         IS 'Preguntas de cada formulario. imagen_url es la imagen del enunciado.';
COMMENT ON TABLE opcion_respuesta IS 'Opciones de respuesta de texto para preguntas de opción múltiple.';
COMMENT ON TABLE analisis         IS 'Instancia de evaluación de un colegio en un periodo específico.';
COMMENT ON TABLE grupo            IS 'Grupos dentro de un análisis. Cambian por año/semestre.';
COMMENT ON TABLE estudiante       IS 'Alumnos dentro de un grupo de un análisis.';
COMMENT ON TABLE asignacion       IS 'Qué formularios debe responder cada grupo.';
COMMENT ON TABLE sesion           IS 'Registro de un estudiante respondiendo un formulario en un análisis.';
COMMENT ON TABLE respuesta        IS 'Respuesta individual a cada pregunta dentro de una sesión.';
COMMENT ON TABLE reporte          IS 'PDFs subidos por el administrador: individual, grupal o general.';

COMMENT ON COLUMN reporte.grupo_id      IS 'Solo para tipo=grupal.';
COMMENT ON COLUMN reporte.estudiante_id IS 'Solo para tipo=individual.';
COMMENT ON COLUMN sesion.analisis_id    IS 'Desnormalizado para simplificar exports sin joins extra.';
COMMENT ON COLUMN pregunta.imagen_url   IS 'Imagen del enunciado, no de las opciones de respuesta.';