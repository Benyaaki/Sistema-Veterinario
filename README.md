# Sistema de Gestión Veterinaria

Sistema web integral desarrollado para la administración eficiente de clínicas veterinarias. Esta solución moderna facilita el control de pacientes, inventario, ventas y reportes de gestión.

## Características Principales

*   **Gestión Clínica**:
    *   Fichas clínicas digitales de pacientes (historial médico, vacunas, desparasitaciones).
    *   Registro de tutores y mascotas.
    *   Agenda de citas y recordatorios.
*   **Punto de Venta (POS)**:
    *   Venta de productos y servicios.
    *   Control de caja y métodos de pago múltiples.
    *   Generación de boletas y control de deudas.
*   **Inventario**:
    *   Control de stock en tiempo real.
    *   Gestión de proveedores y órdenes de compra.
    *   Alertas de stock bajo y vencimientos.
*   **Gestión Administrativa**:
    *   Reportes avanzados de ventas, rendimiento y productividad.
    *   Control de acceso basado en roles (Administrador, Veterinario, Vendedor).
    *   Gestión de múltiples sucursales.

## Tecnologías Utilizadas

*   **Frontend**: React, TypeScript, TailwindCSS, Vite.
*   **Backend**: Python, FastAPI.
*   **Base de Datos**: MongoDB (Beanie ODM).
*   **Infraestructura**: Docker ready (opcional).

## Instalación y Configuración

### Requisitos Previos
*   Python 3.10+
*   Node.js 18+
*   MongoDB local o clúster remoto.

### 1. Configuración del Backend

```bash
cd backend
python -m venv venv
# Activar entorno virtual:
# Windows: .\venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Configura tus variables de entorno en .env (MongoDB URI, Secret Key, etc.)

python seed_v2.py # (Opcional) Cargar datos iniciales
uvicorn app.main:app --reload
```

El servidor iniciará en `http://localhost:8000`.

### 2. Configuración del Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---
Desarrollado con enfoque en rendimiento, escalabilidad y experiencia de usuario.
