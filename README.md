Aquí tienes el **README.md** listo para pegar directamente en tu repositorio 👇

---

# 📚 Smart Planner – Frontend

Este repositorio contiene la **interfaz de usuario** del sistema de planificación académica **Smart Planner**.

El frontend está diseñado para:

* 📅 Visualizar actividades evaluativas
* ✅ Gestionar subtareas
* 📊 Monitorear el progreso de estudio diario
* 🔁 Reprogramar actividades
* 📈 Analizar el avance académico

---

## 🛠️ Tecnologías Principales

| Tecnología         | Uso                     |
| ------------------ | ----------------------- |
| **Framework**      | React 19.x + TypeScript |
| **Build Tool**     | Vite 5.x                |
| **Enrutamiento**   | React Router DOM 7.x    |
| **Estado Global**  | Zustand                 |
| **HTTP Client**    | Axios                   |
| **Estilos**        | Tailwind CSS 4.x        |
| **Componentes UI** | Radix UI (accesibles)   |
| **Iconos**         | Lucide React            |
| **Fechas**         | date-fns                |

---

# 🏗️ Arquitectura del Frontend

El proyecto sigue una arquitectura basada en **features + componentes compartidos**, lo que permite escalabilidad y mantenibilidad.

---

## 📂 1. Estructura de Carpetas

```
src/
├── api/                    
│   ├── axiosClient.js      
│   └── services/           
│
├── app/                    
│   ├── App.tsx             
│   ├── AppLayout.tsx       
│   ├── AppSidebar.tsx      
│   ├── routes.tsx          
│   └── store.ts            
│
├── features/               
│   └── today/              
│       ├── components/     
│       ├── hooks/          
│       └── utils/          
│
├── pages/                  
│   ├── Today.tsx           
│   ├── ActivityDetail.tsx  
│   ├── Create.tsx          
│   └── Progress.tsx        
│
└── shared/                 
    ├── components/         
    ├── hooks/              
    └── utils/              
```

---

## 🧠 2. Gestión de Estado

### Zustand Store (`app/store.ts`)

Maneja:

* 👤 Usuario autenticado
* 📌 Subtareas globales
* 🔄 Actualización reactiva del estado

### Hooks Personalizados

* `useTodayData` → Obtiene:

  * Cursos
  * Actividades
  * Subtareas
  * Logs de reprogramación

Esto permite desacoplar lógica de datos de los componentes visuales.

---

## 🌐 3. Servicios de API

Los servicios están organizados por entidad dentro de:

```
api/services/
```

| Archivo               | Responsabilidad               |
| --------------------- | ----------------------------- |
| `course.js`           | Gestión de cursos             |
| `activity.js`         | Gestión de actividades        |
| `subtask.js`          | Gestión de subtareas          |
| `reprogrammingLog.js` | Historial de reprogramaciones |

Todos utilizan un cliente centralizado:

```
api/axiosClient.js
```

Que configura:

* Base URL
* Interceptores
* Manejo de errores

---

## 🎨 4. Componentes UI

Componentes accesibles construidos con **Radix UI** y estilizados con **Tailwind CSS**:

* Card
* Badge
* Button
* Checkbox
* Popover
* Calendar

✔️ Accesibilidad integrada
✔️ Diseño consistente
✔️ Componentes reutilizables

---

# 🚀 Instalación y Despliegue

### 🔹 Requisitos

* Node.js (versión definida en `.nvmrc`)
* npm

---

## 1️⃣ Clonar e ingresar al proyecto

```bash
cd frontend
```

---

## 2️⃣ Instalar dependencias

```bash
npm install
```

---

## 3️⃣ Configurar variables de entorno (Opcional)

Crear archivo `.env` en la raíz:

```env
VITE_API_URL=http://localhost:8000/api
```

Si no se configura, por defecto utilizará:

```
http://localhost:8000/api
```

---

## 4️⃣ Iniciar entorno de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en:

```
http://localhost:5173
```

---

# 📜 Scripts Disponibles

| Script            | Descripción                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Inicia el servidor de desarrollo         |
| `npm run build`   | Genera el build de producción en `dist/` |
| `npm run preview` | Previsualiza el build de producción      |
| `npm run lint`    | Ejecuta ESLint                           |

---

# 🏗️ Build para Producción

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta:

```
dist/
```

Y pueden ser servidos con cualquier servidor web estático (Nginx, Apache, Vercel, etc.).

---

# 📌 Buenas Prácticas del Proyecto

* Feature-first architecture
* Separación clara entre lógica y UI
* Componentes reutilizables
* Accesibilidad desde el diseño
* Código tipado con TypeScript
* Estado global mínimo y controlado

---

# 👨‍💻 Contribución

1. Crear una rama feature:

   ```bash
   git checkout -b feature/nueva-funcionalidad
   ```
2. Realizar cambios
3. Ejecutar lint
4. Crear Pull Request

---

Si quieres, puedo ahora:

* 🔥 Hacer una versión más profesional tipo startup SaaS
* 📦 Agregar badges (build, license, version, etc.)
* 🧪 Agregar sección de testing
* 🧱 Agregar diagrama de arquitectura
* 🇺🇸 Traducirlo al inglés

Tú me dices qué nivel quieres que tenga ese README 🚀
