## Frontend – Study Planner

Aplicación frontend para el mini‑proyecto de planificación de estudio. Está construida con **React + TypeScript**, **Vite**, **React Router**, **Zustand** y componentes de UI basados en **Radix UI** y **Tailwind**.

### Requisitos previos

- **Node.js** `>= 18`
- **npm** o **pnpm** (los comandos de ejemplo usan `npm`)
- Backend Django corriendo en algún host (por defecto `http://localhost:8000`)

### Instalación

```bash
cd frontend
npm install
```

### Variables de entorno

El frontend usa una sola variable principal:

- **`VITE_API_URL`**: URL base del backend **sin** `/api` al final.  
  - Ejemplo local:
    - `VITE_API_URL=http://localhost:8000`
  - Ejemplo en producción:
    - `VITE_API_URL=https://mi-backend.com`

Cómo configurarla:

1. En la raíz de `frontend`, crea un archivo `.env` (o `.env.local`):
   ```bash
   VITE_API_URL=http://localhost:8000
   ```
2. Vite leerá la variable en tiempo de build/arranque.

Si **no** defines `VITE_API_URL`, el cliente Axios usará por defecto `http://localhost:8000/api` como base.

### Scripts disponibles

En la carpeta `frontend`:

- **`npm run dev`**  
  Inicia el servidor de desarrollo Vite (por defecto en `http://localhost:5173`).

- **`npm run build`**  
  Genera el build de producción en la carpeta `dist/`.

- **`npm run preview`**  
  Sirve el build generado para probarlo localmente.

- **`npm run lint`**  
  Ejecuta ESLint sobre el proyecto.

### Arquitectura principal

- `src/main.tsx`: punto de entrada de React.
- `src/app/App.tsx`: layout principal, rutas y estructura base.
- `src/app/authContext.tsx`: contexto de autenticación (tokens, usuario, etc.).
- `src/app/routes.tsx`: definición de rutas (páginas principales).
- `src/api/axiosClient.js`: cliente Axios preconfigurado:
  - Establece la base URL (`VITE_API_URL` + `/api`).
  - Adjunta automáticamente el token de acceso en el header `Authorization`.
  - Maneja el refresh del token cuando el backend responde `401`.
- `src/api/services/*.js`: servicios para consumir la API (`auth`, `course`, `activity`, `subtask`, `reprogrammingLog`, etc.).
- `src/pages/*.tsx`: páginas principales (`Today`, `Create`, `ActivityDetail`, `Progress`).
- `src/features/**`: lógica de negocio y componentes específicos de cada vista.
- `src/shared/components/**`: componentes UI reutilizables (botones, inputs, diálogos, etc.).

### Flujo de autenticación

#### Endpoints usados

El frontend asume que el backend expone:

- **Registro**: `POST /api/auth/register/`
- **Login (JWT)**: `POST /api/auth/token/`
- **Refresh token**: `POST /api/auth/token/refresh/`

> Nota: la base URL real se compone como `VITE_API_URL` + `/api`, por lo que por ejemplo `auth/token/` termina siendo `http://localhost:8000/api/auth/token/`.

#### Registro

Archivo: `src/api/services/auth.js`

- Función `register(payload)`:
  - Envía un `POST` a `auth/register/` con:
    - `email`
    - `name`
    - `password`
    - `daily_hours_limit` (opcional)

#### Login

- Función `login(email, password)`:
  - Envía un `POST` a `auth/token/`.
  - Espera recibir `{ access, refresh, ... }`.
  - El frontend guarda:
    - `accessToken` en `localStorage`
    - `refreshToken` en `localStorage`

#### Refresh de token

- Función `refreshToken(refresh)`:
  - Envía un `POST` a `auth/token/refresh/`.
  - Retorna un nuevo `access`.

El interceptor de `axiosClient`:

- Adjunta `Authorization: Bearer <accessToken>` en cada request si existe en `localStorage`.
- Si el backend responde `401`:
  - Intenta refrescar el token con el `refreshToken`.
  - Si el refresh es exitoso:
    - Actualiza `accessToken` en `localStorage`.
    - Repite la request original con el nuevo token.
  - Si falla:
    - Elimina `accessToken` y `refreshToken` de `localStorage`.
    - Rechaza el error (el contexto de auth/páginas deberían reaccionar, típicamente redirigiendo al login).

#### Logout

Actualmente, el logout se maneja solo en el **frontend**:

- Borrar `accessToken` y `refreshToken` de `localStorage`.
- Limpiar el estado de usuario/autenticación en el contexto.
- Redirigir a la página de login o portada.

No es necesario un endpoint específico de logout en el backend mientras no se use blacklist de tokens.

### Páginas principales

- **Today (`/today`)**
  - Usa `src/features/today/hooks/useTodayData.js` para llamar al endpoint `GET /api/today/` (backend planner).
  - Muestra subtareas agrupadas: vencidas, para hoy y próximas.
  - Incluye tarjetas de capacidad, carga de estudio y alertas de sobrecarga.

- **Create (`/create`)**
  - Formularios para crear cursos, actividades y subtareas.
  - Usa hooks como `useActivityForm` y componentes `ActivityForm`, `SubtaskForm`.

- **Activity Detail (`/activities/:id`)**
  - Muestra el detalle de una actividad concreta, progreso y subtareas.
  - Permite editar/crear/eliminar subtareas y reprogramarlas.

- **Progress (`/progress`)**
  - Muestra estadísticas y progreso general del usuario usando `useProgressData`.

### Estilos y UI

- **Tailwind CSS 4** a través de `@tailwindcss/postcss`, `postcss` y `autoprefixer`.
- Componentes basados en **Radix UI**:
  - Diálogos, tooltips, selects, toasts, etc.
- Utilidades de estilo:
  - `class-variance-authority`
  - `tailwind-merge`
  - `clsx`

### Cómo correr el proyecto con el backend

1. Levanta el backend Django (por ejemplo):
   ```bash
   # En la carpeta backend (ejemplo)
   python manage.py runserver 0.0.0.0:8000
   ```
2. Configura `VITE_API_URL` (si es necesario) en `frontend/.env`:
   ```bash
   VITE_API_URL=http://localhost:8000
   ```
3. Levanta el frontend:
   ```bash
   cd frontend
   npm run dev
   ```
4. Abre el navegador en `http://localhost:5173`.

### Deploy

1. Generar build de producción:
   ```bash
   cd frontend
   npm run build
   ```
2. Subir el contenido de `dist/` a tu plataforma (Vercel, Netlify, Nginx estático, etc.).
3. Asegúrate de que:
   - La variable `VITE_API_URL` usada en build apunte al backend público (por ejemplo, `https://mi-backend.com`).
   - El backend permita CORS desde el dominio del frontend (ya está preparado para `*.vercel.app`, `localhost`, etc. en `settings.py` del backend).

# frontend
frontend repository
