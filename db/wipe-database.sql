-- ============================================================
-- PSYEVA — Borra TODO (tablas, tipos, funciones, vistas,
-- extensiones) para volver a aplicar el esquema desde cero.
--
-- A diferencia de reset-and-seed.sql (que solo TRUNCATE-a datos
-- dentro de las tablas ya existentes), este script tira abajo el
-- esquema completo — hace falta cuando cambia la ESTRUCTURA de
-- las tablas (como el cambio de pregunta/seccion), no solo los
-- datos.
--
-- Uso (correr en este orden):
--   psql -U postgres -d psyeva1 -f db/wipe-database.sql
--   psql -U postgres -d psyeva1 -f db/schema.sql
--   psql -U postgres -d psyeva1 -f db/procedures.sql
--   psql -U postgres -d psyeva1 -f db/reset-and-seed.sql   -- opcional, datos de prueba
--
-- ⚠️ DESTRUCTIVO — borra todos los datos y objetos de la base
-- actual sin posibilidad de deshacer. Pensado para desarrollo
-- local. Nunca correr esto contra producción.
-- ============================================================

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Restaura el dueño/privilegios que trae una base recién creada
-- (DROP SCHEMA se lleva también los grants existentes).
GRANT ALL ON SCHEMA public TO CURRENT_USER;

-- schema.sql vuelve a crear la extensión pgcrypto (su primera
-- línea), así que no hace falta recrearla acá.
