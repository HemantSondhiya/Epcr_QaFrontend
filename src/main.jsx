import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store/index.js';
import { injectStore } from './api/client.js';
import './index.css';
import App from './App.jsx';

// Wire Redux store into Axios client BEFORE any API calls
injectStore(store);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
