import postgres from "postgres";

const sql = postgres({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? "psyeva1",
  username: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "admin",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function waitForDatabase(): Promise<void> {
  const maxAttempts = 30;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sql`SELECT 1`;
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.log(`Esperando PostgreSQL (${attempt}/${maxAttempts})...`);
      await Bun.sleep(1000);
    }
  }
}

try {
  await waitForDatabase();
  console.log("Conexión a PostgreSQL establecida.");

  const [schemaStatus] = await sql<{ tableExists: boolean }[]>`
    SELECT to_regclass('public.colegio') IS NOT NULL AS "tableExists"
  `;

  if (schemaStatus?.tableExists) {
    console.log("El schema ya existe; se omite su creación.");
  } else {
    await sql.file("db/schema.sql");
    console.log("Schema creado correctamente.");
  }

  await sql.file("db/procedures.sql");
  console.log("Vistas y funciones creadas correctamente.");
} catch (error) {
  console.error("No se pudo inicializar la base de datos:", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}