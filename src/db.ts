import postgres from "postgres";

const sql = postgres({
  host:     process.env.DB_HOST     ?? "localhost",
  port:     Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME     ?? "psyeva1",
  username: process.env.DB_USER     ?? "postgres",
  password: process.env.DB_PASSWORD ?? "admin",
  ssl:      process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  max:      10,       // pool máximo de conexiones
  idle_timeout: 30,   // segundos antes de cerrar conexión idle
  connect_timeout: 10,
  transform: {
    // Convierte snake_case de la BD a camelCase en JS automáticamente
    column: postgres.camel.column,
  },
});

// try query to test connection
(async () => {
  try {
    await sql`SELECT 1`;
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
})();

export default sql;