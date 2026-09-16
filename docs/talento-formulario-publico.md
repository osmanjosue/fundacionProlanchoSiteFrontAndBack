# Guía de implementación — Formulario público de talento

> **Documento histórico (2026-08-19), desactualizado.** Refleja el plan con el que se construyó el
> formulario público, no el estado actual del código. Diferencias conocidas: la página quedó en
> `/trabaja-con-nosotros` y no en `/talento`; después se añadieron el enlace de revisión por correo
> (magic link) y el cambio de estado; y la decisión de "sin panel de administración" quedó sin efecto.
> Para el estado actual, ver `talento-directorio.md` y `talento-api.md`.

> Documento de arquitectura y paso a paso. **No contiene código**: describe qué archivo crear, qué responsabilidad tiene cada uno, qué recibe y qué devuelve, en qué orden hacerlo y qué verificar antes de avanzar. El código lo escribes tú.
>
> Es autocontenido: se puede leer sin tener el repositorio delante.

---

## 0. Qué se va a construir

Una página pública `/talento` donde una persona interesada en trabajar en la fundación llena un formulario, adjunta su hoja de vida en PDF y la envía. La postulación se guarda en MongoDB, el PDF se almacena en Cloudinary, y salen dos correos: uno de aviso a la fundación y otro de acuse de recibo al postulante.

**Decisiones ya tomadas** (para no volver a discutirlas a mitad de camino):

| Decisión | Elección | Motivo |
|---|---|---|
| Alcance de los datos | Datos personales + CV adjunto | Es el estándar de una postulación |
| LinkedIn | Campo de texto con la URL del perfil | El OAuth público de LinkedIn solo devuelve nombre, email y foto; la experiencia laboral exige el programa de partners con aprobación manual. Mucho trabajo para autocompletar tres campos |
| Persistencia | Backend propio + MongoDB | Deja historial consultable |
| Archivo CV | Cloudinary | Ya está integrado en el proyecto y sobrevive a redespliegues (el disco local no) |
| Correos | Aviso interno + acuse al postulante | |
| Panel de administración | **No por ahora** | Se dejan endpoints protegidos de lectura para poder consultar los datos mientras tanto |
| Ubicación | Página propia con ruta, no sección de la home | |

---

## 1. Punto de partida real del proyecto

Antes de empezar, ten claro con qué cuentas. Esto se verificó sobre el código actual:

**Estructura general.** Son dos proyectos hermanos dentro de la misma carpeta:
- `fundacionProlanchoFrontend` — Angular 20, TypeScript, componentes standalone, PrimeNG + Bootstrap 5, SweetAlert2 para diálogos. Todos los textos de la interfaz están en español.
- `FundacionProlanchoBackend` — Node.js con Express 4 en CommonJS (JavaScript, no TypeScript), Mongoose sobre MongoDB. **No hay capa de servicios, ni DTOs, ni repositorios, ni migraciones, ni tests.** El patrón es directo: `ruta → middlewares → controlador → modelo`.

**Lo que ya existe y vas a reutilizar:**
- Un formulario de contacto en la home que es el mejor molde para el nuevo formulario de Angular.
- Un helper de envío de correo con nodemailer.
- Una integración de Cloudinary funcionando (hoy solo para imágenes de artículos).
- Un sistema de límite de peticiones centralizado y una lista blanca de orígenes permitidos.
- Un manejador global de errores y dos funciones para responder de forma uniforme.
- **Un middleware de subida de currículos que ya está escrito pero nadie usa** — es código muerto que dejaron preparado. Lo vas a rescatar.

**Lo que NO existe** (por si alguna nota vieja dice lo contrario):
- No hay ninguna sección "trabaja con nosotros" en la página de inicio. Las secciones de la home son: inicio, noticias, nosotros y contacto.
- Lo único que existe es un enlace **deshabilitado** en el pie de página con el texto "Trabaja con nosotros", sin ruta ni destino. Ese enlace es el que vas a activar al final.

---

## 2. Cómo fluye una postulación (visión de conjunto)

Lee este flujo entero antes de escribir la primera línea. Todo lo demás son detalles de este esquema.

```
Navegador (Angular)
   │  El usuario llena el formulario y elige un PDF
   │  Se arma un paquete multipart/form-data (campos de texto + archivo)
   ▼
POST /api/talento          ← endpoint PÚBLICO
   │
   ├─ 1. Límite de peticiones      ¿este visitante ya envió demasiadas? → 429
   ├─ 2. Verificación de origen    ¿la petición viene de un dominio permitido? → 403
   ├─ 3. Lectura del archivo       extrae el PDF del paquete y lo deja disponible
   ├─ 4. Validación del archivo    ¿existe? ¿es PDF? ¿pesa menos de 5 MB? → 400
   ├─ 5. Validación de los campos  ¿nombre, email, teléfono, autorización? → 400
   ▼
Controlador
   ├─ a. Sube el PDF a Cloudinary  → obtiene un nombre único y una URL pública
   ├─ b. Guarda el documento en MongoDB con esa URL
   ├─ c. Dispara los dos correos   (sin bloquear la respuesta)
   └─ d. Responde 201 con la postulación creada
   ▼
Navegador
   └─ Muestra un diálogo de éxito y limpia el formulario
```

**Regla de oro del paso (c):** el correo se envía *después* de guardar y su fallo **no debe** tumbar la petición. Si el servidor de correo está caído, la postulación ya quedó en la base de datos y el usuario ve éxito. Perder una hoja de vida porque falló un SMTP es el peor resultado posible.

---

## 3. Contrato de la API

Defínelo antes de programar: es lo que backend y frontend tienen que respetar por igual.

### `POST /api/talento` — crear postulación (público)

**Formato del cuerpo:** `multipart/form-data` (obligatorio, porque lleva un archivo). Ojo: en este formato **todos los campos de texto llegan como cadenas**, incluidos los números y los booleanos. El "true" del checkbox llega como el texto `"true"`, no como un booleano. Hay que normalizarlo en el controlador.

**Campos:**

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `nombreCompleto` | texto | Sí | mínimo 3 caracteres |
| `numeroDocumento` | texto | Sí | como texto, no número: puede llevar ceros a la izquierda |
| `email` | texto | Sí | formato de correo válido |
| `telefono` | texto | Sí | |
| `ciudad` | texto | Sí | |
| `nivelEducativo` | texto | Sí | valor de una lista cerrada (bachiller, técnico, tecnólogo, profesional, posgrado) |
| `tituloProfesional` | texto | No | |
| `areaInteres` | texto | Sí | valor de una lista cerrada, definida con la fundación |
| `anosExperiencia` | número | No | llega como texto, convertir |
| `linkedinUrl` | texto | No | si viene, debe parecer una URL de perfil de LinkedIn |
| `presentacion` | texto | No | texto libre, limitar a ~1000 caracteres |
| `aceptaTratamientoDatos` | booleano | Sí | debe ser verdadero; llega como texto |
| `curriculo` | archivo | Sí | PDF, máximo 5 MB. **El nombre del campo tiene que ser exactamente `curriculo`** porque así lo espera el middleware que ya existe |

**Respuestas:**
- `201` — éxito. Devuelve `ok: true` y la postulación creada.
- `400` — validación fallida (campo faltante o inválido, archivo ausente, tipo o tamaño incorrecto).
- `403` — origen no permitido.
- `429` — demasiadas peticiones.
- `500` — error inesperado (lo captura el manejador global).

### `GET /api/talento` — listar postulaciones (protegido)

Requiere token de sesión. Acepta paginación por parámetros de consulta (`from` y `limit`), igual que ya se hace con los artículos. Devuelve la lista y el total.

### `GET /api/talento/:id` — ver una postulación (protegido)

Requiere token. Devuelve el documento completo, con la URL del CV.

> Estos dos GET no tienen interfaz todavía. Existen para que los datos sean consultables desde una herramienta como Postman mientras no construyas el panel de administración. Son unas pocas líneas y evitan que la información quede enterrada.

### Forma de las respuestas

El backend ya tiene dos funciones auxiliares que producen un formato uniforme:
- Éxito: un objeto con `ok: true` más el contenido.
- Error: un objeto con `ok: false` y un `msg`.

Úsalas siempre. No inventes formatos nuevos: el frontend ya lee `err.error.msg` en otros puntos y conviene mantenerlo.

Hay una inconsistencia heredada que debes conocer: el validador basado en librería devuelve los errores en una propiedad `errors` (un objeto con un error por campo), mientras que los validadores escritos a mano devuelven `field` y `msg`. Elige uno de los dos estilos para este módulo y sé coherente. **Recomendación: usa el validador por librería** (el mismo de artículos y proyectos), que es el patrón mayoritario.

---

## 4. PARTE A — Backend

Cinco fases. Al final de cada una hay un punto de verificación: no avances sin pasarlo.

### Fase A1 — El modelo de datos

**Archivo nuevo:** un modelo de Mongoose para la colección de talento, junto a los otros modelos existentes.

**Responsabilidad:** definir la forma del documento que se guardará.

**Qué debe contener:**
- Todos los campos del contrato de arriba, con sus tipos y sus marcas de obligatoriedad.
- Dos campos que **no vienen del formulario** sino que los llena el servidor: el nombre único del archivo del CV y la URL pública devuelta por Cloudinary.
- Un campo de estado con valores restringidos (nuevo / revisado / descartado) y valor por defecto "nuevo". Aunque hoy no haya panel, tenerlo desde el principio evita una migración de datos incómoda después.
- Marcas automáticas de fecha de creación y actualización. Mongoose lo hace con una opción del esquema; uno de los modelos existentes ya la usa, cópiala de ahí.
- Un ajuste a la serialización para que no salga el campo interno de versión de Mongo en las respuestas. Todos los modelos del proyecto lo hacen igual; replica ese detalle.

**Detalle importante:** el número de documento y el teléfono van como **texto**, no como número. Un número descarta ceros iniciales y puede desbordar en documentos largos.

> ✅ **Verificación A1:** ninguna todavía; se comprueba al final de A4.

---

### Fase A2 — Poder subir PDFs a Cloudinary

Este es el punto donde más gente se atasca, así que va aparte.

**El problema:** la función de subida a Cloudinary que ya existe en el proyecto tiene las opciones de subida escritas fijas dentro (una carpeta concreta, y sin especificar el tipo de recurso). Cloudinary trata por defecto lo que recibe como **imagen**. Un PDF subido como imagen o falla, o queda guardado de una forma en la que la URL no sirve para descargarlo. Cloudinary necesita saber explícitamente que es un recurso "en bruto" (raw), no una imagen.

**Trabajo 1 — Modificar la función de Cloudinary existente.** Añádele un parámetro adicional y opcional donde el llamador pueda pasar opciones extra, que se fusionen con las que ya tiene por defecto. Debe ser retrocompatible: si nadie pasa ese parámetro, se comporta exactamente igual que hoy. Así el código de imágenes de artículos sigue funcionando sin tocarlo.

**Trabajo 2 — Crear un ayudante de subida de currículos.** Ya existe un ayudante análogo para imágenes; úsalo como plantilla, pero con dos diferencias clave:

1. El ayudante de imágenes está **acoplado**: recibe un artículo y le empuja el nombre del archivo dentro. El tuyo no debe tocar ninguna base de datos: solo sube el archivo y **devuelve** el nombre generado y la URL. Que sea el controlador quien decida qué hacer con esos dos datos. Un ayudante que no conoce el modelo se puede reutilizar.
2. El ayudante de imágenes deduce la extensión del tipo del archivo. El tuyo solo acepta PDF, así que la comprobación es directa y la extensión es siempre la misma.

Al subir, pasa como opciones extra: una carpeta propia para currículos (no los mezcles con las imágenes del sitio) y el tipo de recurso "raw".

**Nombre del archivo:** genera un identificador único, igual que se hace con las imágenes. **Nunca uses el nombre original que envió el usuario.** Dos personas llamadas igual sobrescribirían su CV, y un nombre de archivo controlado por el usuario es un vector de ataque clásico.

**Qué guardar en la base de datos:** guarda **la URL completa** que devuelve Cloudinary, no solo el nombre. Para las imágenes el proyecto guarda solo el nombre y reconstruye la ruta, pero con recursos "raw" la ruta se forma distinto y reconstruirla a mano es una fuente de errores. Guarda también el nombre por separado, porque lo necesitarás si algún día hay que borrar el archivo.

> ✅ **Verificación A2:** escribe un script suelto y temporal que lea un PDF del disco, lo suba con tu nuevo ayudante e imprima la URL. Pega esa URL en el navegador: **te tiene que descargar o mostrar el PDF**. Si da error o descarga algo corrupto, el tipo de recurso no se aplicó. Resuélvelo aquí; depurarlo más adelante mezclado con validaciones y correos es mucho peor. Borra el script cuando funcione.

---

### Fase A3 — Validaciones y protección del endpoint

Este endpoint es **público**: cualquiera en internet puede llamarlo y encima acepta archivos. Es la superficie más expuesta que vas a añadir al proyecto. Va por capas, y **el orden importa**.

**Capa 1 — Límite de peticiones.** El proyecto centraliza los límites en un archivo de configuración. Añade una entrada para talento; algo como 5 envíos cada 15 minutos por IP es razonable (una persona real no se postula seis veces en un cuarto de hora). No pongas el número suelto en la ruta: respeta el patrón centralizado.

**Capa 2 — Verificación de origen.** Ya existe un middleware que comprueba que la petición venga de un dominio de la lista blanca. Reutilízalo. La lista ya incluye el dominio de la fundación y el localhost de desarrollo de Angular, así que no hay que tocarla.

**Capa 3 — Lectura del archivo.** La librería que extrae archivos del paquete multipart **no está activada globalmente** en este proyecto; se activa por router. Actívala en el router de talento y ponle un límite de tamaño ahí mismo, con la opción que corta la petición al superarlo. Esto es defensa en profundidad: sin un límite, la librería carga el archivo entero en memoria y alguien puede tumbarte el servidor mandando un archivo de 2 GB.

**Capa 4 — Validación del archivo.** Aquí rescatas el middleware que ya está escrito y nadie usa. Hoy solo comprueba que llegó algún archivo y lo deja disponible para el siguiente paso. Amplíalo para que también verifique que el tipo es PDF y que el tamaño está dentro del límite, devolviendo el mismo formato de error que el resto del proyecto.

**Capa 5 — Validación de los campos de texto.** Usa el validador por librería, igual que en artículos y proyectos: una lista de comprobaciones por campo y, detrás, el middleware que recoge los errores y responde. Comprueba obligatorios, formato de correo, que la autorización de datos venga marcada, que los valores de las listas cerradas estén dentro de lo permitido y que los textos libres no excedan su longitud.

> ⚠️ **La trampa de orden más importante de toda la guía.** En una petición `multipart/form-data`, los campos de texto **no existen en el cuerpo de la petición** hasta que la librería de archivos ha procesado el paquete. Si pones las validaciones de campos antes de esa librería, verás el cuerpo vacío y tu endpoint rechazará peticiones perfectamente válidas — y el mensaje de error no te dará ninguna pista de por qué. El orden correcto es siempre: **archivos primero, validación de campos después.**

> 💡 Existe además un middleware de verificación de captcha (Cloudflare Turnstile) usado en otro formulario del proyecto. Está diseñado para quedarse inerte si no hay clave configurada. Si más adelante llega spam, este es el sitio donde enchufarlo, sin tocar nada más.

> ✅ **Verificación A3:** con la ruta montada pero el controlador respondiendo cualquier cosa provisional, prueba desde Postman o curl: sin archivo → 400; con un `.docx` → 400; sin correo → 400; repitiendo seis veces → 429. Confirma que los campos de texto **llegan** al validador (imprímelos si hace falta).

---

### Fase A4 — La ruta y el controlador

**Archivo nuevo 1 — el router de talento.** Declara los tres endpoints del contrato con sus cadenas de middlewares. Los dos GET van protegidos por el middleware de autenticación que ya existe.

> Nota sobre la autenticación de este proyecto: el token **no viaja en la cabecera `Authorization` con el prefijo Bearer**, como es habitual, sino en una cabecera propia llamada `x-token`. Si pruebas los GET con Postman y siempre te da 401, es casi seguro esto.

Envuelve todos los controladores con el ayudante que captura errores asíncronos. En este proyecto **ningún controlador tiene bloques try/catch**: los errores se propagan solos al manejador global. Respétalo; meter try/catch aquí desentonaría.

**Archivo nuevo 2 — el controlador.** Tres funciones:

*Crear postulación:*
1. Normaliza los datos que llegaron como texto: convierte a booleano la autorización y a número los años de experiencia.
2. Sube el CV con el ayudante de la fase A2 y quédate con el nombre y la URL.
3. Construye y guarda el documento. **Nunca hagas propagación directa de todo el cuerpo de la petición al modelo.** Toma campo por campo, o al menos extrae y descarta explícitamente lo que no debe entrar. Si copias el cuerpo entero, un atacante puede mandar un campo de estado o cualquier otro que no le corresponde. Uno de los controladores existentes ya usa la técnica de descartar campos protegidos; mírala.
4. Dispara los correos. Que un fallo aquí no impida responder con éxito.
5. Responde 201 con la postulación.

*Listar:* lee los parámetros de paginación, cuenta el total y devuelve la página ordenada por fecha de creación descendente (lo más reciente primero). Hay un controlador de artículos que hace exactamente esto; cópiale la estructura.

*Ver una:* busca por identificador; si no existe, responde 404 con el formato de error estándar.

**Archivo a modificar — el arranque del servidor.** Registra el nuevo router bajo su ruta base, junto a los demás.

> ⚠️ Hay una sutileza en cómo están montadas las rutas en el arranque: unas pocas se registran **antes** del analizador global de JSON, a propósito, para poder imponer su propio límite de tamaño de cuerpo. Tu ruta de talento **no** usa JSON (usa multipart), así que da igual dónde la pongas, pero ponla junto al grupo normal para no romper ese orden deliberado.

> ✅ **Verificación A4:** envía una postulación completa con PDF desde Postman. Debes recibir 201. Comprueba tres cosas: el documento aparece en la colección de MongoDB, la URL del CV guardada abre el PDF en el navegador, y el estado quedó en "nuevo". **Con esto el backend ya cumple el requisito principal: no se pierde ninguna hoja de vida.** Los correos son un extra.

---

### Fase A5 — Los correos

**Archivo nuevo:** un ayudante de correo específico de talento. El proyecto tiene dos ayudantes de correo; toma como referencia **el segundo** (el usado en el formulario de contacto del otro sitio), porque es el que está bien hecho.

Dos reglas que debes copiar de él:

1. **El destinatario del aviso interno se fija en el servidor**, desde una variable de entorno. Jamás desde el cliente. El endpoint de correo antiguo del proyecto deja que el cliente indique el destinatario, lo que en la práctica es un relé de correo abierto: alguien puede usar tu servidor para enviar spam desde tu dominio. No repitas ese error.
2. **Escapa el HTML de todo dato que venga del usuario** antes de meterlo en el cuerpo del correo. Si alguien pone etiquetas HTML en su presentación, no deben interpretarse en la bandeja de quien lo lea. Ese ayudante ya tiene una función de escapado; reutilízala.

**Correo 1 — aviso interno.** Al buzón de la fundación. Contiene una tabla con los datos y el enlace al CV. Ajusta el campo de "responder a" con el correo del postulante: así responder desde el gestor de correo escribe directamente al candidato.

**Correo 2 — acuse de recibo.** Al postulante. Breve: se recibió tu postulación, se revisará, no respondas a este mensaje. No prometas plazos que la fundación no vaya a cumplir.

**Variables de entorno.** Añade una nueva para el buzón de la fundación y documéntala en el archivo de ejemplo de variables, que en este proyecto está bien mantenido. Las credenciales del servidor de correo ya existen y se reutilizan.

> ✅ **Verificación A5:** envía una postulación y confirma que llegan los dos correos, que el enlace al CV funciona desde el correo y que al responder el aviso interno el destinatario es el postulante. **Luego rompe a propósito la contraseña del correo en las variables de entorno y vuelve a enviar: la respuesta debe seguir siendo 201 y la postulación debe seguir guardándose.** Esa es la prueba que valida la regla de oro del punto 2.

---

## 5. PARTE B — Frontend

### Fase B1 — La interfaz de datos

**Archivo nuevo:** una interfaz de TypeScript que describa la postulación, en la carpeta de interfaces junto a las existentes. Es el reflejo del modelo del backend y evita errores de tipeo en los nombres de los campos.

---

### Fase B2 — El servicio

**Archivo nuevo:** un servicio de Angular en la carpeta de servicios. Toma como molde el servicio del formulario de contacto: inyecta el cliente HTTP, arma la URL a partir de la variable de entorno con la URL base de la API (ya configurada para desarrollo y producción) y expone un método que envía la postulación.

**Diferencia crítica con el servicio de contacto:** aquí no envías un objeto JSON, envías un paquete de formulario con el archivo dentro. Y hay una regla contraintuitiva: **no fijes manualmente la cabecera de tipo de contenido.** El instinto es ponerla, pero ese tipo de contenido necesita un delimitador único que el navegador genera solo. Si la escribes a mano, el delimitador falta y el servidor no puede separar los campos: verás errores de "no se subió ningún archivo" aunque lo estés mandando. Déjala en blanco y el navegador la completa correctamente.

Añade además métodos para los dos GET protegidos, aunque no tengan pantalla todavía — así el día que hagas el panel el servicio ya está listo.

---

### Fase B3 — El componente del formulario

**Archivos nuevos:** una carpeta propia dentro de las páginas, con el componente, su plantilla y sus estilos. Componente standalone, como el resto del proyecto.

**Molde a seguir:** el componente del formulario de contacto. Cópiale la estructura completa:
- Formularios reactivos construidos con el constructor de formularios y los validadores de Angular.
- Tres métodos auxiliares para la interfaz: uno que dice si un campo es inválido y ya fue tocado, otro que traduce el error a un mensaje en español, y otro que marca un campo como tocado.
- Mensajes de error mostrados debajo de cada campo con los bloques de control de flujo modernos de Angular (los que empiezan por arroba), que es lo que usa el proyecto.
- Diálogos de éxito y error con la librería de alertas que ya se usa en todo el sitio.
- Al terminar con éxito, limpiar el formulario.

**Lo que tendrás que añadir respecto al molde:** el traductor de errores del formulario de contacto solo cubre "campo requerido" y "correo inválido". Necesitas ampliarlo con los casos de longitud mínima, longitud máxima, patrón no coincidente (para LinkedIn) y checkbox obligatorio sin marcar, que tiene un validador propio en Angular distinto del de "requerido".

**El campo de archivo.** Es la única parte que no puedes copiar de ningún sitio del proyecto:
- Un campo de archivo nativo que solo ofrezca PDF en el diálogo del sistema. Ten presente que ese filtro es solo comodidad visual: **no es una validación**, se salta trivialmente. Por eso el backend valida también.
- El archivo seleccionado se guarda en una propiedad del componente, no dentro del formulario reactivo (los campos de archivo no se enlazan bien con formularios reactivos).
- Valida en el cliente el tipo y el tamaño en cuanto se selecciona, y muestra el error de inmediato. No para confiar en ello, sino por cortesía: es cruel dejar que alguien llene doce campos y descubra al enviar que su archivo pesa demasiado.
- Muestra el nombre del archivo elegido y ofrece quitarlo.

**La autorización de tratamiento de datos.** Un checkbox obligatorio con un texto claro sobre qué se hace con los datos y por cuánto tiempo se conservan. No es adorno: es una hoja de vida, con documento de identidad y datos de contacto, tratada por una fundación colombiana. Redacta ese texto con alguien de la fundación, no lo inventes tú.

**Estado de envío.** Deshabilita el botón e indica visualmente que está en curso mientras se envía. Subir un PDF de varios megabytes tarda; sin indicador el usuario pulsa tres veces y te llegan tres postulaciones idénticas.

**Estilos.** Bootstrap 5 con componentes de PrimeNG para los campos, como en el resto del sitio. Textos en español, en el tono del resto de la web.

---

### Fase B4 — Ruta y navegación

Dos archivos a modificar:

1. **El archivo de rutas de las páginas públicas.** Añade la ruta `/talento` apuntando a tu componente, junto a la ruta de colaboradores que ya existe y es exactamente el mismo caso (página pública con ruta propia). Ojo: hay dos archivos de rutas en el proyecto; el de la raíz gestiona el login y el área de administración con carga diferida. El tuyo es el de páginas.
2. **La plantilla del pie de página.** Ahí está el enlace deshabilitado de "Trabaja con nosotros". Cámbialo por un enlace de navegación real hacia tu ruta y quítale la clase que lo pinta como inactivo. Necesitarás importar la directiva de enlaces del router en ese componente si aún no la tiene.

> Opcionalmente puedes añadir también una llamada a la acción en la home. La barra de navegación superior de este sitio **no usa rutas, usa desplazamiento a secciones de la misma página**, así que meter ahí un enlace a otra página requiere tocar esa lógica. Déjalo para después si lo quieres.

---

## 6. Orden de trabajo recomendado

Cada bloque termina en algo comprobable. Si tienes que parar, para al final de un bloque.

1. **A2 primero, aunque no sea la primera fase.** Resuelve la subida del PDF a Cloudinary de forma aislada. Es el riesgo técnico más alto y el único que puede obligarte a cambiar de enfoque (por ejemplo, caer a disco local). Descúbrelo el primer día, no el cuarto.
2. **A1 + A4 sin correos ni validaciones finas.** Modelo, ruta y controlador con lo mínimo. Objetivo: que una postulación entre por Postman y quede en la base de datos.
3. **A3.** Endurece: validaciones, límites, orígenes. Ahora que el camino feliz funciona, rompe el endpoint a propósito y comprueba cada error.
4. **A5.** Los correos. Backend terminado.
5. **B1 + B2.** Interfaz y servicio. Puedes probar el servicio antes de tener el formulario bonito.
6. **B3.** El formulario completo. Es la fase más larga en tiempo pero la de menor riesgo.
7. **B4.** Ruta y enlace del pie. En este punto la funcionalidad está viva para los usuarios: no actives el enlace del pie hasta que todo lo demás funcione, porque es lo que la hace pública.

---

## 7. Lista de trampas conocidas

Todas verificadas contra este proyecto en concreto. Vale la pena releerla cuando algo no funcione.

1. **Orden de middlewares en multipart.** La lectura de archivos va antes que la validación de campos, siempre. Si no, el cuerpo llega vacío. *(Fase A3)*
2. **Cloudinary y los PDFs.** Sin declarar el tipo de recurso como "raw", el archivo se trata como imagen y la URL no sirve. *(Fase A2)*
3. **La cabecera de tipo de contenido en Angular.** No la pongas a mano al enviar el paquete de formulario. *(Fase B2)*
4. **El token va en una cabecera propia**, no en la de autorización estándar. Afecta solo a los GET protegidos. *(Fase A4)*
5. **Todo llega como texto en multipart.** El booleano de la autorización y los años de experiencia hay que convertirlos. *(Fase A4)*
6. **El nombre del campo del archivo debe ser exactamente `curriculo`**, porque es lo que espera el middleware que estás rescatando. Si en el frontend lo llamas distinto, el backend dirá que no llegó ningún archivo aunque lo veas salir en la pestaña de red del navegador. *(Fases A3 y B2)*
7. **No propagues el cuerpo entero al modelo.** Campo por campo, o descarta explícitamente los protegidos. *(Fase A4)*
8. **El destinatario del correo interno se fija en el servidor.** Nunca desde el cliente. *(Fase A5)*
9. **Sin límite de tamaño, el archivo se carga entero en memoria.** La librería de subida está configurada hoy sin límites ni archivos temporales. *(Fase A3)*
10. **El fallo del correo no puede tumbar la petición.** *(Fase A4/A5)*

---

## 8. Plan de pruebas final

No hay suite de tests en ninguno de los dos repositorios; la verificación es manual. Recorre esta lista al terminar:

**Camino feliz**
- Postulación completa con PDF válido desde el navegador → diálogo de éxito, formulario limpio.
- El documento está en MongoDB con todos los campos y estado "nuevo".
- La URL del CV guardada abre el PDF.
- Llegan los dos correos; responder al interno escribe al postulante.

**Casos de error**
- Sin archivo → error claro, sin guardar nada.
- Archivo `.docx` o `.jpg` renombrado a `.pdf` → rechazado (el backend mira el tipo declarado, no la extensión).
- PDF de más de 5 MB → rechazado con mensaje comprensible.
- Correo con formato inválido → error en el campo, sin llegar al servidor.
- Checkbox de autorización sin marcar → no deja enviar.
- URL de LinkedIn con basura → error de patrón. Campo vacío → pasa (es opcional).
- Seis envíos seguidos → el sexto responde 429.

**Resiliencia**
- Credenciales de correo inválidas → la postulación se guarda igual y el usuario ve éxito.
- Backend apagado → el frontend muestra un error legible, no una pantalla rota ni un diálogo con "undefined".

**Regresión** (no romper lo que ya funcionaba)
- La subida de imágenes de artículos desde el panel de administración sigue funcionando. Es la comprobación de que el cambio en la función de Cloudinary fue retrocompatible.
- El formulario de contacto de la home sigue enviando.

**Navegador**
- Sin errores en la consola. Sin errores de CORS. La página se ve bien en móvil.

---

## 9. Decisiones que quedan abiertas

No bloquean la implementación, pero conviene hablarlas con la fundación antes de publicar:

- **La lista de áreas de interés.** Debe salir de las necesidades reales de la fundación, no inventada.
- **El texto de tratamiento de datos y el tiempo de conservación.** Requisito legal, no de programación.
- **Qué pasa con las hojas de vida viejas.** Sin política de borrado, la base de datos y Cloudinary acumulan datos personales indefinidamente.
- **Duplicados.** Hoy nada impide que la misma persona se postule veinte veces. El límite por IP frena el abuso automatizado, pero no a alguien insistente. Si molesta, la solución es un índice en la base de datos por documento o correo — mejor decidirlo antes de tener datos que después.
- **Cuándo se construye el panel de administración.** Mientras no exista, alguien tiene que revisar el buzón de correo. Que la fundación lo sepa.
