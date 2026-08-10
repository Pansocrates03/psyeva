-- ============================================================
-- PSYEVA — Views y Procedures
-- ============================================================


-- ============================================================
-- VIEWS
-- Solo donde la query se repite en múltiples endpoints
-- y no necesita parámetros dinámicos.
-- ============================================================


-- ------------------------------------------------------------
-- V1: vista_progreso_grupo
-- Usada en:
--   GET /api/admin/evaluacion/:id  (grid de tarjetas de grupos)
--   GET /api/facilitador/grupos    (misma vista para facilitador)
-- Evita repetir el COUNT con FILTER en cada endpoint.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vista_progreso_grupo AS
SELECT
  g.id                                                              AS grupo_id,
  g.nombre                                                          AS grupo_nombre,
  g.evaluacion_id,
  g.form_emociones_id,
  g.form_bienpsic_id,
  g.form_aprendizaje_id,
  COUNT(DISTINCT e.id)                                              AS total_alumnos,
  COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'completada')      AS sesiones_completadas,
  COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'en_progreso')     AS sesiones_en_progreso,
  COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'pendiente')       AS sesiones_pendientes,
  -- Estado derivado del grupo completo
  CASE
    WHEN COUNT(DISTINCT e.id) = 0                                          THEN 'sin_alumnos'
    WHEN COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'completada')
       = COUNT(DISTINCT s.id)
      AND COUNT(DISTINCT s.id) > 0                                         THEN 'completo'
    WHEN COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'en_progreso') > 0
      OR COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'completada')  > 0 THEN 'en_progreso'
    ELSE                                                                        'pendiente'
  END                                                               AS estado_grupo,
  -- Reportes
  COUNT(DISTINCT r_ind.id)                                          AS reportes_individuales,
  COUNT(DISTINCT r_grp.id)                                          AS reporte_grupal
FROM grupo g
LEFT JOIN estudiante e   ON e.grupo_id      = g.id
LEFT JOIN sesion     s   ON s.estudiante_id = e.id
                        AND s.evaluacion_id = g.evaluacion_id
LEFT JOIN reporte    r_ind ON r_ind.estudiante_id = e.id
                          AND r_ind.evaluacion_id = g.evaluacion_id
                          AND r_ind.tipo = 'individual'
LEFT JOIN reporte    r_grp ON r_grp.grupo_id    = g.id
                          AND r_grp.evaluacion_id = g.evaluacion_id
                          AND r_grp.tipo = 'grupal'
GROUP BY g.id;

COMMENT ON VIEW vista_progreso_grupo IS
  'Progreso por grupo: totales de alumnos, sesiones por estado y reportes. Usada en admin y facilitador.';

-- Uso en código:
-- const grupos = await sql`
--   SELECT * FROM vista_progreso_grupo
--   WHERE evaluacion_id = ${evaluacionId}
--   ORDER BY grupo_nombre
-- `;


-- ------------------------------------------------------------
-- V2: vista_progreso_evaluacion
-- Usada en:
--   GET /api/admin/evaluaciones     (KPIs de la tabla principal)
--   GET /api/facilitador/verificar  (resumen tras ingresar clave)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vista_progreso_evaluacion AS
SELECT
  ev.id                                                             AS evaluacion_id,
  ev.nombre,
  ev.fecha,
  ev.acepta_respuestas,
  ev.reportes_publicados,
  ev.colegio_id,
  c.nombre                                                          AS colegio_nombre,
  COUNT(DISTINCT g.id)                                              AS total_grupos,
  COUNT(DISTINCT e.id)                                              AS total_alumnos,
  COUNT(DISTINCT s.id) FILTER (WHERE s.estado = 'completada')      AS sesiones_completadas,
  COUNT(DISTINCT s.id) FILTER (WHERE s.estado != 'completada')     AS sesiones_pendientes,
  COUNT(DISTINCT r.id)                                              AS total_reportes
FROM evaluacion ev
JOIN colegio    c  ON c.id  = ev.colegio_id
LEFT JOIN grupo      g  ON g.evaluacion_id  = ev.id
LEFT JOIN estudiante e  ON e.grupo_id       = g.id
LEFT JOIN sesion     s  ON s.evaluacion_id  = ev.id
LEFT JOIN reporte    r  ON r.evaluacion_id  = ev.id
GROUP BY ev.id, c.nombre;

COMMENT ON VIEW vista_progreso_evaluacion IS
  'KPIs globales por evaluación. Usada en el listado principal del admin y en la verificación del facilitador.';

-- Uso en código:
-- const evaluaciones = await sql`
--   SELECT * FROM vista_progreso_evaluacion
--   WHERE colegio_id = ${colegioId}
--   ORDER BY fecha DESC
-- `;


-- ------------------------------------------------------------
-- V3: vista_estado_alumno
-- Usada en:
--   GET /api/facilitador/estudiantes/:grupoId
-- Muestra el estado de cada alumno por categoría de formulario.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW vista_estado_alumno AS
SELECT
  e.id                                                              AS estudiante_id,
  e.nombre_completo,
  e.curp,
  e.grupo_id,
  g.evaluacion_id,
  COALESCE(
    MAX(s.estado) FILTER (WHERE f.categoria = 'emociones'),
    'pendiente'
  )                                                                 AS estado_emociones,
  COALESCE(
    MAX(s.estado) FILTER (WHERE f.categoria = 'bienestar_psicologico'),
    'pendiente'
  )                                                                 AS estado_bienestar,
  COALESCE(
    MAX(s.estado) FILTER (WHERE f.categoria = 'aprendizaje'),
    'pendiente'
  )                                                                 AS estado_aprendizaje,
  -- TRUE solo si las 3 categorías están completadas
  BOOL_AND(s.estado = 'completada')                                AS todo_completado
FROM estudiante e
JOIN grupo      g  ON g.id = e.grupo_id
LEFT JOIN sesion     s  ON s.estudiante_id = e.id
                       AND s.evaluacion_id = g.evaluacion_id
LEFT JOIN formulario f  ON f.id = s.formulario_id
GROUP BY e.id, g.evaluacion_id;

COMMENT ON VIEW vista_estado_alumno IS
  'Estado por alumno desglosado por categoría de formulario. Usada en la selección de alumno del facilitador.';

-- Uso en código:
-- const alumnos = await sql`
--   SELECT * FROM vista_estado_alumno
--   WHERE grupo_id      = ${grupoId}
--     AND evaluacion_id = ${evaluacionId}
--   ORDER BY nombre_completo
-- `;


-- ============================================================
-- PROCEDURES / FUNCTIONS
-- Solo para operaciones con lógica de negocio que necesitan
-- múltiples pasos atómicos dentro de una transacción.
-- ============================================================


-- ------------------------------------------------------------
-- F1: iniciar_sesion
-- Usada en: POST /api/facilitador/sesiones
--
-- Crea una sesión nueva para un alumno si:
--   1. La evaluación acepta respuestas
--   2. No existe ya una sesión completada para ese alumno+formulario
-- Si existe una sesión en_progreso la devuelve para continuar.
-- Todo en una sola transacción — evita condiciones de carrera
-- con 500 alumnos iniciando al mismo tiempo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION iniciar_sesion(
  p_estudiante_id UUID,
  p_formulario_id UUID,
  p_evaluacion_id UUID
)
RETURNS TABLE (
  sesion_id     UUID,
  estado        estado_sesion,
  es_nueva      BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_acepta      BOOLEAN;
  v_sesion_id   UUID;
  v_estado      estado_sesion;
  v_es_nueva    BOOLEAN := FALSE;
BEGIN
  -- 1. Verifica que la evaluación acepte respuestas
  SELECT acepta_respuestas INTO v_acepta
  FROM evaluacion
  WHERE id = p_evaluacion_id;

  IF v_acepta IS NULL THEN
    RAISE EXCEPTION 'evaluacion_no_encontrada'
      USING HINT = 'La evaluación no existe';
  END IF;

  IF NOT v_acepta THEN
    RAISE EXCEPTION 'evaluacion_cerrada'
      USING HINT = 'La evaluación no está aceptando respuestas';
  END IF;

  -- 2. Busca sesión existente
  SELECT id, sesion.estado INTO v_sesion_id, v_estado
  FROM sesion
  WHERE estudiante_id = p_estudiante_id
    AND formulario_id = p_formulario_id
    AND evaluacion_id = p_evaluacion_id;

  IF FOUND THEN
    IF v_estado = 'completada' THEN
      RAISE EXCEPTION 'sesion_ya_completada'
        USING HINT = 'Este alumno ya completó este formulario';
    END IF;
    -- Devuelve la sesión existente para continuar
    RETURN QUERY SELECT v_sesion_id, v_estado, FALSE;
    RETURN;
  END IF;

  -- 3. Crea sesión nueva
  INSERT INTO sesion (estudiante_id, formulario_id, evaluacion_id, estado)
  VALUES (p_estudiante_id, p_formulario_id, p_evaluacion_id, 'pendiente')
  RETURNING id INTO v_sesion_id;

  v_es_nueva := TRUE;
  RETURN QUERY SELECT v_sesion_id, 'pendiente'::estado_sesion, TRUE;
END;
$$;

COMMENT ON FUNCTION iniciar_sesion IS
  'Crea o recupera una sesión de forma atómica. Valida que la evaluación acepte respuestas.';

-- Uso en código:
-- const [result] = await sql`
--   SELECT * FROM iniciar_sesion(
--     ${estudianteId}::uuid,
--     ${formularioId}::uuid,
--     ${evaluacionId}::uuid
--   )
-- `;
-- if (result.esNueva) { ... }


-- ------------------------------------------------------------
-- F2: guardar_respuesta
-- Usada en: POST /api/facilitador/sesiones/respuesta
--
-- Guarda o actualiza una respuesta y actualiza el estado
-- de la sesión a 'en_progreso' si estaba 'pendiente'.
-- Todo en una sola operación atómica.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION guardar_respuesta(
  p_sesion_id    UUID,
  p_pregunta_id  UUID,
  p_texto_libre  VARCHAR(255)
)
RETURNS TABLE (
  respuesta_id  UUID,
  respondida_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_estado      estado_sesion;
  v_respuesta_id UUID;
  v_respondida_at TIMESTAMP;
BEGIN
  -- 1. Verifica estado de la sesión
  SELECT estado INTO v_estado
  FROM sesion
  WHERE id = p_sesion_id
  FOR UPDATE;  -- bloquea la fila durante la transacción

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sesion_no_encontrada'
      USING HINT = 'La sesión no existe';
  END IF;

  IF v_estado = 'completada' THEN
    RAISE EXCEPTION 'sesion_ya_completada'
      USING HINT = 'No se puede modificar una sesión completada';
  END IF;

  -- 2. Upsert de la respuesta
  INSERT INTO respuesta (sesion_id, pregunta_id, texto_libre)
  VALUES (p_sesion_id, p_pregunta_id, p_texto_libre)
  ON CONFLICT (sesion_id, pregunta_id)
  DO UPDATE SET
    texto_libre   = EXCLUDED.texto_libre,
    respondida_at = NOW()
  RETURNING respuesta.id, respuesta.respondida_at INTO v_respuesta_id, v_respondida_at;

  -- 3. Pasa la sesión a en_progreso si estaba pendiente
  IF v_estado = 'pendiente' THEN
    UPDATE sesion
    SET
      estado      = 'en_progreso',
      iniciada_at = COALESCE(iniciada_at, NOW())
    WHERE id = p_sesion_id;
  END IF;

  RETURN QUERY SELECT v_respuesta_id, v_respondida_at;
END;
$$;

COMMENT ON FUNCTION guardar_respuesta IS
  'Guarda o actualiza una respuesta y transiciona la sesión a en_progreso de forma atómica.';

-- Uso en código:
-- const [result] = await sql`
--   SELECT * FROM guardar_respuesta(
--     ${sesionId}::uuid,
--     ${preguntaId}::uuid,
--     ${textoLibre}
--   )
-- `;


-- ------------------------------------------------------------
-- F3: completar_sesion
-- Usada en: PATCH /api/facilitador/sesiones/completar
--
-- Valida que todas las preguntas estén respondidas
-- y marca la sesión como completada de forma atómica.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION completar_sesion(
  p_sesion_id UUID
)
RETURNS TABLE (
  completada    BOOLEAN,
  total         INT,
  respondidas   INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_formulario_id UUID;
  v_total         INT;
  v_respondidas   INT;
BEGIN
  -- 1. Obtiene el formulario de la sesión y bloquea la fila
  SELECT formulario_id INTO v_formulario_id
  FROM sesion
  WHERE id = p_sesion_id AND estado != 'completada'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sesion_no_disponible'
      USING HINT = 'La sesión no existe o ya está completada';
  END IF;

  -- 2. Cuenta preguntas del formulario
  SELECT COUNT(*) INTO v_total
  FROM pregunta
  WHERE formulario_id = v_formulario_id;

  -- 3. Cuenta respuestas registradas
  SELECT COUNT(*) INTO v_respondidas
  FROM respuesta
  WHERE sesion_id = p_sesion_id
    AND texto_libre IS NOT NULL;

  -- 4. Valida que todas estén respondidas
  IF v_respondidas < v_total THEN
    RETURN QUERY SELECT FALSE, v_total, v_respondidas;
    RETURN;
  END IF;

  -- 5. Marca como completada
  UPDATE sesion
  SET
    estado        = 'completada',
    completada_at = NOW()
  WHERE id = p_sesion_id;

  RETURN QUERY SELECT TRUE, v_total, v_respondidas;
END;
$$;

COMMENT ON FUNCTION completar_sesion IS
  'Valida que todas las preguntas estén respondidas y marca la sesión como completada.';

-- Uso en código:
-- const [result] = await sql`
--   SELECT * FROM completar_sesion(${sesionId}::uuid)
-- `;
-- if (!result.completada) {
--   // Faltan result.total - result.respondidas preguntas
-- }