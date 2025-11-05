import React, { useState, useRef, useEffect } from 'react';

const Autocomplete = ({ placeholder, initialValue, onSubmit, onChange, onCancel, vocabulary = [] }) => {
  const [value, setValue] = useState(initialValue || '');
  const [highlight, setHighlight] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    setValue(initialValue || '');
  }, [initialValue]);

  const suggestions = value
    ? vocabulary.filter(v => v.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : vocabulary.slice(0, 8);

  const handleChange = e => {
    const v = e.target.value;
    setValue(v);
    setHighlight(-1);
    onChange && onChange(v);
  }

  const commit = val => {
    const out = (typeof val === 'string') ? val : value;
    if (out && out.trim().length > 0) onSubmit && onSubmit(out.trim());
  };

  const handleKeyDown = e => {
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
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setHighlight(h => Math.max(h - 1, 0));
      e.preventDefault();
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const onDoc = e => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
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
          {suggestions.map((v, i) => (
            <li
              role="option"
              aria-selected={highlight === i}
              key={i}
              className={highlight === i ? 'highlight' : ''}
              onMouseDown={(ev) => { ev.preventDefault(); commit(v); }}
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
