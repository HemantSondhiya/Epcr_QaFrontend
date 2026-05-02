import { useState } from 'react';
import { Plus, Trash2, GripVertical, Type, Hash, ToggleLeft, List, Calendar, AlignLeft } from 'lucide-react';

const FIELD_TYPES = [
  { value: 'text',     label: 'Text Input',   icon: <Type size={14} /> },
  { value: 'number',   label: 'Number',        icon: <Hash size={14} /> },
  { value: 'boolean',  label: 'Yes / No',      icon: <ToggleLeft size={14} /> },
  { value: 'select',   label: 'Dropdown',      icon: <List size={14} /> },
  { value: 'date',     label: 'Date',          icon: <Calendar size={14} /> },
  { value: 'textarea', label: 'Long Text',     icon: <AlignLeft size={14} /> },
];

const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 outline-none';

const emptyField = () => ({
  id: crypto.randomUUID(),
  label: '',
  key: '',
  type: 'text',
  required: false,
  placeholder: '',
  options: [],   // for select type
});

/**
 * FormBuilder — visual editor for workflow.formSchema
 * 
 * Props:
 *   schema: { fields: [] }   (current value)
 *   onChange: (newSchema) => void
 */
const FormBuilder = ({ schema, onChange }) => {
  const fields = schema?.fields || [];

  const updateFields = (newFields) => {
    onChange({ ...schema, fields: newFields });
  };

  const addField = () => {
    updateFields([...fields, emptyField()]);
  };

  const removeField = (id) => {
    updateFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id, patch) => {
    updateFields(fields.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const autoKey = (label) =>
    label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-300">
          Dynamic Form Fields ({fields.length})
        </span>
        <button
          type="button"
          onClick={addField}
          className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
        >
          <Plus size={14} /> Add Field
        </button>
      </div>

      {fields.length === 0 && (
        <div className="p-6 text-center border border-dashed border-slate-700 rounded-xl text-slate-500 text-xs">
          No fields yet. Click "Add Field" to build your dynamic form.
        </div>
      )}

      {fields.map((field, idx) => (
        <div key={field.id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 space-y-3 relative group">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-500">
              <GripVertical size={14} />
              <span className="text-xs font-semibold text-teal-400">Field {idx + 1}</span>
            </div>
            <button
              type="button"
              onClick={() => removeField(field.id)}
              className="text-slate-600 hover:text-rose-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Label + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Label *</label>
              <input
                value={field.label}
                onChange={e => updateField(field.id, {
                  label: e.target.value,
                  key: field.key || autoKey(e.target.value),
                })}
                placeholder="e.g. Patient Weight"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Field Key (auto)</label>
              <input
                value={field.key}
                onChange={e => updateField(field.id, { key: e.target.value })}
                placeholder="patient_weight"
                className={inputCls + ' font-mono text-xs text-slate-400'}
              />
            </div>
          </div>

          {/* Type + Required */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Type</label>
              <select
                value={field.type}
                onChange={e => updateField(field.id, { type: e.target.value })}
                className={inputCls + ' appearance-none'}
              >
                {FIELD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Placeholder</label>
              <input
                value={field.placeholder}
                onChange={e => updateField(field.id, { placeholder: e.target.value })}
                placeholder="Enter value..."
                className={inputCls}
              />
            </div>
          </div>

          {/* Options for select */}
          {field.type === 'select' && (
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Options (comma-separated)</label>
              <input
                value={field.options?.join(', ')}
                onChange={e => updateField(field.id, {
                  options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                })}
                placeholder="Option A, Option B, Option C"
                className={inputCls}
              />
            </div>
          )}

          {/* Required toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required}
              onChange={e => updateField(field.id, { required: e.target.checked })}
              className="rounded border-slate-700 bg-slate-900 text-teal-500"
            />
            Required field
          </label>
        </div>
      ))}

      {fields.length > 0 && (
        <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-800 text-xs text-slate-500">
          <span className="font-medium text-slate-400">JSON Preview: </span>
          <code className="text-teal-500">formSchema.fields[{fields.length}]</code>
          {' '}→ will render as live form inputs in Create Record.
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
