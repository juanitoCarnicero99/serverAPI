## Flutter MVC Login — Server

Este directorio contiene la API de autenticación (Node.js + Express) utilizada por la app Flutter.

Contenido
- `index.js` — servidor Express que soporta SQLite (por defecto) y Postgres si se define `DATABASE_URL`.
- `package.json` — scripts y dependencias (incluye `pg`, `sqlite3`, `bcrypt`, `cors`).
- `001_create_users_table.sql` — DDL PostgreSQL para crear la tabla `users` en producción.

Objetivo
- Permitir desplegar esta API en Hostinger (hPanel) usando Postgres para producción. El servidor
  detecta `DATABASE_URL` y usará Postgres; si no existe, usa `data.db` (SQLite) como fallback para desarrollo.

Quick start (desarrollo local)

1. Instala dependencias:

```powershell
cd server
npm install
```

2. Ejecuta el servidor (usa SQLite local):

```powershell
npm start
# por defecto escucha en http://localhost:3000
```

3. Abrir UI local en el navegador:

```
http://localhost:3000/ui
```

Deploy en Hostinger (Postgres recomendado)

1) Subir archivos
- Sube la carpeta `server/` a tu espacio en Hostinger (usando SFTP o File Manager). No es necesario subir `node_modules`.

2) Crear base de datos PostgreSQL
- En hPanel → Databases → crea una base de datos PostgreSQL. Anota host, puerto, usuario, password y dbname.

3) Configurar variables de entorno en hPanel (Node.js App)
- En la configuración de tu Node.js App establece las siguientes environment variables:
  - `DATABASE_URL` = `postgres://USER:PASSWORD@HOST:PORT/DBNAME`
  - `NODE_ENV` = `production`
  - `JWT_SECRET` = (opcional, cadena larga para tokens)
  - `DB_SSL` = `disable` (opcional — usar cuando la conexión no requiere SSL). Si su proveedor requiere SSL, no pongas `disable`.

4) Ejecutar migración (crear tabla)
- Recomiendo ejecutar la migración manualmente (más control). Desde tu máquina local, si tienes `psql`:

```bash
psql "postgres://USER:PASSWORD@HOST:PORT/DBNAME" -f 001_create_users_table.sql
```

O por SSH en Hostinger (si `psql` está disponible):

```bash
ssh usuario@tu-hostinger-ip
cd ~/ruta/a/tu/server
psql "postgres://USER:PASSWORD@HOST:PORT/DBNAME" -f 001_create_users_table.sql
```

Nota: el servidor intentará aplicar `001_create_users_table.sql` automáticamente al arrancar si detecta `DATABASE_URL` y el archivo existe, pero ejecutar la migración manualmente evita problemas inesperados.

5) Instalar dependencias y arrancar la app

```bash
ssh usuario@tu-hostinger-ip
cd ~/ruta/a/tu/server
npm install --production
npm start
```

6) Acceso público
- Si tienes dominio configurado en Hostinger, la app estará disponible en `https://tu-dominio/` o en la URL que el panel te indique. La UI de administración está en `/ui`.

Consideraciones de seguridad y producción
- La ruta `/ui` actualmente lista y permite modificar usuarios — no dejarla pública en producción sin autenticación.
- Recomendaciones:
  - Añadir JWT y proteger rutas sensibles (PUT, DELETE, `/ui`).
  - Usar HTTPS (Hostinger ofrece Let's Encrypt en hPanel).
  - No usar SQLite en producción; Postgres es más fiable para concurrencia y backups.
  - Guardar secrets (JWT_SECRET, DATABASE_URL) en variables de entorno en hPanel.

Cómo el servidor elige la DB
- Si `process.env.DATABASE_URL` está definida, el servidor usará Postgres via `pg`.
- Si no está definida, usará SQLite y el archivo `data.db` dentro de `server/`.

Depuración y logs
- Hostinger muestra logs en su panel; si usas SSH y arrancas con `node index.js` redirige la salida a archivos:

```powershell
node index.js > server_log.txt 2> server_err.txt &
tail -f server_log.txt
```

Migraciones futuras
- Para cambios en el esquema, crea nuevos archivos SQL numerados (002_..., 003_...) y ejecútalos manualmente contra la DB de producción.

Next steps (recomendado)
- (Opcional) Puedo añadir JWT y middleware para proteger `/ui` y endpoints de modificación.
- (Opcional) Puedo crear un script `deploy.sh` para VPS/SSH que automatice `npm install`, `psql -f` y reinicios.

Contacto
- Si quieres que haga la configuración JWT o el script de despliegue, responde con `haz JWT` o `haz deploy` y lo implemento aquí en el repo.

---
Archivo generado automáticamente: instrucciones de despliegue para Hostinger y uso local.
# API mínima de autenticación

Esta es una API de ejemplo (Node.js + Express) que expone un endpoint POST /login.

Rutas:
- GET / -> Mensaje de bienvenida
- POST /login -> Body JSON { "username": "...", "password": "..." }

Respuesta exitosa:
{
  "success": true,
  "user": { "id": 1, "username": "testuser" }
}

Respuesta de fallo:
- 400 si faltan parámetros
- 401 si credenciales inválidas

Cómo correr:
```powershell
cd server; npm install
cd server; npm start
```

En Hostinger puedes desplegar la carpeta `server` y configurar Node.js si tu plan lo permite, o convertirlo a PHP/otro stack si no. Mantén las contraseñas en texto plano solo para pruebas; en producción usa hashing (bcrypt) y HTTPS.
