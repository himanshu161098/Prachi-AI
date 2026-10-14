import { app } from './app';
import { config } from './config';
import { initDatabase } from './database';

async function bootstrap() {
  try {
    initDatabase();

    const server = app.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`  🚀 Prachi AI Backend Server Running on Port ${config.port}`);
      console.log(`  🔗 Health Check: http://localhost:${config.port}/health`);
      console.log(`  🧠 AI Adapters: Local Heuristic, Gemini, OpenAI, Claude`);
      console.log(`  🛡️ Auth & Multi-Tenant Isolation Active`);
      console.log(`====================================================`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
      });
    });
  } catch (err) {
    console.error('Fatal error during Prachi AI server initialization:', err);
    process.exit(1);
  }
}

bootstrap();
