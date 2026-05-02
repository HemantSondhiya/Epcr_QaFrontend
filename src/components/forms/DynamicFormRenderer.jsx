/**
 * DynamicFormRenderer — reads workflow.formSchema and renders actual form inputs
 * 
 * Props:
 *   schema: { fields: [] }
 *   values: {}    (dynamicFormResponses state)
 *   onChange: (key, value) => void
 */
const DynamicFormRenderer = ({ schema, values = {}, onChange }) => {
  const fields = schema?.fields || [];

  if (fields.length === 0) return null;

  const inputCls = 'w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 text-sm';

  const renderField = (field) => {
    const val = values[field.key] ?? '';

    switch (field.type) {
      case 'text':
        return (
          <input
            value={val}
            onChange={e => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            className={inputCls}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={val}
            onChange={e => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            className={inputCls}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={val}
            onChange={e => onChange(field.key, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={3}
            className={inputCls + ' resize-none'}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={val}
            onChange={e => onChange(field.key, e.target.value)}
            className={inputCls}
          />
        );

      case 'boolean':
        return (
          <div className="flex gap-4 pt-1">
            {['Yes', 'No'].map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name={`dynamic_${field.key}`}
                  value={opt}
                  checked={val === opt}
                  onChange={() => onChange(field.key, opt)}
                  className="text-teal-500 border-slate-700 bg-slate-900"
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case 'select':
        return (
          <select
            value={val}
            onChange={e => onChange(field.key, e.target.value)}
            className={inputCls + ' appearance-none'}
          >
            <option value="">Select an option...</option>
            {(field.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      default:
        return (
          <input
            value={val}
            onChange={e => onChange(field.key, e.target.value)}
            className={inputCls}
          />
        );
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
      <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
        Workflow-Specific Fields
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fields.map(field => (
          <div
            key={field.id || field.key}
            className={`space-y-2 ${field.type === 'textarea' ? 'col-span-1 md:col-span-2' : ''}`}
          >
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1">
              {field.label}
              {field.required && <span className="text-rose-400 text-xs">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DynamicFormRenderer;
