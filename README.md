# Veterinaria Paty - Sistema de Gestión

Sistema web para gestión de fichas clínicas veterinarias, desarrollado con FastAPI, MongoDB, React y TailwindCSS.

## Requisitos Previos

Asegúrate de tener instalado lo siguiente en tu sistema:

- **Python** (v3.10 o superior)
- **Node.js** (v18 o superior)
- **MongoDB** (Debe estar ejecutándose localmente o tener una URI de conexión)

## Configuración del Backend

1. **Navegar a la carpeta del backend:**
   ```bash
   cd backend
   ```

2. **Crear y activar un entorno virtual:**
   ```bash
   python -m venv venv
   # En Windows:
   .\venv\Scripts\activate
   # En macOS/Linux:
   source venv/bin/activate
   ```

3. **Instalar dependencias:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurar variables de entorno:**
   - Copia el archivo de ejemplo `.env.example` a `.env`:
     ```bash
     cp .env.example .env
     # O en Windows command prompt: copy .env.example .env
     ```
   - Abre `.env` y ajusta las configuraciónes si es necesario (especialmente `MONGODB_URI` si tu base de datos no está en el puerto por defecto).

5. **(Opcional) Cargar datos de prueba:**
   Si deseas poblar la base de datos con datos iniciales:
   ```bash
   python seed_v2.py
   ```

6. **Iniciar el servidor:**
   ```bash
   uvicorn app.main:app --reload
   ```
   El backend estará disponible en `http://localhost:8000`.
   La documentación de la API se puede ver en `http://localhost:8000/docs`.

## Configuración del Frontend

1. **Navegar a la carpeta del frontend:**
   Desde la raíz del proyecto:
   ```bash
   cd frontend
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   El frontend estará disponible generalmente en `http://localhost:5173` (la terminal mostrará la URL exacta).

## Estructura del Proyecto

- **/backend**: Código fuente de la API (FastAPI).
  - **/app**: Lógica principal, modelos y rutas.
- **/frontend**: Código fuente de la interfaz (React + Vite).
- **/docs**: Documentación adicional (si aplica).

## Características Principales

- **Tutores**: Gestión de clientes.
- **Pacientes**: Fichas clínicas con historial completo.
- **Consultas**: Registro detallado de atenciones.
- **Exámenes**: Subida y gestión de archivos.
- **Recetas**: Generación de recetas en PDF.
# Sistema-Veterinario
