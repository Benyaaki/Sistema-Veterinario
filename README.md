# Veterinaria Paty - Sistema de Gestión

Sistema web para gestión de fichas clínicas veterinarias, desarrollado con FastAPI, MongoDB, React y TailwindCSS.

## Requisitos Previos

- Python 3.9+
- Node.js 18+
- MongoDB correindo localmente (puerto 27017)

## Instalación y Ejecución

### 1. Base de Datos
Asegúrate de que MongoDB esté corriendo:
```bash
mongod --dbpath /ruta/a/tus/datos
```

### 2. Backend (API)

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno (Windows)
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# (Ajustar credenciales en .env si es necesario)

# Inicializar Base de Datos (Crear usuario admin)
python seed.py

# Ejecutar Servidor
uvicorn app.main:app --reload
```
API Docs: http://localhost:8000/api/v1/docs

### 3. Frontend (Web)

```bash
cd frontend

# Instalar dependencias
npm install

# Ejecutar desarrollo
npm run dev
```
Web: http://localhost:5173

## Credenciales Iniciales
- **Email**: admin@paty.vet
- **Password**: admin

## Características
- **Tutores**: Gestión de clientes.
- **Pacientes**: Fichas clínicas con historial.
- **Consultas**: Registro de atenciones.
- **Exámenes**: Subida de archivos (PDF/Imágenes).
- **Recetas**: Generación de PDF con firma digital.
- **Firma**: Configuración de firma en Ajustes.

## Notas de Despliegue (Futuro)
Para desplegar en Render:
- Crear Web Service para Backend (Python).
- Crear Static Site para Frontend (Build).
- Usar MongoDB Atlas para la base de datos.
