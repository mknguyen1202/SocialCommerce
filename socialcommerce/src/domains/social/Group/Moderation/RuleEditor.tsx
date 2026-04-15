import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGroup, useUpdateGroupRules } from '../../hooks/useGroups';
import type { GroupRule } from '../../../../shared/types/domain';
import { Button } from '../../../../shared/components/Button';
import { Skeleton } from '../../../../shared/components/Skeleton';

export const RuleEditor: React.FC = () => {
  const { groupSlug } = useParams<{ groupSlug: string }>();
  const { data: group, isLoading } = useGroup(groupSlug ?? '');
  const updateRules = useUpdateGroupRules();
  const [rules, setRules] = useState<GroupRule[] | null>(null);

  if (!groupSlug) return null;

  const workingRules = rules ?? (group?.rules ?? []);

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface-2)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-primary)',
    fontSize: 'var(--font-size-sm)',
    padding: 'var(--space-2) var(--space-3)',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };

  const updateRule = (idx: number, patch: Partial<GroupRule>) => {
    setRules(workingRules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRule = () => {
    setRules([
      ...workingRules,
      {
        id: `new-${Date.now()}`,
        title: '',
        description: '',
        order: workingRules.length + 1,
      },
    ]);
  };

  const removeRule = (idx: number) => {
    setRules(workingRules.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!groupSlug) return;
    updateRules.mutate({ slug: groupSlug, rules: workingRules });
    setRules(null);
  };

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 680 }}>
      <h2
        style={{
          margin: 0,
          marginBottom: 'var(--space-5)',
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
          color: 'var(--color-text-primary)',
        }}
      >
        Community Rules
      </h2>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100%" height={100} />
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            {workingRules.map((rule, idx) => (
              <div
                key={rule.id}
                style={{
                  background: 'var(--color-surface-3)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-4)',
                  border: '1px solid var(--color-border-default)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-brand-primary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-bold)' as React.CSSProperties['fontWeight'],
                      flexShrink: 0,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <input
                    value={rule.title}
                    onChange={(e) => updateRule(idx, { title: e.target.value })}
                    placeholder="Rule title"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => removeRule(idx)}
                    aria-label="Remove rule"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-danger)',
                      padding: 4,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={rule.description}
                  onChange={(e) => updateRule(idx, { description: e.target.value })}
                  placeholder="Description (optional)"
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="ghost" size="sm" onClick={addRule}>
              + Add Rule
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={updateRules.isPending}
              disabled={!rules}
            >
              Save Rules
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
