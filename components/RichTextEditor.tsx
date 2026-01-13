import React, { useState, useRef, useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, className, minHeight = '200px' }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync initial value or external updates
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
        // Only update if significantly different to avoid cursor jumping
        // Simple check: if empty value passed but editor has content, or strictly different
        if (value === '' && editorRef.current.innerHTML === '<br>') return;
        editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        editorRef.current.focus();
        handleInput();
    }
  };

  const ToolbarButton = ({ command, arg, icon, label, active = false }: { command: string, arg?: string, icon?: React.ReactNode, label?: string, active?: boolean }) => (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); execCommand(command, arg); }}
      className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300 ${active ? 'bg-slate-200 dark:bg-slate-700 text-sky-600 dark:text-sky-400' : ''}`}
      title={label || command}
    >
      {icon || label}
    </button>
  );

  return (
    <div className={`border-2 border-slate-300 dark:border-slate-600 rounded-md overflow-hidden bg-white dark:bg-slate-800 transition-colors ${isFocused ? 'ring-2 ring-sky-500 border-sky-500 dark:border-sky-500' : ''} ${className}`}>
      <div className="flex items-center gap-1 p-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex-wrap">
        <div className="flex items-center gap-1 border-r border-slate-300 dark:border-slate-700 pr-2 mr-2">
             <select 
                className="bg-transparent text-sm font-bold text-slate-600 dark:text-slate-300 p-1 cursor-pointer outline-none"
                onChange={(e) => execCommand('fontSize', e.target.value)}
                defaultValue="3"
             >
                <option value="1" className="text-slate-800">小</option>
                <option value="3" className="text-slate-800">標準</option>
                <option value="5" className="text-slate-800">大</option>
                <option value="7" className="text-slate-800">特大</option>
             </select>
        </div>

        <ToolbarButton command="bold" label="B" icon={<span className="font-bold serif">B</span>} />
        <ToolbarButton command="italic" label="I" icon={<span className="italic serif">I</span>} />
        <ToolbarButton command="underline" label="U" icon={<span className="underline serif">U</span>} />
        
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />
        
        <ToolbarButton command="insertUnorderedList" label="List" icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        } />
        <ToolbarButton command="insertOrderedList" label="Ordered" icon={
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>
        } />

        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700 mx-1" />

        <ToolbarButton command="justifyLeft" icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="3" y2="14"></line><line x1="17" y1="18" x2="3" y2="18"></line></svg>} />
      </div>
      
      <div 
        ref={editorRef}
        contentEditable
        className="p-4 outline-none text-slate-800 dark:text-slate-100 overflow-y-auto"
        style={{ minHeight }}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
          pointer-events: none;
          display: block; /* For Firefox */
        }
        .dark [contenteditable]:empty:before {
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;