'use client';

import { useRef, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Entrez votre description...',
  className = '',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertParagraph', false);
      handleInput();
    }
  };

  const execCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    
    try {
      if (command === 'formatBlock' && value) {
        document.execCommand('formatBlock', false, value);
      } else {
        document.execCommand(command, false, value);
      }
      handleInput();
    } catch (error) {
      console.error('Error executing command:', error);
    }
  };

  const handleButtonClick = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault();
    execCommand(command, value);
  };

  const showPlaceholder = !isFocused && (!editorRef.current?.textContent?.trim());

  return (
    <div className={`rounded-md border border-[#525C6B] bg-white ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-gray-200 p-1.5">
        <button
          type="button"
          onClick={(e) => handleButtonClick(e, 'bold')}
          className="rounded p-1.5 hover:bg-gray-100 transition-colors"
          title="Gras"
        >
          <Icon icon="mdi:format-bold" className="h-4 w-4 text-gray-700" />
        </button>
        <button
          type="button"
          onClick={(e) => handleButtonClick(e, 'strikeThrough')}
          className="rounded p-1.5 hover:bg-gray-100 transition-colors"
          title="Barré"
        >
          <Icon icon="mdi:format-strikethrough" className="h-4 w-4 text-gray-700" />
        </button>
        <button
          type="button"
          onClick={(e) => handleButtonClick(e, 'underline')}
          className="rounded p-1.5 hover:bg-gray-100 transition-colors"
          title="Souligné"
        >
          <Icon icon="mdi:format-underline" className="h-4 w-4 text-gray-700" />
        </button>
        <div className="mx-1 h-6 w-px bg-gray-300" />
        <button
          type="button"
          onClick={(e) => handleButtonClick(e, 'justifyLeft')}
          className="rounded p-1.5 hover:bg-gray-100 transition-colors"
          title="Aligner à gauche"
        >
          <Icon icon="mdi:format-align-left" className="h-4 w-4 text-gray-700" />
        </button>
        <button
          type="button"
          onClick={(e) => handleButtonClick(e, 'justifyCenter')}
          className="rounded p-1.5 hover:bg-gray-100 transition-colors"
          title="Aligner au centre"
        >
          <Icon icon="mdi:format-align-center" className="h-4 w-4 text-gray-700" />
        </button>
        <button
          type="button"
          onClick={(e) => handleButtonClick(e, 'justifyRight')}
          className="rounded p-1.5 hover:bg-gray-100 transition-colors"
          title="Aligner à droite"
        >
          <Icon icon="mdi:format-align-right" className="h-4 w-4 text-gray-700" />
        </button>
      </div>

      {/* Editor */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] max-h-[150px] overflow-y-auto px-3 py-2 text-sm text-black focus:outline-none"
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          suppressContentEditableWarning
        />
        {showPlaceholder && (
          <div
            className="absolute left-3 top-2 pointer-events-none text-sm text-[#525C6B]"
            style={{ zIndex: 0 }}
          >
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
