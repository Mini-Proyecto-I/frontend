# Smart Planner - Frontend

Este repositorio contiene la interfaz de usuario del sistema de planificación académica. El frontend está diseñado para visualizar y gestionar actividades evaluativas, gestionar subtareas y monitorear el progreso de estudio diario.

## 🛠️ Tecnologías Principales

* *Framework:* React 19.x con TypeScript
* *Build Tool:* Vite 5.x
* *Enrutamiento:* React Router DOM 7.x
* *Estado Global:* Zustand
* *HTTP Client:* Axios
* *Estilos:* Tailwind CSS 4.x
* *Componentes UI:* Radix UI (accesibles)
* *Iconos:* Lucide React
* *Fechas:* date-fns

---

## 🏗️ Arquitectura del Frontend

El proyecto está organizado siguiendo una arquitectura basada en features y componentes compartidos:

### 1. Estructura de Carpetas


src/
├── api/                    # Configuración y servicios de API
│   ├── axiosClient.js      # Cliente HTTP configurado con base URL
│   └── services/           # Servicios por entidad (course, activity, subtask, etc.)
│
├── app/                    # Configuración de la aplicación
│   ├── App.tsx            # Componente raíz
│   ├── AppLayout.tsx      # Layout principal con sidebar
│   ├── AppSidebar.tsx     # Barra lateral de navegación
│   ├── routes.tsx         # Configuración de rutas
│   └── store.ts           # Store global con Zustand (usuario, subtareas)
│
├── features/               # Funcionalidades por dominio
│   └── today/             # Feature "Today" (vista del día)
│       ├── components/    # Componentes específicos (Card, Badge, Button, etc.)
│       ├── hooks/         # Hooks personalizados (useTodayData)
│       └── utils/          # Utilidades específicas
│
├── pages/                 # Páginas/Vistas principales
│   ├── Today.tsx          # Vista principal del día (agrupación de subtareas)
│   ├── ActivityDetail.tsx # Detalle de actividad
│   ├── Create.tsx         # Creación de actividades
│   └── Progress.tsx       # Vista de progreso
│
└── shared/                # Componentes y utilidades compartidas
    ├── components/        # Componentes reutilizables (Avatar, Input, etc.)
    ├── hooks/             # Hooks compartidos
    └── utils/             # Utilidades compartidas (cn, formatters, etc.)


### 2. Gestión de Estado

* *Zustand Store (app/store.ts):* Maneja el estado global del usuario y las subtareas
* *Hooks Personalizados:* useTodayData para obtener datos del día actual (cursos, actividades, subtareas, logs)

### 3. Servicios de API

Los servicios están organizados por entidad en api/services/:
* course.js - Gestión de cursos
* activity.js - Gestión de actividades
* subtack.js - Gestión de subtareas
* reprogrammingLog.js - Historial de reprogramaciones

### 4. Componentes UI

Componentes accesibles basados en Radix UI:
* Card, Badge, Button, Checkbox, Popover, Calendar
* Todos con estilos consistentes usando Tailwind CSS

---

## 🚀 Instalación y Despliegue

Para levantar el entorno de desarrollo de forma local, asegúrate de tener instalado Node.js (versión recomendada en .nvmrc) y npm:

1. *Ingresar a la carpeta del frontend:*
   bash
   cd frontend
   

2. *Instalar dependencias:*
   bash
   npm install
   

3. *Configurar variables de entorno (opcional):*
   
   Crea un archivo .env en la raíz del proyecto:
   env
   VITE_API_URL=http://localhost:8000/api
   
   
   Si no se configura, por defecto usará http://localhost:8000/api.

4. *Levantar el servidor de desarrollo:*
   bash
   npm run dev
   

La aplicación estará disponible en http://localhost:5173.

### Scripts Disponibles

* npm run dev - Inicia el servidor de desarrollo
* npm run build - Genera el build de producción en dist/
* npm run preview - Previsualiza el build de producción
* npm run lint - Ejecuta el linter (ESLint)

### Build para Producción

bash
npm run build


Los archivos optimizados se generarán en la carpeta dist/ y pueden ser servidos con cualquier servidor web estático.
