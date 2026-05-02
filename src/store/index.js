import { configureStore } from '@reduxjs/toolkit';
import authReducer         from './slices/authSlice';
import uiReducer           from './slices/uiSlice';
import epcrReducer         from './slices/epcrSlice';
import qaReducer           from './slices/qaSlice';
import workflowReducer     from './slices/workflowSlice';
import notificationReducer from './slices/notificationSlice';

const store = configureStore({
  reducer: {
    auth:          authReducer,
    ui:            uiReducer,
    epcr:          epcrReducer,
    qa:            qaReducer,
    workflows:     workflowReducer,
    notifications: notificationReducer,
  },
});

export default store;
