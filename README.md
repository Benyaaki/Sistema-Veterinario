# Sistema de Gestión Veterinaria CalFer

El Sistema de Gestión Veterinaria CalFer es una plataforma integral diseñada para la administración eficiente de clínicas veterinarias y servicios de peluquería canina. Este proyecto centraliza todas las operaciones clínicas, comerciales y administrativas en una única interfaz web, permitiendo un flujo de trabajo optimizado y una gestión basada en datos precisos.

## Arquitectura del Proyecto

El sistema se basa en una arquitectura de desacoplamiento entre el cliente (Frontend) y el servidor (Backend), lo que garantiza una alta escalabilidad y facilidad de mantenimiento.

### Backend

Desarrollado con Python utilizando el framework FastAPI. Se eligió esta tecnología por su alto rendimiento, validación automática de datos y documentación interactiva nativa.

*   **FastAPI**: Núcleo del servidor que gestiona las peticiones HTTP y la lógica de negocio.
*   **Pydantic**: Utilizado para la validación de esquemas y modelos de datos, asegurando que la información que entra y sale del servidor sea consistente.
*   **Beanie (ODM)**: Capa de abstracción sobre MongoDB que permite interactuar con la base de datos de forma asíncrona mediante modelos de Python.
*   **JWT (JSON Web Tokens)**: Implementación de autenticación segura para la gestión de sesiones y protección de rutas.
*   **Bcrypt**: Algoritmo de hash utilizado para el cifrado de contraseñas de usuarios.

### Frontend

Construido con React y optimizado mediante Vite para una experiencia de usuario rápida y fluida.

*   **React**: Biblioteca principal para la construcción de interfaces basadas en componentes reutilizables.
*   **Vite**: Herramienta de compilación que ofrece tiempos de respuesta inmediatos durante el desarrollo y empaquetado eficiente para producción.
*   **Tailwind CSS**: Framework de diseño utilizado para crear una interfaz moderna, limpia y altamente receptiva (responsive).
*   **Lucide React**: Conjunto de iconos vectoriales para una navegación visual intuitiva.
*   **Axios**: Cliente HTTP para la comunicación con la API del Backend, configurado con interceptores para la gestión automática de tokens.

### Base de Datos

*   **MongoDB**: Base de datos NoSQL documental que ofrece flexibilidad para el almacenamiento de historiales clínicos y registros de ventas, permitiendo estructuras de datos dinámicas.

---

## Módulos y Funcionalidades del Sistema

### 1. Panel de Control (Dashboard)

El Dashboard es el centro de mando del sistema. Proporciona una visión inmediata del estado operativo de la clínica.

*   **Métricas en Tiempo Real**: Visualización de las ventas totales del día, cantidad de transacciones y citas agendadas.
*   **Análisis Estadísticos**: Gráficos interactivos que muestran el rendimiento de ventas por sucursal y la evolución mensual de ingresos.
*   **Gestión de Citas Pendientes**: Listado rápido de las próximas atenciones para asegurar el cumplimiento de la agenda.

### 2. Gestión Clínica Veterinaria

Este módulo abarca toda la vida médica de los pacientes.

*   **Agenda Multiproducto**: Calendario avanzado para gestionar citas de veterinaria y peluquería por separado, con soporte para múltiples sucursales.
*   **Ficha Clínica Digital**: Registro histórico de cada mascota, incluyendo anamnesis, diagnósticos, peso, toma de temperatura y observaciones clínicas.
*   **Historial de Vacunación y Desparasitación**: Seguimiento estricto de tratamientos preventivos.
*   **Recetas Médicas Profesionales**: Generación automática de recetas en formato PDF que incluyen la firma digital del médico responsable y se pueden enviar por correo electrónico.

### 3. Punto de Venta (POS) y Gestión de Ventas

Diseñado para facilitar transacciones comerciales rápidas y seguras.

*   **Terminal de Ventas**: Interfaz de ventas con búsqueda inteligente de productos y servicios.
*   **Gestión de Pagos**: Soporte para múltiples métodos de pago (Efectivo, Tarjeta de Débito, Crédito, Transferencia).
*   **Ventas en Modo Deudado**: Funcionalidad exclusiva para clientes registrados que permite registrar ventas fía a una cuenta corriente personal.
*   **Historial de Ventas**: Registro detallado de cada transacción para auditoría y reportes.

### 4. Inventario y Materiales

Control riguroso de las existencias para evitar quiebres de stock.

*   **Stock por Sucursal**: Cada clínica gestiona su propio inventario de forma independiente.
*   **Alertas de Nivel Bajo**: Sistema de advertencia visual para productos que alcanzan su stock crítico.
*   **Recepción y Despacho**: Registro de entrada de mercadería de proveedores y transferencias internas de productos entre sucursales.

### 5. Administración de Entidades (Tutores y Clientes)

Centralización de la información de contacto y relación con los usuarios.

*   **Base de Datos de Tutores**: Almacenamiento de RUT, dirección, teléfono y correo electrónico.
*   **Relación Tutor-Paciente**: Vinculación de una cuenta de tutor con múltiples mascotas, facilitando el acceso a su historial familiar.

### 6. Seguridad y Auditoría

Protección de datos y monitoreo de la actividad interna.

*   **Control de Acceso (RBAC)**: Permisos detallados que restringen las acciones según el rol del usuario (Administrador, Veterinario, Vendedor, Peluquero).
*   **Log de Actividades**: Registro detallado de cada acción sensible realizada en el sistema (quién, cuándo y qué se modificó).
*   **Gestión de Sesiones**: Monitoreo de dispositivos conectados y capacidad de cerrar sesiones remotamente.
*   **Protección contra Intrusión**: Bloqueo automático de cuentas tras detectar múltiples intentos de acceso fallidos.

---

## Roles de Usuario y Permisos

1.  **Administrador**: Acceso total al sistema, reportes financieros, gestión de personal, configuraciones globales y herramientas de seguridad.
2.  **Veterinario**: Permisos enfocados en el área clínica (Agenda, Fichas Médicas, Recetas). No tiene acceso a métricas financieras.
3.  **Vendedor**: Acceso restringido a ventas, inventario y gestión de clientes. No tiene acceso a configuraciones administrativas.
4.  **Peluquero**: Acceso optimizado para la gestión de citas de peluquería canina y ficha básica de mascotas.

---

## Guía de Ejecución Local

Para iniciar el sistema en un entorno local de Windows:

1.  **Requisitos**: Asegúrese de tener instalado MongoDB y Node.js.
2.  **Inicio Automático**: Ejecute el archivo `INICIAR_SISTEMA.bat`. Este script activará el entorno virtual de Python, las dependencias del Backend y lanzará el servidor de desarrollo del Frontend en `http://localhost:5173`.
3.  **Configuración de Entorno**: Las variables de conexión a la base de datos y llaves de seguridad se gestionan a través del archivo `.env` en el directorio raíz.

---

Este sistema ha sido desarrollado a medida para satisfacer las necesidades operativas de CalFer, garantizando una herramienta robusta, segura y fácil de usar.