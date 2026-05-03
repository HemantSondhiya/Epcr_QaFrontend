import { configureStore } from '@reduxjs/toolkit';
import authReducer         from './slices/authSlice';
import uiReducer           from './slices/uiSlice';
import epcrReducer         from './slices/epcrSlice';
import qaReducer           from './slices/qaSlice';
import workflowReducer     from './slices/workflowSlice';
import notificationReducer from './slices/notificationSlice';
import userReducer         from './slices/userSlice';
import qaRulesReducer      from './slices/qaRulesSlice';
import formTemplateReducer from './slices/formTemplateSlice';
import orgReducer          from './slices/orgSlice';

const store = configureStore({
  reducer: {
    auth:          authReducer,
    ui:            uiReducer,
    epcr:          epcrReducer,
    qa:            qaReducer,
    workflows:     workflowReducer,
    notifications: notificationReducer,
    users:         userReducer,
    qaRules:       qaRulesReducer,
    formTemplate:  formTemplateReducer,
    org:           orgReducer,
  },
});

export default store;
