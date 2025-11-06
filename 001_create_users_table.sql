-- 001_create_users_table.sql
-- Tabla: users
-- Guarda usuarios para la app Flutter (campos exactamente compatibles con el cliente)
CREATE TABLE public.users (
  id           SERIAL PRIMARY KEY,
  apodo        VARCHAR(100) NOT NULL,
  contrasena_hash VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  nombre       VARCHAR(150),
  apellido     VARCHAR(150),
  fecha_nacimiento DATE,
  carrera      VARCHAR(200),
  descripcion_personal TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indices recomendados
CREATE INDEX idx_users_apodo ON public.users (apodo);
CREATE INDEX idx_users_email ON public.users (email);

-- Nota: Este archivo es para Postgres (Hostinger). Para pruebas locales el servidor usa SQLite y crea
-- una tabla equivalente si no existe.
