import express from 'express';
import cors from 'cors';
import http from 'http';

import authRoutes from './routes/auth.js';
import chatRouter from './routes/Chat.js';
import { iniciarSocket } from './routes/Chatsocket.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use("/", authRoutes);
app.use(chatRouter);

// El socket necesita el servidor HTTP "de verdad", por eso ya no se usa app.listen
const server = http.createServer(app);
iniciarSocket(server);

server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});