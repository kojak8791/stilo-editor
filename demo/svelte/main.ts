import '../../src/styles/content.css';
import '../demo.css';
import '../../src/styles/ui.css';
import { mount } from 'svelte';
import App from './app.svelte';

mount(App, { target: document.querySelector('#app')! });
