import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { registerTools } from './lib/webmcp.js';
import { session } from './lib/session.svelte.js';

// Register tools before first render, so an agent that arrives early never
// sees a half-built page.
const teardown = registerTools();
if (import.meta.hot) import.meta.hot.dispose(teardown);

// dev/judge affordance
window.session = session;
export default mount(App, { target: document.getElementById('app') });

