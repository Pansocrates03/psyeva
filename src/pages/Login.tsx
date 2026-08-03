import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../index.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Ingresa usuario y contraseña");
      return;
    }

    // Aquí se podría llamar a un API para validar credenciales.
    // Por ahora guardamos el usuario localmente y redirigimos.
    try {
      localStorage.setItem("psyeva_user", username);
    } catch {}

    navigate("/admin/evaluaciones");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-lg shadow-md p-8"
      >
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Iniciar sesión</h2>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-4">{error}</div>
        )}

        <label className="block text-sm font-medium text-gray-700 mb-2">
          Usuario
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring focus:ring-violet-200 px-3 py-2"
          />
        </label>

        <label className="block text-sm font-medium text-gray-700 mb-4">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-violet-500 focus:ring focus:ring-violet-200 px-3 py-2"
          />
        </label>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
          >
            Entrar
          </button>
        </div>
      </form>
    </div>
  );
}
