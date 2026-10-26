// Local-only synthetic-video fixture; it never loads personal media or remote websites.

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import * as esbuild from 'esbuild';

createServer(async (request, response) => {
    try {
        if (request.url === '/bundle.js') {
            const result = await esbuild.build({
                entryPoints: ['test/browser-entry.js'],
                bundle: true,
                write: false,
                format: 'iife',
            });
            response.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
            response.end(result.outputFiles[0].contents);
        } else if (request.url === '/') {
            response.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
            response.end(await readFile(new URL('../test/browser.html', import.meta.url)));
        } else if (/^\/media\/synthetic-(4k|8k)-(h264|hevc)\.mp4$/.test(request.url)) {
            response.writeHead(200, { 'Content-Type': 'video/mp4', 'Cache-Control': 'no-store' });
            response.end(await readFile(new URL(`../test${request.url}`, import.meta.url)));
        } else {
            response.writeHead(404);
            response.end();
        }
    } catch (error) {
        response.writeHead(500);
        response.end(error.message);
    }
}).listen(8818, '127.0.0.1', () => console.log('Synthetic video checks: http://127.0.0.1:8818'));
