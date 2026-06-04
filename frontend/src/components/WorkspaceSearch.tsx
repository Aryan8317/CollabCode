import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Y from 'yjs';

interface WorkspaceSearchProps {
  files: any[];
  onSelectResult: (path: string, lineNumber: number) => void;
  isOpen: boolean;
  onClose: () => void;
  ydoc?: Y.Doc;
}

const WorkspaceSearch: React.FC<WorkspaceSearchProps> = ({ files, onSelectResult, isOpen, onClose, ydoc }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) return [];

    const searchLower = query.toLowerCase();
    const matches: any[] = [];

    files.forEach(file => {
      // Check file/folder name
      if (file.name.toLowerCase().includes(searchLower)) {
        matches.push({
          type: file.type,
          path: file.path,
          name: file.name,
          line: 1,
          preview: `Matches ${file.type} name`,
        });
      }

      // Check file content
      if (file.type === 'file') {
        let content = file.content || '';
        
        // Use live Yjs content if available
        if (ydoc) {
          const type = ydoc.getText(file.path);
          if (type.length > 0) {
            content = type.toString();
          }
        }

        if (content) {
          const lines = content.split('\n');
          lines.forEach((lineText: string, index: number) => {
            if (lineText.toLowerCase().includes(searchLower)) {
              matches.push({
                type: 'content',
                path: file.path,
                name: file.name,
                line: index + 1,
                preview: lineText.trim().substring(0, 100),
              });
            }
          });
        }
      }
    });

    return matches.slice(0, 50); // limit to 50 results
  }, [query, files, ydoc, isOpen]); // isOpen included to refresh on open

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 left-[260px] w-[400px] z-[100] bg-surface-container-high border border-outline-variant shadow-2xl rounded-b-xl flex flex-col max-h-[80vh] overflow-hidden">
      <div className="p-3 border-b border-outline-variant/30 flex items-center gap-2 bg-surface-container">
        <span className="material-symbols-outlined text-primary text-[18px]">search</span>
        <input 
          ref={inputRef}
          type="text"
          className="w-full bg-transparent border-none outline-none text-on-surface text-[13px] font-mono placeholder:text-outline/50"
          placeholder="Search files and content..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        />
        <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface-container-lowest p-2">
        {query.length > 0 ? (
          results.length > 0 ? (
            results.map((result, i) => (
              <div 
                key={i}
                onClick={() => {
                  onSelectResult(result.path, result.line);
                  onClose();
                }}
                className="px-3 py-2 hover:bg-surface-container rounded cursor-pointer group mb-1 border border-transparent hover:border-outline-variant/30"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant group-hover:text-primary">
                    {result.type === 'file' ? 'description' : result.type === 'folder' ? 'folder' : 'notes'}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-on-surface truncate">{result.path}</span>
                  {result.type === 'content' && (
                    <span className="font-mono text-[9px] text-outline uppercase ml-auto">Line {result.line}</span>
                  )}
                </div>
                {result.type === 'content' && (
                  <div className="font-mono text-[10px] text-on-surface-variant pl-6 truncate">
                    {result.preview}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-outline font-mono text-[11px] uppercase tracking-widest">
              No results found
            </div>
          )
        ) : (
          <div className="text-center py-8 text-outline font-mono text-[11px] uppercase tracking-widest flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-[32px] opacity-50">search</span>
            Type to search workspace
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceSearch;