import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// Custom plugin for saving tour data
function tourSavePlugin() {
  return {
    name: 'tour-save',
    configureServer(server) {
      server.middlewares.use('/api/save-tour', async (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              const filePath = path.join(process.cwd(), data.filePath);

              // Ensure the directory exists
              const dir = path.dirname(filePath);
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }

              // Save the tour data
              fs.writeFileSync(filePath, JSON.stringify(data.tourData, null, 2));

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            } catch (error) {
              console.error('Error saving tour:', error);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: error.message }));
            }
          });
        } else {
          res.writeHead(405);
          res.end();
        }
      });

      // API to list available .ply files
      server.middlewares.use('/api/list-ply', (req, res) => {
        if (req.method === 'GET') {
          try {
            const assetsDir = path.join(process.cwd(), 'assets');
            if (!fs.existsSync(assetsDir)) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ files: [] }));
              return;
            }

            const files = fs.readdirSync(assetsDir)
              .filter(f => f.endsWith('.ply'))
              .map(f => `/assets/${f}`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ files }));
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ files: [], error: error.message }));
          }
        } else {
          res.writeHead(405);
          res.end();
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [tourSavePlugin()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html'
      }
    }
  },
  optimizeDeps: {
    include: ['playcanvas', '@tweenjs/tween.js']
  }
});
