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
import patientPortalReducer from './slices/patientPortalSlice';
import hipaaReducer         from './slices/hipaaSlice';
import breakGlassReducer    from './slices/breakGlassSlice';
import deidReducer          from './slices/deIdSlice';
import reportReducer        from './slices/reportSlice';
import auditReducer         from './slices/auditSlice';
import baaReducer           from './slices/baaSlice';
import feedbackReducer      from './slices/feedbackSlice';

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
    patientPortal: patientPortalReducer,
    hipaa:         hipaaReducer,
    breakGlass:    breakGlassReducer,
    deid:          deidReducer,
    reports:       reportReducer,
    audit:         auditReducer,
    baa:           baaReducer,
    feedback:      feedbackReducer,
  },
});

export default store;
