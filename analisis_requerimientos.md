# Documento de Análisis y Requerimientos - Sistema de Agendamiento "Agenda Pro"

## 1. Enfoque Tecnológico y Arquitectura (SaaS Multi-Tenant)
El sistema está diseñado bajo un enfoque **Mobile-First**, priorizando la experiencia en dispositivos móviles y escalando a una versión Web App completa. Además, la plataforma funcionará como un **SaaS (Software as a Service) Multi-Tenant**, permitiendo que múltiples negocios utilicen el sistema de manera independiente y personalizada.

**Stack Tecnológico Propuesto (Multiplataforma):**
- **Frontend (App y Web):** React Native + Expo o Ionic (permite generar apps nativas y PWA). El frontend será dinámico y se adaptará visualmente dependiendo de la configuración del negocio.
- **Backend:** Node.js / Python (Django), estructurado con Arquitectura Hexagonal y partición de datos por `empresa_id` (Tenant).
- **Base de Datos:** PostgreSQL. Todos los registros estarán vinculados al ID del negocio (Tenant ID) para asegurar la separación de la información.
- **Notificaciones:** Twilio/WhatsApp API, SendGrid/AWS SES.

---

## 2. Requerimientos Funcionales (RF)

### Módulo de Multi-Tenancy y Marca Blanca (SaaS)
- **RF-00A:** El sistema debe permitir el registro de múltiples empresas/negocios independientes (Tenants).
- **RF-00B:** El sistema debe permitir a cada empresa personalizar su apariencia visual: subir logotipo, definir color principal y secundario.
- **RF-00C:** La interfaz de cliente final (App/Web) debe cargarse dinámicamente usando los colores y logotipos de la empresa a la que se está accediendo.
- **RF-00D:** Toda la información (Citas, Servicios, Asesores, Clientes) debe estar estrictamente separada y protegida por cada empresa.

### Módulo de Noticias y Anuncios
- **RF-00E:** El sistema debe permitir a cada empresa publicar noticias, promociones o anuncios.
- **RF-00F:** El cliente final debe poder visualizar un feed de noticias en el Booking Site o App correspondiente a esa empresa.

### Módulo de Gestión de Agenda y Calendario
- **RF-01:** El sistema debe permitir organizar y visualizar el calendario de cada asesor/instructor de forma individual o general.
- **RF-02:** El sistema debe permitir configurar los horarios de trabajo y los tiempos de descanso/receso de los asesores.
- **RF-03:** El sistema debe reflejar las nuevas citas en el calendario en **tiempo real**.
- **RF-04:** El sistema debe permitir agregar manualmente cualquier tipo de cita que el cliente solicite.

### Módulo de Servicios
- **RF-05:** El sistema debe permitir crear, editar y eliminar diferentes tipos de servicios (citas individuales y servicios grupales).
- **RF-06:** El sistema debe permitir asociar la disponibilidad de días y horas a cada servicio particular.
- **RF-07:** El sistema debe permitir añadir servicios adicionales o venta de productos físicos al catálogo.

### Módulo de Reservas (Booking Site para el Cliente)
- **RF-08:** El sistema debe generar una URL pública y compartible (por WhatsApp, redes sociales) para el agendamiento autogestionado.
- **RF-09:** El sitio de reservas debe ser responsive (mobile-first) y mostrar la información de la empresa: banner, ubicación y el portafolio de servicios.
- **RF-10:** El sistema debe permitir al cliente visualizar días y horas disponibles, y elegir un asesor específico o usar una asignación aleatoria.
- **RF-11:** El sistema debe requerir que el cliente registre sus datos personales para finalizar el agendamiento.

### Módulo de Notificaciones y Recordatorios
- **RF-12:** El sistema debe enviar recordatorios automáticos por WhatsApp al cliente una vez confirmada la cita.
- **RF-13:** El sistema debe enviar recordatorios por correo electrónico que incluyan el banner de la empresa, datos de la cita y la ubicación.
- **RF-14:** El sistema debe permitir al cliente confirmar, reprogramar o cancelar su cita directamente desde los enlaces del correo electrónico.

### Módulo de Pagos y Facturación
- **RF-15:** El sistema debe permitir registrar pagos de servicios y venta de productos extra desde la vista de la reserva.
- **RF-16:** El sistema debe generar y emitir un comprobante de pago digital al registrar una transacción exitosa.
- **RF-17:** El sistema debe contar con un módulo de control de ventas para hacer seguimiento a la facturación del día.

### Módulo de CRM y Reportes
- **RF-18:** El sistema debe mantener una base de datos centralizada de clientes, guardando el historial de todos los servicios que han tomado.
- **RF-19:** El sistema debe generar reportes gerenciales para detectar oportunidades de mejora en el negocio.

---

## 3. Historias de Usuario (HU)

**HU-01: Visualización y Control de Calendario**
> **Como** administrador del local,
> **Quiero** ver el calendario organizado de todos mis asesores y configurar sus descansos,
> **Para** saber su disponibilidad exacta, gestionar sus tiempos y evitar cruces de citas.

**HU-02: Configuración de Portafolio de Servicios**
> **Como** administrador,
> **Quiero** crear múltiples tipos de servicios (individuales o grupales) y definir sus horarios,
> **Para** mantener mi oferta de servicios actualizada y lista para ser reservada por los clientes.

**HU-03: Reserva Autogestionada por el Cliente**
> **Como** cliente,
> **Quiero** acceder a un enlace desde mi celular para ver el portafolio, ubicación, horarios y asesores disponibles,
> **Para** agendar mi propia cita de manera fácil y rápida sin necesidad de llamar o ir al local.

**HU-04: Notificaciones y Gestión de Cita**
> **Como** cliente,
> **Quiero** recibir confirmaciones y recordatorios de mi cita por WhatsApp y correo electrónico,
> **Para** no olvidar la asistencia y poder confirmar, reprogramar o cancelar fácilmente desde mi correo.

**HU-05: Registro de Pagos y Ventas Adicionales**
> **Como** cajero o recepcionista,
> **Quiero** registrar el pago del servicio agendado y agregar la compra de productos adicionales,
> **Para** emitir un comprobante unificado al cliente y registrar correctamente los ingresos.

**HU-06: Control de Negocio y CRM**
> **Como** dueño del negocio,
> **Quiero** visualizar reportes de ventas diarias y revisar el historial de servicios de mis clientes,
> **Para** tomar decisiones informadas, fidelizar a mis clientes y llevar mi negocio a otro nivel.
