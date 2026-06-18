require ('dotenv').config();
const express = require ('express');
const cors = require('cors');
const path = require ('path');

const { dbConnection } = require('./database/config')

const app = express(); //creates express server
app.use( cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://drafrancisherrera.com',
        'https://www.drafrancisherrera.com',
        'https://fundacionprolancho.org',
        'https://www.fundacionprolancho.org'
    ]
}) );// cors configuration

//Carpeta publica
app.use( express. static ('public'));

app.use( express.json() ) // para leer el body, sin esto no funcionaria el post

dbConnection(); //database conexion

//routes starts
app.use('/api/login', require('./routes/loginUser-routes'));
app.use( '/api/articles', require('./routes/articles-routes'));
app.use( '/api/users', require('./routes/user-routes'));
app.use( '/api/projects', require ('./routes/project-routes'));
app.use( '/api/uploads', require ('./routes/uploads-routes'));
app.use( '/api/email', require('./routes/email-routes') );
app.use( '/api/webhook_chatbot_drafrancisherrera', require('./routes/webhook_chatbot_drafrancisherrera-routes') );
//routes Ends

// Lo último
app.get('*', (req, res) => {
    res.sendFile( path.resolve( __dirname, 'public/index.html' ) );
});

app.listen(process.env.PORT, ()=>{
    console.log(('servidor corriendo en puerto ' + process.env.PORT));
})
