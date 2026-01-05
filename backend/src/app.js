import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandlers.js';
import authRoutes from './routes/auth.js';
import boardsRoutes from './routes/boards.js';
import cardsRoutes from './routes/cards.js';
import listsRoutes from './routes/lists.js';
import notificationsRoutes from './routes/notifications.js';
import usersRoutes from './routes/users.js';

const app = express();

const corsOptions = {
  origin: env.CLIENT_URL,
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/lists', listsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', usersRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
