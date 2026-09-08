# API — Módulo Talento

Contrato de los endpoints de postulaciones de la Fundación Prolancho.
Documento de referencia para construir el frontend (formulario público + panel administrativo).

Stack backend: Express 4 + MongoDB (Mongoose) + Cloudinary.
Ruta base: `https://<host>/api/talento`

---

## 1. Convenciones generales

Todas las respuestas del backend son JSON con una envoltura `ok`. Hay **tres formas
posibles** y el cliente debe manejar las tres:

```jsonc
// 1) Éxito
{ "ok": true, /* ...datos */ }

// 2) Error de negocio / servidor
{ "ok": false, "msg": "Postulación no encontrada" }

// 3) Error de validación de campos (express-validator)
{
  "ok": false,
  "errors": {
    "email":  { "type": "field", "value": "abc", "msg": "El correo electrónico no es válido",
                "path": "email", "location": "body" },
    "ciudad": { "type": "field", "msg": "La ciudad es necesaria", "path": "ciudad", "location": "body" }
  }
}
```

> **Importante:** la forma 3 **no trae `msg` en la raíz**. Es el error más común al integrar.
> Helper recomendado:
>
> ```js
> const mensajeDeError = (data) =>
>   data?.msg ?? Object.values(data?.errors ?? {})[0]?.msg ?? 'Error inesperado';
> ```
>
> Para pintar errores campo a campo en el formulario, `errors` viene indexado por el nombre
> del campo, que coincide exactamente con el `name` del input.

**Orígenes permitidos (CORS).** Las peticiones desde el navegador solo funcionan desde:
`http://localhost:4200`, `http://localhost:5173`, `http://localhost:3000`,
`https://fundacionprolancho.org`, `https://www.fundacionprolancho.org`.
Cualquier otro origen lo bloquea el navegador.

**Rate limit global:** 100 peticiones por minuto por IP en todo el backend →
`429 { ok:false, msg:"Demasiadas solicitudes. Intenta de nuevo en un minuto." }`.
El `POST` de postulaciones tiene además su propio límite (ver §3).

---

## 2. Autenticación

El formulario público **no** requiere autenticación. Los tres endpoints administrativos sí,
y además exigen ser **el usuario administrador** (no basta con estar logueado).

**Obtener token:**

```
POST /api/login
Content-Type: application/json
{ "name": "usuario", "password": "clave" }

→ 200 { "ok": true, "token": "eyJ...", "menu": [...] }
→ 400 / 404 { "ok": false, "msg": "Uno de los campos es invalido" }
→ 429 (máximo 3 intentos por minuto)
```

**Usar el token:** header **`x-token`** (no es `Authorization: Bearer`).

```js
fetch('/api/talento', { headers: { 'x-token': token } })
```

**Vigencia:** 12 horas. Se renueva con `GET /api/login/renew` enviando el `x-token` actual;
devuelve un token nuevo con la misma forma que el login.

**Errores de auth (aplican a §4, §5 y §6):**

| Código | Cuerpo | Cuándo |
|---|---|---|
| `401` | `{ ok:false, msg:"No hay token en la peticion" }` | falta el header `x-token` |
| `401` | `{ ok:false, msg:"token no valido" }` | token corrupto o expirado → redirigir al login |
| `403` | `{ ok:false, msg:"No tienes permisos para realizar esta acción" }` | logueado pero no es el admin |

---

## 3. `POST /api/talento` — Crear postulación (público)

Endpoint del formulario público de "Trabaja con nosotros". Sin autenticación.

**Content-Type: `multipart/form-data`** (lleva archivo).
En el navegador usa `FormData` y **no fijes el header `Content-Type` a mano**: el browser
debe generarlo con su `boundary`. Si lo pones manualmente, el backend no podrá parsear nada.

**Rate limit propio: 5 postulaciones por IP cada 15 minutos** →
`429 { ok:false, msg:"Demasiadas postulaciones enviadas. Intenta de nuevo más tarde." }`.

### 3.1 Campos

| Campo | Tipo | Obligatorio | Regla exacta |
|---|---|:---:|---|
| `curriculo` | **File** | sí | PDF o DOCX. Máximo **5 MB**. Un solo archivo. |
| `nombreCompleto` | string | sí | mínimo 3 caracteres (se aplica `trim` antes de medir) |
| `numeroDocumento` | string | sí | no vacío. **Clave de identidad**, ver §3.2 |
| `email` | string | sí | formato email válido. Se almacena en minúsculas |
| `telefono` | string | sí | no vacío. Sin formato impuesto |
| `ciudad` | string | sí | no vacío |
| `nivelEducativo` | string | sí | uno de los valores de §3.3 |
| `area` | string | sí | uno de los valores de §3.3. Un solo valor, no lista |
| `aceptaTratamientoDatos` | string | sí | **exactamente `"true"`**. Cualquier otro valor → 400 |
| `tituloProfesional` | string | no | texto libre, sin longitud máxima |
| `anosExperiencia` | string numérico | no | entero entre **0 y 60** |
| `linkedinUrl` | string | no | URL válida (incluye el esquema: `https://...`) |
| `presentacion` | string | no | máximo **1000** caracteres |

En `multipart/form-data` todo viaja como texto: envía `anosExperiencia` como `"5"` y
`aceptaTratamientoDatos` como la cadena `"true"` (el backend hace la conversión).
Un checkbox desmarcado debe enviarse como `"false"` o no enviarse — ambos producen 400,
que es lo correcto: sin consentimiento no hay postulación.

MIME types aceptados para `curriculo`:

- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

En el `<input type="file">` usa
`accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"`
y valida el tamaño en el cliente antes de enviar, para no gastar el rate limit en un rechazo.

### 3.2 Comportamiento: es un *upsert* por `numeroDocumento`

El número de documento identifica a la persona:

- **No existe** → se crea la postulación → **`201`**
- **Ya existe** → se actualizan sus datos personales, se reemplaza el CV, se agrega el área
  al historial y el `estado` vuelve a `nuevo` → **`200`**

Los campos opcionales que **no** envíes en una re-postulación **conservan su valor anterior**
(no se borran). El área enviada se **acumula** en `areasInteres`, no reemplaza a la anterior.

### 3.3 Valores de los enums

```js
// nivelEducativo
['bachiller', 'tecnico', 'tecnologo', 'profesional', 'posgrado']

// area
['trabajo-social', 'ingenieria-forestal', 'ingenieria-agronomica',
 'biologia', 'contaduria', 'administracion', 'otro']

// estado (no se envía en este endpoint; ver §6)
['nuevo', 'revisado', 'descartado']
```

Son los identificadores técnicos: para la UI, mapea cada uno a su etiqueta legible
("Trabajo social", "Ingeniería forestal", …).

### 3.4 Respuestas

```jsonc
// 201 Created (postulación nueva) | 200 OK (postulante ya existente, datos actualizados)
{ "ok": true, "msg": "Postulación recibida" }
```

**Este endpoint nunca devuelve los datos del postulante, ni siquiera el `_id`.** Es
deliberado: al ser público y anónimo, devolver el registro permitiría que cualquiera
consultara los datos personales de otra persona escribiendo su número de documento. El
frontend solo debe mostrar un mensaje de éxito; si necesitas un resumen de lo enviado,
constrúyelo con los valores que ya tienes en el formulario.

| Código | Cuerpo | Cuándo |
|---|---|---|
| `201` | `{ ok:true, msg }` | postulación nueva |
| `200` | `{ ok:true, msg }` | el documento ya existía y se actualizó |
| `400` | `{ ok:false, errors:{...} }` | algún campo no pasó la validación |
| `400` | `{ ok:false, msg:"No se subio ningun archivo (curriculum)" }` | falta `curriculo` |
| `400` | `{ ok:false, msg:"Solo se permite un archivo de curriculo" }` | se enviaron varios |
| `400` | `{ ok:false, msg:"El curriculo debe ser un archivo PDF o Word (.docx)" }` | MIME no permitido |
| `413` | `{ ok:false, msg:"El curriculo no puede pesar mas de 5MB" }` | archivo demasiado grande |
| `429` | `{ ok:false, msg:"Demasiadas postulaciones enviadas..." }` | más de 5 en 15 min |
| `502` | `{ ok:false, msg:"No se pudo subir el archivo. Intenta de nuevo mas tarde." }` | falló Cloudinary |

### 3.5 Ejemplo

```js
async function enviarPostulacion(valores, archivoCV) {
  const fd = new FormData();
  fd.append('nombreCompleto', valores.nombreCompleto);
  fd.append('numeroDocumento', valores.numeroDocumento);
  fd.append('email', valores.email);
  fd.append('telefono', valores.telefono);
  fd.append('ciudad', valores.ciudad);
  fd.append('nivelEducativo', valores.nivelEducativo);   // enum
  fd.append('area', valores.area);                       // enum
  fd.append('aceptaTratamientoDatos', valores.acepta ? 'true' : 'false');

  // Opcionales: omitirlos si están vacíos, no enviar cadenas vacías
  if (valores.tituloProfesional) fd.append('tituloProfesional', valores.tituloProfesional);
  if (valores.anosExperiencia !== '') fd.append('anosExperiencia', String(valores.anosExperiencia));
  if (valores.linkedinUrl) fd.append('linkedinUrl', valores.linkedinUrl);
  if (valores.presentacion) fd.append('presentacion', valores.presentacion);

  fd.append('curriculo', archivoCV);

  const res = await fetch('/api/talento', { method: 'POST', body: fd }); // sin Content-Type
  const data = await res.json();

  if (!res.ok) {
    // data.errors -> errores por campo | data.msg -> error general
    throw { errores: data.errors ?? null, mensaje: mensajeDeError(data) };
  }
  return data; // { ok: true, msg: 'Postulación recibida' }
}
```

---

## 4. `GET /api/talento` — Listar postulaciones (admin)

Bandeja del panel administrativo. Requiere `x-token` de administrador.

**Query params (todos opcionales):**

| Param | Por defecto | Regla |
|---|---|---|
| `page` | `1` | mínimo 1; valores menores o inválidos se corrigen a 1 |
| `limit` | `10` | **máximo 50**; valores mayores se recortan a 50 |
| `estado` | — | uno de `nuevo` \| `revisado` \| `descartado`. Otro valor → `400` |

Orden fijo: **`createdAt` descendente** (la más reciente primero).

```jsonc
// 200
{
  "ok": true,
  "postulaciones": [ /* array de objetos Talento, ver §7 */ ],
  "paginacion": {
    "total": 42,          // total que coincide con el filtro aplicado, NO el total global
    "pagina": 1,
    "limite": 10,
    "totalPaginas": 5
  }
}
```

`paginacion.total` y `totalPaginas` respetan el filtro `?estado=`, así que el paginador se
puede construir directamente con esos valores sin recalcular nada.

Ejemplos: `GET /api/talento?estado=nuevo&page=1&limit=20` (bandeja de pendientes),
`GET /api/talento?page=2` (todas, segunda página).

---

## 5. `GET /api/talento/:id` — Ver una postulación (admin)

`:id` debe ser un ObjectId de Mongo válido (24 caracteres hexadecimales).

```jsonc
// 200
{ "ok": true, "talento": { /* objeto Talento, ver §7 */ } }
```

| Código | Cuerpo |
|---|---|
| `400` | `{ ok:false, errors:{ id:{ msg:"El id no es válido" } } }` |
| `404` | `{ ok:false, msg:"Postulación no encontrada" }` |

---

## 6. `PATCH /api/talento/:id/estado` — Cambiar el estado (admin)

Seguimiento del equipo sobre cada postulación: `nuevo` (sin revisar) → `revisado`
(evaluada, sigue en consideración) o `descartado` (no aplica).

```
PATCH /api/talento/507f1f77bcf86cd799439011/estado
x-token: <jwt de admin>
Content-Type: application/json

{ "estado": "revisado" }
```

```jsonc
// 200 — devuelve el documento completo ya actualizado
{ "ok": true, "talento": { /* objeto Talento con el nuevo estado */ } }
```

| Código | Cuerpo | Cuándo |
|---|---|---|
| `400` | `{ ok:false, errors:{...} }` | id no es ObjectId, o `estado` fuera del enum |
| `404` | `{ ok:false, msg:"Postulación no encontrada" }` | no existe ese id |

Solo modifica el campo `estado`; el resto del documento queda intacto. Como la respuesta trae
el objeto completo, puedes reemplazar la fila en la tabla con lo que devuelve, en vez de
recargar el listado.

---

## 7. Objeto `Talento`

```jsonc
{
  "_id": "507f1f77bcf86cd799439011",
  "nombreCompleto": "Ana Pérez",
  "numeroDocumento": "1234567890",
  "email": "ana@mail.com",              // siempre en minúsculas
  "telefono": "3001234567",
  "ciudad": "Bogotá",
  "nivelEducativo": "profesional",      // enum §3.3
  "tituloProfesional": "Bióloga",       // OPCIONAL: la clave puede no existir
  "anosExperiencia": 5,                 // OPCIONAL, number (no string)
  "linkedinUrl": "https://linkedin.com/in/ana",  // OPCIONAL
  "presentacion": "Texto libre...",     // OPCIONAL
  "aceptaTratamientoDatos": true,       // boolean
  "nombreArchivoCV": "8f14e45f-....pdf", // nombre interno en Cloudinary
  "urlCV": "https://res.cloudinary.com/<cloud>/raw/upload/curriculos/8f14e45f-....pdf",
  "estado": "nuevo",                    // "nuevo" | "revisado" | "descartado"
  "areasInteres": [                     // historial, ver nota
    { "area": "biologia", "fecha": "2026-09-07T10:00:00.000Z", "_id": "..." },
    { "area": "otro",     "fecha": "2026-10-01T08:30:00.000Z", "_id": "..." }
  ],
  "createdAt": "2026-09-07T10:00:00.000Z",
  "updatedAt": "2026-10-01T08:30:00.000Z"
}
```

**Los campos marcados OPCIONAL pueden no venir en el JSON** (no llegan como `null`: la clave
simplemente no existe). Usa acceso seguro y muestra un placeholder.

**`areasInteres` es un historial acumulativo, no un valor único.** Cada postulación agrega
una entrada con su fecha, incluso si es la misma área de antes. El área vigente es la
**última** del arreglo: `talento.areasInteres.at(-1).area`. La cantidad de entradas indica
cuántas veces se ha postulado la persona — un dato útil para mostrar en la tabla.

**`urlCV` es un enlace público y directo:** ábrelo en una pestaña nueva
(`<a href={urlCV} target="_blank" rel="noopener">`). No necesita el token y no pasa por el
backend. Como contrapartida, cualquiera con el enlace puede descargar el CV, así que no lo
publiques fuera del panel.

Fechas: ISO 8601 UTC. Formatéalas en el cliente.

---

## 8. Notas de diseño para el frontend

1. **No existe endpoint para eliminar postulaciones.** Para retirar una de la bandeja se usa
   `estado: "descartado"`.
2. **Re-postularse reinicia el estado a `nuevo`.** Alguien que fue descartado y vuelve a
   aplicar reaparece como pendiente. Es intencional: postulación nueva, revisión nueva.
   Conviene que la ficha muestre la longitud de `areasInteres` para que el revisor note que
   ya la había visto.
3. **Tras el `POST` no tienes `_id`**, así que no puedes navegar a la ficha recién creada
   desde el formulario público. Muestra solo la confirmación.
4. **No hay endpoint de búsqueda por nombre o documento.** El listado filtra únicamente por
   `estado`. Si el panel necesita buscador, hay que agregarlo en el backend.
5. **Un `401` en cualquier endpoint administrativo significa sesión vencida** (el token dura
   12 h): limpia el token guardado y redirige al login.
6. **Distinguir 401 de 403:** el primero es "no estás autenticado"; el segundo, "estás
   autenticado pero no eres administrador". No los trates igual.

---

## 9. Resumen de códigos por endpoint

| Endpoint | Auth | Éxito | Errores posibles |
|---|---|---|---|
| `POST /api/talento` | pública | `201` / `200` | `400`, `413`, `429`, `502`, `500` |
| `GET /api/talento` | admin | `200` | `400`, `401`, `403`, `500` |
| `GET /api/talento/:id` | admin | `200` | `400`, `401`, `403`, `404`, `500` |
| `PATCH /api/talento/:id/estado` | admin | `200` | `400`, `401`, `403`, `404`, `500` |

`500 { ok:false, msg:"Error interno del servidor" }` es posible en cualquiera; muestra un
mensaje genérico y permite reintentar.
