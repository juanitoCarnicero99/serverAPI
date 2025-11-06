require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MySQL connection pool
let pool = null;

async function initializeDatabase() {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'flutter_mvc_login',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log('✓ Conexión exitosa a MySQL');
    connection.release();

    // Try to apply DDL if exists
    const ddlPath = path.join(__dirname, '001_create_users_table_mysql.sql');
    if (fs.existsSync(ddlPath)) {
      try {
        const ddl = fs.readFileSync(ddlPath, 'utf8');
        // Split by semicolon to handle multiple statements
        const statements = ddl.split(';').filter(s => s.trim().length > 0);
        for (const statement of statements) {
          await pool.query(statement);
        }
        console.log('✓ DDL aplicado (MySQL)');
      } catch (err) {
        console.log('⚠ DDL no aplicado (puede que ya exista):', err.message);
      }
    } else {
      console.log('⚠ No se encontró DDL de MySQL; asegúrate de que tu base de datos tenga la tabla users.');
    }
  } catch (err) {
    console.error('✗ Error al conectar a MySQL:', err.message);
    process.exit(1);
  }
}

// Generic async DB helpers for MySQL
async function dbGet(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows[0];
}

async function dbAll(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function dbRun(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return result;
}

function sanitizeUserRow(row) {
  if (!row) return null;
  const { contrasena_hash, ...rest } = row;
  return rest;
}

// Helper: hash password
async function hashPassword(plain) {
  const saltRounds = 10;
  return await bcrypt.hash(plain, saltRounds);
}

// Helper: compare
async function comparePassword(plain, hash) {
  return await bcrypt.compare(plain, hash);
}

app.get('/', (req, res) => {
  res.json({ message: 'API de autenticación lista' });
});

// LOGIN: soporta dos formatos de body:
// { username, password }  (antiguo)
// { apodo, contrasena }  (cliente en español)
app.post('/login', async (req, res) => {
  const body = req.body || {};
  const username = body.username || body.apodo;
  const password = body.password || body.contrasena;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'username/apodo y password/contrasena son requeridos' });
  }

  try {
    const row = await dbGet('SELECT * FROM users WHERE apodo = ? OR email = ?', [username, username]);
    if (!row) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

    const ok = await comparePassword(password, row.contrasena_hash);
    if (!ok) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

    return res.json({ success: true, user: sanitizeUserRow(row) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'DB error', error: err.message });
  }
});

// CRUD: Create user
app.post('/users', async (req, res) => {
  const b = req.body || {};
  const required = ['apodo', 'contrasena', 'email'];
  for (const f of required) if (!b[f]) return res.status(400).json({ success: false, message: `${f} es requerido` });

  try {
    const hash = await hashPassword(b.contrasena);
    const sql = `INSERT INTO users (apodo, contrasena_hash, email, nombre, apellido, fecha_nacimiento, carrera, descripcion_personal) VALUES (?,?,?,?,?,?,?,?)`;
    try {
      const result = await dbRun(sql, [b.apodo, hash, b.email, b.nombre || null, b.apellido || null, b.fecha_nacimiento || null, b.carrera || null, b.descripcion_personal || null]);
      const row = await dbGet('SELECT * FROM users WHERE id = ?', [result.insertId]);
      return res.status(201).json({ success: true, user: sanitizeUserRow(row) });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || (err.message && err.message.includes('Duplicate'))) {
        return res.status(409).json({ success: false, message: 'Email o apodo ya existe' });
      }
      return res.status(500).json({ success: false, message: 'DB error', error: err.message });
    }
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// Read all users
app.get('/users', async (req, res) => {
  try {
    const sql = 'SELECT * FROM users ORDER BY id ASC';
    const rows = await dbAll(sql, []);
    const safe = rows.map(r => sanitizeUserRow(r));
    return res.json({ success: true, users: safe });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'DB error', error: err.message });
  }
});

// Read single user
app.get('/users/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const row = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!row) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    return res.json({ success: true, user: sanitizeUserRow(row) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'DB error', error: err.message });
  }
});

// Update user (partial allowed). If contrasena provided, la actualiza (hasheada)
app.put('/users/:id', async (req, res) => {
  const id = req.params.id;
  const b = req.body || {};
  try {
    // ensure exists
    const existing = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // Build update
    const fields = [];
    const values = [];
    const allowed = ['apodo','email','nombre','apellido','fecha_nacimiento','carrera','descripcion_personal'];
    for (const k of allowed) {
      if (k in b) {
        fields.push(`${k} = ?`);
        values.push(b[k]);
      }
    }
    if (b.contrasena) {
      const h = await hashPassword(b.contrasena);
      fields.push('contrasena_hash = ?');
      values.push(h);
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'Nada que actualizar' });

    // updated_at
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    // WHERE id param
    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    await dbRun(sql, values);
    const row = await dbGet('SELECT * FROM users WHERE id = ?', [id]);
    return res.json({ success: true, user: sanitizeUserRow(row) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'DB error', error: err.message });
  }
});

// Delete user
app.delete('/users/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await dbRun('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    return res.json({ success: true, message: 'Usuario eliminado' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'DB error', error: err.message });
  }
});

// Página de prueba (mantener la anterior UI de test)
app.get('/test', (req, res) => {
  res.send(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Test Login</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}label{display:block;margin-top:8px}</style>
    </head>
    <body>
      <h2>Probar POST /login</h2>
      <form id="loginForm">
        <label>Apodo o Email: <input id="username" value="testuser"/></label>
        <label>Password: <input id="password" type="password" value="password123"/></label>
        <button type="submit">Login</button>
      </form>
      <pre id="output"></pre>
      <script>
        const form = document.getElementById('loginForm');
        const out = document.getElementById('output');
        form.addEventListener('submit', async (e)=>{
          e.preventDefault();
          out.textContent = 'Enviando...';
          const username = document.getElementById('username').value;
          const password = document.getElementById('password').value;
          try{
            const r = await fetch('/login', {
              method: 'POST',
              headers: {'Content-Type':'application/json'},
              body: JSON.stringify({apodo: username, contrasena: password})
            });
            const json = await r.json();
            out.textContent = JSON.stringify({ status: r.status, body: json }, null, 2);
          }catch(err){
            out.textContent = 'Error: '+err;
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Interfaz web mínima para CRUD desde el navegador
app.get('/ui', (req, res) => {
  res.send(`
    <!doctype html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Users CRUD UI</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:20px;}
        input, textarea{width:100%;margin:4px 0;padding:6px}
        .row{display:flex;gap:12px}
        .col{flex:1}
        .user{border:1px solid #ddd;padding:8px;margin:8px 0}
        button{padding:6px 10px}
      </style>
    </head>
    <body>
      <h1>Users - CRUD</h1>

      <section id="create">
        <h2>Crear usuario</h2>
        <div style="max-width:700px">
          <label>Apodo<input id="apodo"/></label>
          <label>Contraseña<input id="contrasena" type="password"/></label>
          <label>Email<input id="email"/></label>
          <label>Nombre<input id="nombre"/></label>
          <label>Apellido<input id="apellido"/></label>
          <label>Fecha de nacimiento<input id="fecha_nacimiento" placeholder="YYYY-MM-DD"/></label>
          <label>Carrera<input id="carrera"/></label>
          <label>Descripción<textarea id="descripcion_personal"></textarea></label>
          <button id="btnCreate">Crear</button>
          <div id="createResult"></div>
        </div>
      </section>

      <section id="list">
        <h2>Lista de usuarios</h2>
        <div id="usersContainer"></div>
      </section>

      <script>
        const base = '';

        async function listUsers(){
          const r = await fetch(base + '/users');
          const j = await r.json();
          const container = document.getElementById('usersContainer');
          container.innerHTML = '';
          if (!j.users || j.users.length===0){ container.innerHTML = '<p>No hay usuarios</p>'; return; }
          j.users.forEach(u=>{
            const div = document.createElement('div'); div.className='user';
            div.innerHTML =
              '<strong>' + (u.apodo || '') + '</strong> (<em>' + (u.email || '') + '</em>)<br/>' +
              (u.nombre || '') + ' ' + (u.apellido || '') + ' <br/>' +
              '<small>' + (u.carrera || '') + ' - ' + (u.fecha_nacimiento || '') + '</small>' +
              '<p>' + (u.descripcion_personal || '') + '</p>' +
              '<div style="display:flex;gap:8px">' +
                '<button data-id="' + u.id + '" class="edit">Editar</button>' +
                '<button data-id="' + u.id + '" class="del">Borrar</button>' +
              '</div>';
            container.appendChild(div);
          });
          // attach handlers
          document.querySelectorAll('.del').forEach(b=>b.onclick=async (e)=>{
            if(!confirm('Eliminar usuario?')) return;
            const id = e.currentTarget.dataset.id;
            const res = await fetch(base + '/users/'+id, { method: 'DELETE' });
            const json = await res.json();
            alert(JSON.stringify(json));
            listUsers();
          });
          document.querySelectorAll('.edit').forEach(b=>b.onclick=async (e)=>{
            const id = e.currentTarget.dataset.id;
            // fetch user
            const r = await fetch(base + '/users/' + id);
            const j = await r.json();
            if(!j.user){ alert('No encontrado'); return; }
            const u = j.user;
            // populate create form for edit
            document.getElementById('apodo').value = u.apodo || '';
            document.getElementById('email').value = u.email || '';
            document.getElementById('nombre').value = u.nombre || '';
            document.getElementById('apellido').value = u.apellido || '';
            document.getElementById('fecha_nacimiento').value = u.fecha_nacimiento || '';
            document.getElementById('carrera').value = u.carrera || '';
            document.getElementById('descripcion_personal').value = u.descripcion_personal || '';
            document.getElementById('contrasena').value = '';
            // change create button to update
            const btn = document.getElementById('btnCreate');
            btn.textContent = 'Actualizar';
            btn.onclick = async ()=>{
              const payload = {
                apodo: document.getElementById('apodo').value,
                email: document.getElementById('email').value,
                nombre: document.getElementById('nombre').value,
                apellido: document.getElementById('apellido').value,
                fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
                carrera: document.getElementById('carrera').value,
                descripcion_personal: document.getElementById('descripcion_personal').value
              };
              const pass = document.getElementById('contrasena').value;
              if(pass) payload.contrasena = pass;
              const res = await fetch(base + '/users/' + id, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
              const json = await res.json();
              document.getElementById('createResult').textContent = JSON.stringify(json);
              btn.textContent = 'Crear';
              btn.onclick = createUser;
              listUsers();
            };
          });
        }

        async function createUser(){
          const payload = {
            apodo: document.getElementById('apodo').value,
            contrasena: document.getElementById('contrasena').value,
            email: document.getElementById('email').value,
            nombre: document.getElementById('nombre').value,
            apellido: document.getElementById('apellido').value,
            fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
            carrera: document.getElementById('carrera').value,
            descripcion_personal: document.getElementById('descripcion_personal').value
          };
          try{
            const res = await fetch(base + '/users', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
            const j = await res.json();
            document.getElementById('createResult').textContent = JSON.stringify(j);
            if(res.status===201){
              // reset form
              document.getElementById('apodo').value=''; document.getElementById('contrasena').value=''; document.getElementById('email').value='';
              document.getElementById('nombre').value=''; document.getElementById('apellido').value=''; document.getElementById('fecha_nacimiento').value=''; document.getElementById('carrera').value=''; document.getElementById('descripcion_personal').value='';
            }
            listUsers();
          }catch(e){ document.getElementById('createResult').textContent = e; }
        }

        document.getElementById('btnCreate').onclick = createUser;
        // initial load
        listUsers();
      </script>
    </body>
    </html>
  `);
});

// Initialize database and start server
initializeDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Auth API escuchando en http://localhost:${port}`);
  });
});
