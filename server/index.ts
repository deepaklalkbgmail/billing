import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './db.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import branchRoutes from './routes/branch.routes.js';
import menuRoutes from './routes/menu.routes.js';
import billingRoutes from './routes/billing.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import settingsRoutes from './routes/settings.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3456;

// Enable CORS for frontend Vite dev server and electron/local origins
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3456',
      'http://127.0.0.1:3456',
    ],
    credentials: true,
  })
);

// JSON and URL-encoded body parser with 50mb limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check endpoint
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    // Quick DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      service: 'RestoPOS Backend API',
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected',
      error: err?.message || 'Database error',
      timestamp: new Date().toISOString(),
    });
  }
});

// Mount API routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);

// Production frontend static file serving
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global 404 handler for API routes
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found',
  });
});

// Centralized error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// Initialize Prisma client and start server
async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to SQLite database via Prisma ORM');

    app.listen(PORT, () => {
      console.log(`🚀 RestoPOS Express server running at http://localhost:${PORT}`);
      console.log(`📡 CORS enabled for Vite dev server at http://localhost:5173`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to database or start server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Shutting down RestoPOS server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('Shutting down RestoPOS server gracefully...');
  process.exit(0);
});

startServer();

export default app;
