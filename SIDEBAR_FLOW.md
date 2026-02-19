# Flujo de Renderizado del Sidebar

## 📋 Resumen del Flujo

El sidebar se renderiza siguiendo este flujo:

```
App.tsx → routes.tsx → AppLayout.tsx → SidebarProvider → AppSidebar → Sidebar
```

## 🔍 Puntos de Verificación

### 1. **AppLayout.tsx** (Líneas 6-17)
**Estado inicial del sidebar:**
```typescript
const [sidebarOpen, setSidebarOpen] = React.useState(true);
```
- ✅ Estado inicial: `true` (expandido)
- ✅ Se pasa a `SidebarProvider` como prop `open={sidebarOpen}`

**Limpieza de cookies (Líneas 10-13):**
```typescript
React.useEffect(() => {
  document.cookie = 'sidebar:state=; path=/; max-age=0'; // Elimina cookie previa
  setSidebarOpen(true); // Fuerza estado expandido
}, []);
```
- ✅ Elimina cualquier cookie que pueda colapsar el sidebar
- ✅ Fuerza el estado a `true` al cargar

### 2. **SidebarProvider** (sidebar.tsx, Líneas 42-136)
**Recibe el estado:**
```typescript
open: openProp ?? _open  // Línea 65
```
- ✅ Si `openProp` está definido (desde AppLayout), lo usa
- ✅ Si no, usa `_open` (estado interno, default: `true`)

**Calcula el estado visual:**
```typescript
const state = open ? "expanded" : "collapsed";  // Línea 101
```
- ✅ `state = "expanded"` cuando `open = true`
- ✅ `state = "collapsed"` cuando `open = false`

**Proporciona contexto:**
```typescript
const contextValue = {
  state,      // "expanded" o "collapsed"
  open,       // true o false
  isMobile,   // true si ancho < 768px
  // ...
}
```

### 3. **AppSidebar** (AppSidebar.tsx, Línea 29)
**Renderiza el componente Sidebar:**
```typescript
<Sidebar collapsible="icon">
```
- ✅ `collapsible="icon"` permite colapsar a modo icono
- ✅ El contenido siempre se renderiza (no se oculta)

### 4. **Sidebar Component** (sidebar.tsx, Líneas 139-224)
**Verifica si es móvil:**
```typescript
if (isMobile) {
  return <Sheet>...</Sheet>  // Muestra como Sheet (overlay)
}
```

**Renderiza en desktop (Líneas 181-223):**
```typescript
<div
  className="group peer hidden text-sidebar-foreground md:block"
  data-state={state}  // "expanded" o "collapsed"
  data-collapsible={state === "collapsed" ? collapsible : ""}
>
```

**Clases CSS críticas:**
- `hidden md:block` (Línea 184): Oculta en móvil, muestra en desktop (≥768px)
- `md:flex` (Línea 203): Muestra el contenido en desktop

**Ancho del sidebar:**
- Expandido: `w-[--sidebar-width]` = `16rem` (256px)
- Colapsado (icon): `w-[--sidebar-width-icon]` = `3rem` (48px)

## 🎯 Puntos Clave para Verificar

### ✅ Estado del Sidebar
1. **En AppLayout.tsx:**
   - `sidebarOpen` debe ser `true`
   - `useEffect` debe ejecutarse y limpiar cookies

2. **En SidebarProvider:**
   - `open` debe ser `true`
   - `state` debe ser `"expanded"`

3. **En el DOM:**
   - El elemento debe tener `data-state="expanded"`
   - NO debe tener `data-collapsible="icon"` cuando está expandido

### ✅ Clases CSS
1. **Contenedor externo (Línea 184):**
   - Debe tener: `md:block` (visible en desktop)
   - NO debe tener: `hidden` aplicado en desktop

2. **Contenedor interno (Línea 203):**
   - Debe tener: `md:flex` (visible en desktop)
   - Debe tener: `left-0` (posición izquierda)

3. **Ancho:**
   - Expandido: `w-[--sidebar-width]` (16rem)
   - Colapsado: `w-[--sidebar-width-icon]` (3rem)

### ✅ Variables CSS
1. **En SidebarProvider (Línea 122):**
   ```typescript
   "--sidebar-width": "16rem"
   "--sidebar-width-icon": "3rem"
   ```

## 🔧 Cómo Verificar en el Navegador

### 1. **Herramientas de Desarrollo (F12)**

**Inspeccionar el elemento del sidebar:**
```html
<!-- Buscar este elemento -->
<div class="group peer hidden text-sidebar-foreground md:block" 
     data-state="expanded" 
     data-collapsible="">
```

**Verificar:**
- ✅ `data-state="expanded"` (NO "collapsed")
- ✅ `data-collapsible=""` (vacío cuando expandido)
- ✅ Clases: debe tener `md:block` y `md:flex` aplicadas

**Verificar el contenedor interno:**
```html
<div class="fixed inset-y-0 z-10 h-svh w-[--sidebar-width] ... md:flex">
```
- ✅ Debe tener `md:flex` aplicado
- ✅ Debe tener `left-0` (posición izquierda)
- ✅ Ancho debe ser `256px` (16rem) cuando expandido

### 2. **Consola del Navegador**

**Verificar estado:**
```javascript
// Verificar cookie
document.cookie.includes('sidebar:state')

// Verificar ancho de ventana
window.innerWidth >= 768  // Debe ser true en desktop
```

### 3. **React DevTools**

**Verificar props:**
- `SidebarProvider`: `open={true}`
- `Sidebar`: `collapsible="icon"`

## 🐛 Problemas Comunes

### ❌ Sidebar no visible
1. **Verificar ancho de ventana:**
   - Debe ser ≥ 768px para que `md:flex` se aplique

2. **Verificar estado:**
   - `data-state` debe ser `"expanded"`
   - `open` debe ser `true`

3. **Verificar cookies:**
   - Eliminar cookie: `document.cookie = 'sidebar:state=; path=/; max-age=0'`

4. **Verificar clases CSS:**
   - El elemento debe tener `md:flex` aplicado
   - NO debe tener `hidden` aplicado en desktop

### ❌ Sidebar colapsado
1. **Verificar `data-state`:**
   - Debe ser `"expanded"`, no `"collapsed"`

2. **Verificar `data-collapsible`:**
   - Debe estar vacío cuando expandido
   - Solo tiene valor cuando `state === "collapsed"`

3. **Verificar ancho:**
   - Expandido: `256px` (16rem)
   - Colapsado: `48px` (3rem)

## 📝 Resumen de Archivos

1. **AppLayout.tsx**: Controla el estado inicial (`sidebarOpen = true`)
2. **AppSidebar.tsx**: Define el contenido del sidebar
3. **sidebar.tsx**: 
   - `SidebarProvider`: Maneja el estado y contexto
   - `Sidebar`: Renderiza el componente visual

## ✅ Checklist de Verificación

- [ ] `AppLayout.tsx`: `sidebarOpen = true`
- [ ] `AppLayout.tsx`: `useEffect` limpia cookies
- [ ] `SidebarProvider`: `open = true`
- [ ] `SidebarProvider`: `state = "expanded"`
- [ ] DOM: `data-state="expanded"`
- [ ] DOM: `data-collapsible=""` (vacío)
- [ ] CSS: `md:flex` aplicado
- [ ] CSS: Ancho = `256px` (expandido)
- [ ] Ventana: Ancho ≥ `768px`
