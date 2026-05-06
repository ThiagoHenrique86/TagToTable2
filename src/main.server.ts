import WebSocket from 'ws';

// Shim WebSocket for Node.js < 22 (required by Supabase Realtime)
if (typeof global !== 'undefined' && !global.WebSocket) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).WebSocket = WebSocket;
}

import {
  BootstrapContext,
  bootstrapApplication,
} from '@angular/platform-browser';
import {App} from './app/app';
import {config} from './app/app.config.server';

const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(App, config, context);

export default bootstrap;
