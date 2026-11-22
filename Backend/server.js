import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';

import postsRouter from './routes/Posts.js';
import authRoutes from './routes/auth.js';
import chatRouter from './routes/Chat.js';
import lugaresRouter from './routes/Lugares.js';
import perfilRouter from './routes/Perfil.js';
import favoritosRouter from './routes/Favoritos.js';
import itinerariosRouter from './routes/Itinerarios.js';
import { iniciarSocket } from './routes/Chatsocket.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", authRoutes);
app.use('/uploads', express.static(path.resolve('uploads')));
app.use(postsRouter);
app.use(perfilRouter);
app.use(favoritosRouter);
app.use(itinerariosRouter);
app.use(chatRouter);
app.use(lugaresRouter);


// El socket necesita el servidor HTTP "de verdad", por eso ya no se usa app.listen
const server = http.createServer(app);
iniciarSocket(server);

server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});