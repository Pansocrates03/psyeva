-- ============================================================
-- PSYEVA — Esquema PostgreSQL v4
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE categoria_formulario AS ENUM (
  'emociones',
  'bienestar_psicologico',
  'aprendizaje'
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
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       VARCHAR(255) NOT NULL,
  clave_acceso VARCHAR(100) NOT NULL UNIQUE,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  colegio              IS 'Instituciones educativas que contratan el servicio.';
COMMENT ON COLUMN colegio.clave_acceso IS 'Clave compartida con el facilitador para acceder a encuestas y reportes.';

-- ============================================================
-- FORMULARIO
-- Catálogo base de encuestas — independiente de colegios.
-- Se elimina el campo "activo" ya que el control de acceso
-- ahora lo maneja evaluacion.acepta_respuestas.
-- ============================================================

CREATE TABLE formulario (
  id          UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      VARCHAR(255)         NOT NULL,
  descripcion TEXT,
  categoria   categoria_formulario NOT NULL,
  created_at  TIMESTAMP            NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE formulario IS 'Catálogo de formularios disponibles para asignar a grupos.';

-- ============================================================
-- SECCION
-- Un formulario se divide en secciones (ej. "ítems 1-5", "ítems
-- 6-11" en el instrumento original en papel). Cada sección tiene
-- UNA instrucción y UN set de opciones de respuesta compartido
-- por todas sus preguntas — así se evita repetir el mismo JSONB
-- de opciones en cada pregunta (antes vivía en pregunta, uno por
-- fila, siendo casi siempre idéntico dentro de un mismo bloque).
--
-- La instrucción puede ser texto, una imagen, o ambos — el
-- instrumento original a veces reemplaza la instrucción por un
-- dibujo para niños que aún no leen bien (de ahí que las dos
-- columnas sean nullable con el CHECK de "al menos una").
--
-- orden = posición de la sección dentro del formulario.
--
-- Estructura esperada de opciones_respuesta (igual que antes):
-- [
--   { "valor": 1, "texto": "Nunca"         },
--   { "valor": 2, "texto": "Casi nunca"    },
--   { "valor": 3, "texto": "Algunas veces" },
--   { "valor": 4, "texto": "Casi siempre"  }
-- ]
-- ============================================================

CREATE TABLE seccion (
  id                     UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id          UUID  NOT NULL REFERENCES formulario(id) ON DELETE CASCADE,
  orden                  INT   NOT NULL,
  instruccion_texto      TEXT,
  instruccion_imagen_url VARCHAR(500),
  opciones_respuesta     JSONB NOT NULL DEFAULT '[]',
  UNIQUE (formulario_id, orden),
  CONSTRAINT seccion_instruccion_requerida CHECK (
    instruccion_texto IS NOT NULL OR instruccion_imagen_url IS NOT NULL
  )
);

COMMENT ON TABLE  seccion                          IS 'Bloque de preguntas de un formulario que comparten instrucción y opciones de respuesta.';
COMMENT ON COLUMN seccion.instruccion_texto        IS 'Instrucción en texto. Puede ir junto con o reemplazada por instruccion_imagen_url.';
COMMENT ON COLUMN seccion.instruccion_imagen_url   IS 'Instrucción como imagen (bucket S3), para secciones dirigidas a niños que aún no leen bien.';
COMMENT ON COLUMN seccion.opciones_respuesta       IS 'Array JSONB compartido por todas las preguntas de la sección: [{ "valor": 1, "texto": "Nunca" }, ...].';
COMMENT ON COLUMN seccion.orden                    IS 'Posición de la sección dentro del formulario (0-based o 1-based, a elección del código que la crea).';

-- ============================================================
-- PREGUNTA
-- imagen_url = imagen del enunciado puntual de ESTE ítem (no de
-- la instrucción de la sección, que es seccion.instruccion_imagen_url,
-- ni de las opciones de respuesta — esas viven en seccion).
--
-- formulario_id se elimina a propósito: se deriva de
-- seccion.formulario_id. Mantenerlo denormalizado en pregunta
-- arriesgaba que una pregunta quedara "huérfana" de su propio
-- formulario si se movía a otra sección de otro formulario.
--
-- orden = posición de la pregunta dentro de su sección.
-- ============================================================

CREATE TABLE pregunta (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  seccion_id UUID  NOT NULL REFERENCES seccion(id) ON DELETE CASCADE,
  orden      INT   NOT NULL,
  texto      TEXT  NOT NULL,
  imagen_url VARCHAR(500),
  UNIQUE (seccion_id, orden)
);

COMMENT ON TABLE  pregunta            IS 'Preguntas (ítems) de cada sección.';
COMMENT ON COLUMN pregunta.imagen_url IS 'Imagen del enunciado de este ítem puntual, no de la instrucción de la sección ni de las opciones de respuesta.';
COMMENT ON COLUMN pregunta.orden      IS 'Posición de la pregunta dentro de su sección.';

-- ============================================================
-- EVALUACION (antes: analisis)
-- Instancia de evaluación de un colegio en un periodo.
--
-- acepta_respuestas: controla si los alumnos pueden responder.
--   El administrador lo activa cuando la evaluación está lista
--   y lo desactiva al cerrar el periodo.
--
-- reportes_publicados: controla si el facilitador puede ver
--   y descargar los reportes. Se activa una vez que PSYEVA
--   ha subido y revisado todos los reportes.
-- ============================================================

CREATE TABLE evaluacion (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  colegio_id          UUID         NOT NULL REFERENCES colegio(id) ON DELETE RESTRICT,
  nombre              VARCHAR(255) NOT NULL,
  acepta_respuestas   BOOLEAN      NOT NULL DEFAULT FALSE,
  reportes_publicados BOOLEAN      NOT NULL DEFAULT FALSE,
  fecha               DATE         NOT NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  evaluacion                     IS 'Instancia de evaluación de un colegio en un periodo específico.';
COMMENT ON COLUMN evaluacion.acepta_respuestas   IS 'TRUE = alumnos pueden responder. El admin lo activa/desactiva.';
COMMENT ON COLUMN evaluacion.reportes_publicados IS 'TRUE = facilitador puede ver y descargar los reportes.';

-- ============================================================
-- GRUPO
-- Pertenece a la evaluación (no al colegio) para soportar
-- cambios de alumnos entre años y semestres.
-- Los 3 formularios se asignan directamente al grupo.
-- ============================================================

CREATE TABLE grupo (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_id       UUID         NOT NULL REFERENCES evaluacion(id) ON DELETE CASCADE,
  form_emociones_id   UUID         REFERENCES formulario(id) ON DELETE RESTRICT,
  form_bienpsic_id    UUID         REFERENCES formulario(id) ON DELETE RESTRICT,
  form_aprendizaje_id UUID         REFERENCES formulario(id) ON DELETE RESTRICT,
  nombre              VARCHAR(100) NOT NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  grupo                     IS 'Grupos dentro de una evaluación. Cambian por año/semestre.';
COMMENT ON COLUMN grupo.form_emociones_id   IS 'Formulario de emociones asignado a este grupo.';
COMMENT ON COLUMN grupo.form_bienpsic_id    IS 'Formulario de bienestar psicológico asignado a este grupo.';
COMMENT ON COLUMN grupo.form_aprendizaje_id IS 'Formulario de aprendizaje asignado a este grupo.';

-- ============================================================
-- ESTUDIANTE
-- ============================================================

CREATE TABLE estudiante (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id        UUID         NOT NULL REFERENCES grupo(id) ON DELETE RESTRICT,
  nombre_completo VARCHAR(255) NOT NULL,
  curp            VARCHAR(18)  UNIQUE,
  created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE estudiante IS 'Alumnos dentro de un grupo de una evaluación.';

-- ============================================================
-- SESION
-- Registro de un estudiante respondiendo un formulario.
-- evaluacion_id desnormalizado para simplificar exports a Excel
-- sin necesidad de joins extra.
-- ============================================================

CREATE TABLE sesion (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID          NOT NULL REFERENCES estudiante(id)  ON DELETE RESTRICT,
  formulario_id UUID          NOT NULL REFERENCES formulario(id)  ON DELETE RESTRICT,
  evaluacion_id UUID          NOT NULL REFERENCES evaluacion(id)  ON DELETE RESTRICT,
  estado        estado_sesion NOT NULL DEFAULT 'pendiente',
  iniciada_at   TIMESTAMP,
  completada_at TIMESTAMP,
  UNIQUE (estudiante_id, formulario_id, evaluacion_id)
);

COMMENT ON TABLE  sesion               IS 'Registro de cada vez que un estudiante responde un formulario.';
COMMENT ON COLUMN sesion.evaluacion_id IS 'Desnormalizado para simplificar la query de exportación a Excel.';

-- ============================================================
-- RESPUESTA
-- texto_libre guarda directamente el texto de la opción
-- seleccionada (ej. "Casi siempre") copiado desde el JSONB
-- de opciones_respuesta al momento de responder.
-- Esto mantiene los datos históricos intactos aunque el
-- formulario cambie en el futuro.
-- ============================================================

CREATE TABLE respuesta (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id    UUID      NOT NULL REFERENCES sesion(id)    ON DELETE CASCADE,
  pregunta_id  UUID      NOT NULL REFERENCES pregunta(id)  ON DELETE RESTRICT,
  texto_libre  VARCHAR(255),
  respondida_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (sesion_id, pregunta_id)
);

COMMENT ON TABLE  respuesta            IS 'Respuesta de un alumno a cada pregunta dentro de una sesión.';
COMMENT ON COLUMN respuesta.texto_libre IS 'Texto de la opción seleccionada, copiado del JSONB al momento de responder.';

-- ============================================================
-- REPORTE
-- Tres tipos: individual, grupal, general.
-- La visibilidad ya no es por reporte sino por evaluacion
-- a través de evaluacion.reportes_publicados.
-- ============================================================

CREATE TABLE reporte (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          tipo_reporte NOT NULL,
  evaluacion_id UUID         NOT NULL REFERENCES evaluacion(id)  ON DELETE RESTRICT,
  grupo_id      UUID                  REFERENCES grupo(id)       ON DELETE RESTRICT,
  estudiante_id UUID                  REFERENCES estudiante(id)  ON DELETE RESTRICT,
  archivo_url   VARCHAR(500) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),

  -- tipo=grupal     → grupo_id requerido,      estudiante_id null
  -- tipo=individual → estudiante_id requerido,  grupo_id null
  -- tipo=general    → ambos null
  CONSTRAINT reporte_grupal_requiere_grupo CHECK (
    tipo != 'grupal' OR grupo_id IS NOT NULL
  ),
  CONSTRAINT reporte_individual_requiere_estudiante CHECK (
    tipo != 'individual' OR estudiante_id IS NOT NULL
  ),
  CONSTRAINT reporte_general_sin_referencias CHECK (
    tipo != 'general' OR (grupo_id IS NULL AND estudiante_id IS NULL)
  ),
  CONSTRAINT reporte_individual_sin_grupo CHECK (
    tipo != 'individual' OR grupo_id IS NULL
  )
);

COMMENT ON TABLE  reporte              IS 'PDFs subidos por el administrador: individual, grupal o general.';
COMMENT ON COLUMN reporte.grupo_id     IS 'Solo para tipo=grupal.';
COMMENT ON COLUMN reporte.estudiante_id IS 'Solo para tipo=individual.';

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Evaluaciones por colegio
CREATE INDEX idx_evaluacion_colegio        ON evaluacion(colegio_id);
CREATE INDEX idx_evaluacion_acepta         ON evaluacion(acepta_respuestas)   WHERE acepta_respuestas = TRUE;
CREATE INDEX idx_evaluacion_publicados     ON evaluacion(reportes_publicados) WHERE reportes_publicados = TRUE;

-- Grupos por evaluación
CREATE INDEX idx_grupo_evaluacion          ON grupo(evaluacion_id);

-- Estudiantes por grupo
CREATE INDEX idx_estudiante_grupo          ON estudiante(grupo_id);

-- Sesiones — queries frecuentes para exportación y estado
CREATE INDEX idx_sesion_evaluacion         ON sesion(evaluacion_id);
CREATE INDEX idx_sesion_estudiante         ON sesion(estudiante_id);
CREATE INDEX idx_sesion_formulario         ON sesion(formulario_id);
CREATE INDEX idx_sesion_estado             ON sesion(estado);

-- Respuestas por sesión
CREATE INDEX idx_respuesta_sesion          ON respuesta(sesion_id);
CREATE INDEX idx_respuesta_pregunta        ON respuesta(pregunta_id);

-- Secciones por formulario
CREATE INDEX idx_seccion_formulario        ON seccion(formulario_id);

-- Preguntas por sección
CREATE INDEX idx_pregunta_seccion          ON pregunta(seccion_id);

-- Búsqueda dentro del JSONB de opciones (ahora vive en seccion)
CREATE INDEX idx_seccion_opciones          ON seccion USING GIN(opciones_respuesta);

-- Reportes
CREATE INDEX idx_reporte_evaluacion        ON reporte(evaluacion_id);
CREATE INDEX idx_reporte_tipo              ON reporte(tipo);

-- ============================================================
-- QUERY DE EJEMPLO: exportar respuestas a Excel
-- ============================================================

-- SELECT
--   c.nombre          AS colegio,
--   ev.nombre         AS evaluacion,
--   ev.fecha,
--   g.nombre          AS grupo,
--   e.nombre_completo AS alumno,
--   e.curp,
--   f.titulo          AS formulario,
--   f.categoria,
--   sec.orden         AS seccion_orden,
--   p.texto           AS pregunta,
--   r.texto_libre     AS respuesta,
--   r.respondida_at
-- FROM respuesta r
-- JOIN sesion     s   ON s.id   = r.sesion_id
-- JOIN estudiante e   ON e.id   = s.estudiante_id
-- JOIN grupo      g   ON g.id   = e.grupo_id
-- JOIN evaluacion ev  ON ev.id  = s.evaluacion_id
-- JOIN colegio    c   ON c.id   = ev.colegio_id
-- JOIN pregunta   p   ON p.id   = r.pregunta_id
-- JOIN seccion    sec ON sec.id = p.seccion_id
-- JOIN formulario f   ON f.id   = s.formulario_id
-- WHERE s.evaluacion_id = '<uuid-de-la-evaluacion>'
-- ORDER BY g.nombre, e.nombre_completo, f.categoria, sec.orden, p.orden;