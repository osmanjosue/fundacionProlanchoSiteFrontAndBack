require ('dotenv').config();
const express = require ('express');
const cors = require('cors');
const path = require ('path');

const { dbConnection } = require('./database/config')
const { ALLOWED_ORIGINS } = require('./config/allowed-origins');
const { createRateLimiter } = require('./middlewares/rate-limiter');
const { RATE_LIMITS } = require('./config/rate-limits');
const { errorHandler } = require('./middlewares/error-handler');

const app = express(); //creates express server

// Detrás del reverse proxy (nginx/Hetzner): confiar en X-Forwarded-For para que
// el rate limit identifique la IP real del cliente y no la del proxy.
app.set('trust proxy', 1);

app.use( cors({ origin: ALLOWED_ORIGINS }) );// cors configuration

app.use(createRateLimiter(RATE_LIMITS.global.max, RATE_LIMITS.global.windowMs, RATE_LIMITS.global.message));

//Carpeta publica
app.use( express. static ('public'));

// IMPORTANTE: la ruta del chat se monta ANTES del express.json() global para
// poder aplicarle su propio límite de tamaño de body (10kb). Su router usa su
// propio parser, por lo que el json global de abajo no la vuelve a parsear.
app.use( '/api/webhook_chatbot_drafrancisherrera', require('./routes/webhook_chatbot_drafrancisherrera-routes') );
app.use( '/api/webhook_booking_drafrancisherrera', require('./routes/webhook_booking_drafrancisherrera-routes') );
app.use( '/api/drafrancisherrera_email', require('./routes/drafrancisherrera_email_routes') );

app.use( express.json() ) // para leer el body, sin esto no funcionaria el post

dbConnection(); //database conexion

//routes starts
app.use('/api/login', require('./routes/loginUser-routes'));
app.use( '/api/articles', require('./routes/articles-routes'));
app.use( '/api/users', require('./routes/user-routes'));
app.use( '/api/projects', require ('./routes/project-routes'));
app.use( '/api/uploads', require ('./routes/uploads-routes'));
app.use( '/api/email', require('./routes/email-routes') );
// La ruta '/api/webhook_chatbot_drafrancisherrera' se monta arriba, antes del
// express.json() global, para aplicarle su propio límite de tamaño de body.
//routes Ends

// Lo último
app.get('*', (req, res) => {
    res.sendFile( path.resolve( __dirname, 'public/index.html' ) );
});

// Manejador de errores global: captura lo que los controllers envían a next(err).
// Debe ir DESPUÉS de todas las rutas.
app.use(errorHandler);

app.listen(process.env.PORT, ()=>{
    console.log(('servidor corriendo en puerto ' + process.env.PORT));
})
