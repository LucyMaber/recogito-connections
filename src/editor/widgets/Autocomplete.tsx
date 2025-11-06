import React, { useState, useRef, useEffect } from 'react';

interface AutocompleteProps {
  placeholder?: string;
  initialValue?: string;
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
  onCancel?: () => void;
  vocabulary?: string[];
}

const Autocomplete: React.FC<AutocompleteProps> = ({
  placeholder,
  initialValue,
  onSubmit,
  onChange,
  onCancel,
  vocabulary = []
}) => {
  const [value, setValue] = useState<string>(initialValue || '');
  const [highlight, setHighlight] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValue(initialValue || '');
  }, [initialValue]);

  const suggestions: string[] = value
    ? vocabulary.filter((v: string) => v.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : vocabulary.slice(0, 8);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const v = e.target.value;
    setValue(v);
    setHighlight(-1);
    onChange && onChange(v);
  }

  const commit = (val?: string): void => {
    const out = (typeof val === 'string') ? val : value;
    if (out && out.trim().length > 0) onSubmit && onSubmit(out.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      if (highlight >= 0 && suggestions[highlight]) {
        commit(suggestions[highlight]);
      } else {
        commit(value);
      }
      e.preventDefault();
    } else if (e.key === 'Escape') {
      onCancel && onCancel();
    } else if (e.key === 'ArrowDown') {
      setHighlight((h: number) => Math.min(h + 1, suggestions.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlight((h: number) => Math.max(h - 1, 0));
      e.preventDefault();
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent): void => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setHighlight(-1);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="r6o-autocomplete" ref={containerRef}>
      <input
        type="text"
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      {suggestions.length > 0 && (
        <ul role="listbox" aria-label="Suggestions">
          {suggestions.map((v: string, i: number) => (
            <li
              role="option"
              aria-selected={highlight === i}
              key={i}
              className={highlight === i ? 'highlight' : ''}
              onMouseDown={(ev: React.MouseEvent) => { ev.preventDefault(); commit(v); }}
              onMouseEnter={() => setHighlight(i)}
            >
              {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Autocomplete;
