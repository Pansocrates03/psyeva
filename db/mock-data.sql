-- ============================================================
-- PSYEVA — Mock data para pruebas locales
-- ============================================================

TRUNCATE TABLE respuesta, sesion, reporte, estudiante, grupo, evaluacion, pregunta, seccion, formulario, colegio RESTART IDENTITY CASCADE;

-- COLEGIOS
INSERT INTO colegio (id, nombre, clave_acceso, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Colegio San José', 'san-jose-2026', '2026-01-15 09:00:00'),
  ('22222222-2222-2222-2222-222222222222', 'Liceo de las Artes', 'liceo-artes-2026', '2026-01-16 10:30:00');

-- FORMULARIOS
INSERT INTO formulario (id, titulo, descripcion, categoria, created_at) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Bienestar emocional', 'Encuesta de emociones y clima escolar.', 'emociones', '2026-01-20 08:00:00'),
  ('44444444-4444-4444-4444-444444444444', 'Bienestar psicológico', 'Encuesta para identificar bienestar y apoyo emocional.', 'bienestar_psicologico', '2026-01-20 08:15:00'),
  ('55555555-5555-5555-5555-555555555555', 'Aprendizaje y metas', 'Encuesta sobre hábitos de estudio y motivación.', 'aprendizaje', '2026-01-20 08:30:00');

-- SECCIONES
-- Cada pregunta original tenía su propio set de opciones, así que
-- para no cambiar el significado del dato de prueba cada una queda
-- en su propia sección (además demuestra bien que un formulario
-- puede tener varias secciones).
INSERT INTO seccion (id, formulario_id, orden, instruccion_texto, instruccion_imagen_url, opciones_respuesta) VALUES
  ('f0000001-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 1, 'Lee la pregunta y elige la opción que mejor te describe.', NULL, '[{"valor":1,"texto":"Muy mal"},{"valor":2,"texto":"Mal"},{"valor":3,"texto":"Bien"},{"valor":4,"texto":"Muy bien"}]'),
  ('f0000002-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 2, 'Lee la pregunta y contesta qué tan seguido te pasa.',      NULL, '[{"valor":1,"texto":"Nunca"},{"valor":2,"texto":"Pocas veces"},{"valor":3,"texto":"A veces"},{"valor":4,"texto":"Siempre"}]'),
  ('f0000003-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 1, 'Lee la pregunta y contesta qué tan seguido te pasa.',      NULL, '[{"valor":1,"texto":"Nunca"},{"valor":2,"texto":"Pocas veces"},{"valor":3,"texto":"A veces"},{"valor":4,"texto":"Siempre"}]'),
  ('f0000004-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 2, 'Lee la pregunta y contesta qué tan seguido te pasa.',      NULL, '[{"valor":1,"texto":"Nunca"},{"valor":2,"texto":"Pocas veces"},{"valor":3,"texto":"A veces"},{"valor":4,"texto":"Siempre"}]'),
  ('f0000005-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 1, 'Lee la pregunta y elige la opción que mejor te describe.', NULL, '[{"valor":1,"texto":"Nada motivado"},{"valor":2,"texto":"Poco motivado"},{"valor":3,"texto":"Motivado"},{"valor":4,"texto":"Muy motivado"}]'),
  ('f0000006-0000-0000-0000-000000000006', '55555555-5555-5555-5555-555555555555', 2, 'Lee la pregunta y contesta qué tan seguido te pasa.',      NULL, '[{"valor":1,"texto":"Nunca"},{"valor":2,"texto":"Pocas veces"},{"valor":3,"texto":"A veces"},{"valor":4,"texto":"Siempre"}]');

-- PREGUNTAS
INSERT INTO pregunta (id, seccion_id, orden, texto, imagen_url) VALUES
  ('66666666-6666-6666-6666-666666666666', 'f0000001-0000-0000-0000-000000000001', 1, '¿Cómo te sientes hoy en la escuela?', NULL),
  ('77777777-7777-7777-7777-777777777777', 'f0000002-0000-0000-0000-000000000002', 1, '¿Sientes que tus compañeros te escuchan?', NULL),
  ('88888888-8888-8888-8888-888888888888', 'f0000003-0000-0000-0000-000000000003', 1, '¿Te sientes acompañado por tus maestros?', NULL),
  ('99999999-9999-9999-9999-999999999999', 'f0000004-0000-0000-0000-000000000004', 1, '¿Te resulta fácil pedir ayuda cuando lo necesitas?', NULL),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f0000005-0000-0000-0000-000000000005', 1, '¿Qué tan motivado estás para estudiar?', NULL),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f0000006-0000-0000-0000-000000000006', 1, '¿Logras organizar tu tiempo para estudiar?', NULL);

-- EVALUACIONES
INSERT INTO evaluacion (id, colegio_id, nombre, acepta_respuestas, reportes_publicados, fecha, created_at) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Evaluación primer semestre 2026', TRUE, FALSE, '2026-03-15', '2026-02-01 09:00:00'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'Evaluación segundo semestre 2026', TRUE, TRUE, '2026-06-15', '2026-05-01 09:00:00');

-- GRUPOS
INSERT INTO grupo (id, evaluacion_id, form_emociones_id, form_bienpsic_id, form_aprendizaje_id, nombre, created_at) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'Grupo A', '2026-02-02 08:00:00'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555', 'Grupo B', '2026-02-02 08:10:00');

-- ESTUDIANTES
INSERT INTO estudiante (id, grupo_id, nombre_completo, curp, created_at) VALUES
  ('10101010-1010-1010-1010-101010101010', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Ana López García', 'LOGA960101HDFLPN01', '2026-02-03 10:00:00'),
  ('20202020-2020-2020-2020-202020202020', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Bruno Pérez Cruz', 'PECB950505HDFRZR02', '2026-02-03 10:05:00'),
  ('30303030-3030-3030-3030-303030303030', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Carmen Ruiz Sol', 'RUSC980707MDFRRL03', '2026-02-03 10:10:00');

-- SESIONES
INSERT INTO sesion (id, estudiante_id, formulario_id, evaluacion_id, estado, iniciada_at, completada_at) VALUES
  ('40404040-4040-4040-4040-404040404040', '10101010-1010-1010-1010-101010101010', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'completada', '2026-03-10 08:00:00', '2026-03-10 08:10:00'),
  ('50505050-5050-5050-5050-505050505050', '10101010-1010-1010-1010-101010101010', '44444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'en_progreso', '2026-03-10 08:20:00', NULL),
  ('60606060-6060-6060-6060-606060606060', '20202020-2020-2020-2020-202020202020', '33333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'completada', '2026-03-11 09:00:00', '2026-03-11 09:15:00'),
  ('70707070-7070-7070-7070-707070707070', '30303030-3030-3030-3030-303030303030', '55555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'pendiente', '2026-03-12 10:00:00', NULL);

-- RESPUESTAS
INSERT INTO respuesta (id, sesion_id, pregunta_id, texto_libre, respondida_at) VALUES
  ('80808080-8080-8080-8080-808080808080', '40404040-4040-4040-4040-404040404040', '66666666-6666-6666-6666-666666666666', 'Bien', '2026-03-10 08:02:00'),
  ('90909090-9090-9090-9090-909090909090', '40404040-4040-4040-4040-404040404040', '77777777-7777-7777-7777-777777777777', 'Siempre', '2026-03-10 08:04:00'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0', '60606060-6060-6060-6060-606060606060', '66666666-6666-6666-6666-666666666666', 'Muy bien', '2026-03-11 09:05:00'),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0', '60606060-6060-6060-6060-606060606060', '77777777-7777-7777-7777-777777777777', 'A veces', '2026-03-11 09:10:00');

-- REPORTES
INSERT INTO reporte (id, tipo, evaluacion_id, grupo_id, estudiante_id, archivo_url, created_at) VALUES
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0', 'grupal', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', NULL, 'https://example.com/reportes/grupo-a.pdf', '2026-03-20 10:00:00'),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'individual', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, '10101010-1010-1010-1010-101010101010', 'https://example.com/reportes/ana-lopez.pdf', '2026-03-20 10:15:00'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e0e0e0', 'general', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NULL, NULL, 'https://example.com/reportes/general-2026.pdf', '2026-06-20 10:30:00');
