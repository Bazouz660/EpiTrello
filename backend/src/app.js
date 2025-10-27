import bodyParser from 'body-parser';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandlers.js';

const app = express();

const corsOptions = {
  origin: env.CLIENT_URL,
  credentials: true
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Placeholder for future routing middleware configuration

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
