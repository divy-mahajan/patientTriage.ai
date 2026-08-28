import React, { useState } from 'react';
import { FlaskConical, Clock, AlertCircle, CheckSquare, Square, FileSpreadsheet, ShieldCheck } from 'lucide-react';

export const DiagnosticTestPanel = ({
  matchedCategory,
  suggestedTests = [],
  isRuleBased = true,
  onOrderTests
}) => {
  const [selectedTests, setSelectedTests] = useState(
    suggestedTests.map(t => t.code)
  );

  const toggleTest = (code) => {
    setSelectedTests(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => {
    if (selectedTests.length === suggestedTests.length) {
      setSelectedTests([]);
    } else {
      setSelectedTests(suggestedTests.map(t => t.code));
    }
  };

  return (
    <div className="rounded-xl border border-clinical-border bg-white shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="border-b border-clinical-border bg-slate-50 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-clinical-primary-container" />
            <h3 className="text-sm font-bold text-clinical-text-primary">
              Suggested Diagnostic Test Panel
            </h3>
            {isRuleBased && (
              <span className="rounded bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 border border-blue-200">
                Deterministic Clinical Protocol
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-clinical-text-secondary">
            Matched Protocol: <span className="font-semibold text-slate-900">{matchedCategory || 'Standard Baseline Workup'}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={selectAll}
          className="text-xs font-semibold text-clinical-primary-container hover:underline"
        >
          {selectedTests.length === suggestedTests.length ? 'Deselect All' : 'Select All Tests'}
        </button>
      </div>

      {/* Tests List */}
      <div className="p-4 space-y-2.5">
        {suggestedTests.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-3 text-center">
            No diagnostic tests recommended for this presentation.
          </p>
        ) : (
          suggestedTests.map((test) => {
            const isChecked = selectedTests.includes(test.code);
            const isStat = test.urgency?.toLowerCase() === 'stat' || test.urgency?.toLowerCase() === 'immediate';

            return (
              <div
                key={test.code}
                onClick={() => toggleTest(test.code)}
                className={`rounded-lg border p-3 cursor-pointer transition-all ${
                  isChecked
                    ? 'border-blue-300 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 opacity-75 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      className="mt-0.5 text-clinical-primary-container focus:outline-hidden"
                    >
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-clinical-primary-container" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-clinical-text-primary">
                          {test.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 font-bold bg-white px-1 rounded border border-slate-200">
                          {test.code}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600 font-medium leading-tight">
                        {test.rationale}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      isStat ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {test.urgency || 'Routine'}
                    </span>
                    {test.typical_tat_minutes && (
                      <span className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500 font-mono">
                        <Clock className="h-3 w-3" />
                        TAT ~{test.typical_tat_minutes}m
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Footer */}
      {suggestedTests.length > 0 && (
        <div className="border-t border-clinical-border bg-slate-50 px-5 py-3 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">
            {selectedTests.length} of {suggestedTests.length} tests selected
          </span>
          <button
            type="button"
            onClick={() => onOrderTests && onOrderTests(selectedTests)}
            disabled={selectedTests.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-clinical-primary-container text-white px-4 py-1.5 text-xs font-bold hover:bg-clinical-primary transition disabled:opacity-50 shadow-xs"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Order Diagnostic Panel
          </button>
        </div>
      )}
    </div>
  );
};

export default DiagnosticTestPanel;
