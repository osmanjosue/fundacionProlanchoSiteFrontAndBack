# Directorio de talento — documentación del módulo

> **Estado: implementado y probado** (2026-09-15), en la rama `feature/directorio-talento` de los dos
> repositorios. Este documento describe lo que existe, cómo operarlo y qué queda pendiente.
> Contrato detallado de la API: `talento-api.md`, en esta misma carpeta.
> `talento-formulario-publico.md` describe el formulario público y está desactualizado.

---

## 1. Qué es y por qué

La fundación recibe hojas de vida por el formulario público `/trabaja-con-nosotros`. Tras reunirse con
ellos quedó claro que **no quieren descartar currículos, sino conservar una base de datos de talento**
que consultar cuando surja una vacante.

El directorio es esa consulta: un panel **de solo lectura** donde el personal de la fundación ve todos
los perfiles recibidos, los filtra por área y abre la ficha completa con el CV.

Decisiones que explican el diseño:

| Punto | Decisión |
|---|---|
| Permisos | Solo lectura. El panel no escribe nada en MongoDB. |
| Acceso | Enlace enviado al correo, sin contraseña. La lista de correos vive en el `.env`. |
| Descartes | No existen. Todos los perfiles se listan siempre. |
| Borrado | No implementado. Se acordará con la fundación. |
| Base de datos | Sin cambios de esquema ni migraciones. |
| Consulta | Filtro por área. Orden fijo: el más reciente primero. |
| Campo `estado` y `PATCH /estado` | Siguen existiendo en el backend; el directorio los ignora. |
| Entrada al sitio | Sin enlace en el menú ni en el pie. La dirección se comparte a mano. |

---

## 2. Cómo funciona el acceso

1. La persona abre `/talento/acceso` y escribe su correo.
2. El backend comprueba si ese correo está en `TALENTO_LECTORES`. Si está, le envía un enlace.
   **La respuesta es siempre la misma**, esté o no en la lista, para no revelar quién tiene acceso.
3. El enlace lleva a `/talento/entrar?token=…` y **caduca a los 15 minutos**.
4. Esa página canjea el token por un **token de sesión de 8 horas**, que se guarda en el navegador
   bajo la clave `tokenLector`, y entra al directorio.
5. Cada petición del directorio manda esa sesión en el header `x-lector-token`. El backend verifica el
   token **y que el correo siga en la lista**.

### Por qué dos tokens

El token del correo vive en una bandeja de entrada: se reenvía y queda en el historial. Por eso dura
poco y solo sirve para canjearse. El token de sesión, que es el que da acceso de verdad, nunca pasa
por el correo.

### Límites conocidos

- **El enlace no es de un solo uso:** funciona las veces que se abra durante sus 15 minutos. Evitarlo
  exigiría guardar los tokens en la base de datos.
- **La lista se lee al arrancar:** cambiarla exige reiniciar el backend.
- **Los límites de peticiones son por IP:** 5 cada 15 minutos para pedir el enlace y otras 5 para
  canjearlo, con contadores separados. Varias personas en la misma oficina comparten ese cupo.

---

## 3. Mapa del código

### Backend — `FundacionProlanchoBackend`

| Archivo | Responsabilidad |
|---|---|
| `helpers/talento-lectores.js` | Lee `TALENTO_LECTORES`, normaliza a minúsculas y responde si un correo tiene acceso. Avisa por consola si la lista está vacía. |
| `helpers/jwt-magic-link.js` | Genera y verifica los tokens. Tres tipos, firmados con `MAGIC_LINK_SECRET` y distinguidos por su campo `type`: `magic-link` (una postulación, 48 h), `acceso-lector` (enlace, 15 min) y `sesion-lector` (sesión, 8 h). Cada verificadora exige su tipo exacto. |
| `controllers/talento-acceso-controllers.js` | `solicitarAcceso` y `canjearAcceso`. |
| `middlewares/validar-lector-talento.js` | Protege la lectura: valida `x-lector-token` y que el correo siga en la lista. Siempre 401 si algo falla. |
| `routes/talento-routes.js` | Rutas del módulo. |
| `controllers/talento-controllers.js` | `listarPostulaciones` con filtro por `estado` y `area`. |
| `helpers/talento-email.helper.js` | Los tres correos: aviso interno, acuse al postulante y enlace de acceso. |

**Endpoints** (detalle en `talento-api.md`):

| Ruta | Acceso |
|---|---|
| `POST /api/talento` | pública (formulario) |
| `POST /api/talento/acceso` | pública, limitada |
| `POST /api/talento/acceso/canjear` | pública, limitada |
| `GET /api/talento` | `x-lector-token`; admite `page`, `limit` (máx. 50) y `area` |
| `GET /api/talento/:id` | `x-lector-token` |
| `GET /api/talento/magic/:id` | `x-magic-token` (enlace del correo de aviso) |
| `PATCH /api/talento/:id/estado` | `x-token` de administrador; el directorio no lo usa |

**Variables de entorno** añadidas: `TALENTO_LECTORES`. Ya existían `MAGIC_LINK_SECRET`,
`FRONTEND_URL` y `TALENTO_CONTACT_TO`.

### Frontend — `fundacionProlanchoFrontend`

| Archivo | Responsabilidad |
|---|---|
| `core/utils/jwt.util.ts` | `esTokenValido` y `emailDeToken`: leen el payload del JWT en el navegador. Sin dependencias de Angular. |
| `core/utils/cv.util.ts` | Detección de PDF, slug del nombre, URL de descarga de Cloudinary (`fl_attachment`) y formato de fecha. |
| `core/guards/lector.guard.ts` | Protege las rutas del directorio. Devuelve un `UrlTree` hacia `/talento/acceso`. |
| `services/talento.service.ts` | `solicitarAcceso`, `canjearAcceso`, `listarPerfiles`, `verPerfil` y el manejo de `tokenLector`. |
| `interfaces/postulacion.interface.ts` | Tipos del módulo, las listas de áreas y niveles, y sus etiquetas legibles. |
| `shared/components/perfil-talento/` | Presentación del perfil: datos, historial de áreas y visor del CV. Recibe el perfil por `@Input`. |
| `pages/talento/acceso/` | Pedir el enlace. |
| `pages/talento/entrar/` | Canjear el enlace. |
| `pages/talento/directorio/` | Tabla, filtro por área y paginación. |
| `pages/talento/ficha/` | Perfil completo. |
| `pages/talento/talento-pages.css` | Estilos comunes de las cuatro páginas. |

**Rutas** (en `pages/pages.routing.ts`): `talento/acceso`, `talento/entrar`,
`talento/directorio` y `talento/directorio/:id`, estas dos últimas con `lectorGuard`. La vista del
magic link sigue en `talento/revisar/:id`.

**Estado en la URL.** El directorio guarda la página y el área en los query params, y esa es su única
fuente de verdad: al volver desde una ficha se recupera la misma página y el mismo filtro.

**Reutilización.** `perfil-talento` lo usan la ficha del directorio y la vista del magic link; cada una
pone su propia cabecera y obtiene los datos con su propio tipo de token.

---

## 4. Operación

**Dar acceso a alguien:** añadir su correo a `TALENTO_LECTORES` en el `.env` del backend, separado por
comas, y reiniciar el servidor. Después, esa persona entra en `TU-DOMINIO/talento/acceso`.

**Quitar acceso:** borrar el correo de la lista y reiniciar. La sesión abierta deja de funcionar en la
siguiente petición, sin esperar a que caduquen las 8 horas.

**Puesta en producción:** desplegar las dos ramas, configurar `TALENTO_LECTORES`, reiniciar el backend
y comprobar que `FRONTEND_URL` apunta al dominio real. Si apunta a `localhost`, los enlaces de los
correos no funcionarán.

**Si alguien no recibe el enlace:** comprobar que su correo está en la lista tal cual lo escribe
(mayúsculas y espacios no importan, el backend normaliza), que el servidor se reinició tras el cambio,
y la carpeta de spam. Con la lista vacía, el backend avisa por consola al arrancar.

---

## 5. Trampas del código, para quien lo modifique

- **Font Awesome se carga como JavaScript** (`assets/fontAwesome/js/all.min.js`) y sustituye cada `<i>`
  por un `<svg>` fuera del control de Angular:
  - un `<i>` que sea nodo raíz de un bloque `@if` / `@else` se duplica al alternar; hay que dejar los
    dos estados en el DOM y ocultar uno con una clase (patrón `.btn-estado` / `.oculto`);
  - `[ngClass]` sobre un `<i>` no cambia el icono ya dibujado;
  - una regla de componente como `.header-icon i` no alcanza al `<svg>`: el color y el tamaño se ponen
    en el contenedor y se heredan.
- **`PaginacionComponent` es base 0** y el backend base 1. Además no limita el rango: emite `-1` en la
  primera página y una página inexistente en la última, así que hay que ignorar esos valores.
- **`areasInteres` es un historial:** el área vigente y la fecha de la última postulación salen del
  **último** elemento, y su longitud es el número de postulaciones. `createdAt` es la primera vez.
- **El filtro por área usa el historial:** incluye a quien postuló a esa área alguna vez, aunque su
  última postulación sea de otra. Es intencionado, para no perder candidatos.
- **Campos opcionales ausentes:** `tituloProfesional`, `anosExperiencia`, `linkedinUrl` y
  `presentacion` no llegan como `null`; la clave no viene en el JSON. Comprobar con `!== undefined`,
  porque `0` es un valor válido de experiencia.
- **`tokenLector` y `token` son claves distintas** de `localStorage`: la primera es la sesión del
  directorio y la segunda la del administrador. Compartirlas haría que se pisaran entre sí.
- **El guard del frontend no es seguridad**, solo evita pantallas vacías; la autorización real está en
  el middleware del backend.
- **No revelar quién tiene acceso:** `POST /acceso` responde igual para cualquier correo **y no espera
  al envío del correo**, porque ese retraso también delataría a los de la lista.
- **`?area` vacío da 400:** para "todas" hay que omitir el parámetro. La validación usa `isString()`
  antes de `isIn()`, porque sin eso Express deja pasar arrays como `?area=a&area=b`.
- **Los estilos no cruzan de componente:** Angular encapsula el CSS, así que cada clase debe estar
  definida en el componente cuya plantilla la usa.

---

## 6. Prueba de punta a punta

1. Con el correo en la lista: `/talento/acceso` → llega el correo → el enlace entra al directorio y la
   URL ya no muestra el token.
2. Con un correo fuera de la lista: misma respuesta en pantalla y no llega nada.
3. Enlace usado pasados 15 minutos, alterado o ausente: mensaje de enlace no válido.
4. Directorio: paginar, filtrar por cada área y por "todas", y comprobar el caso sin resultados.
5. Un perfil con dos postulaciones muestra el contador y el área más reciente, y aparece también al
   filtrar por su área anterior.
6. Ficha: datos, historial, PDF incrustado y DOCX con descarga de nombre legible. "Volver al
   directorio" recupera la misma página y el mismo filtro, y el selector muestra esa área.
7. URLs manipuladas: `?page=abc` cae en la página 1, `?page=99` va a la última, `?area=inventada`
   muestra todas; un id inexistente da "Perfil no encontrado".
8. Sesión: "Salir" expulsa; quitar el correo de la lista y reiniciar expulsa en la acción siguiente.
9. Regresión: el formulario público, el enlace del correo de aviso (`/talento/revisar/:id`) y el panel
   de administración de noticias siguen funcionando, con sus sesiones independientes.

---

## 7. Pendientes

**Con la fundación**
- Actualizar la **política de privacidad**: el formulario ya avisa de que los datos y la hoja de vida
  se conservan de forma indefinida en la base de talento, pero la política a la que remite todavía no
  lo dice, y falta definir cómo se pide el borrado de un perfil.
- Revisar el **correo de acuse** al postulante, que aún suena a convocatoria puntual en lugar de a
  base de talento.

**Técnicos**
- Borrado de perfiles, con su archivo en Cloudinary.
- Búsqueda por nombre o documento, y filtros por nivel educativo o ciudad si el directorio crece.
- Limpieza del campo `estado` y del `PATCH /estado`, que ya nadie usa.
- Enlace de acceso de un solo uso, si algún día se acepta guardar tokens en la base de datos.
- Página 404: hoy una URL mal escrita deja la pantalla en blanco.
- Aviso `NG0955` de claves duplicadas en `PaginacionComponent`, anterior a este módulo.
- El icono del aviso en `/talento/acceso` se ve blanco en lugar de amarillo, por la regla
  `.aviso-talento svg` que la encapsulación no aplica.
