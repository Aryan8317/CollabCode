import React, { useState, useMemo } from 'react';
import JSZip from 'jszip';
import { getFileIcon } from '../utils/fileUtils';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  language?: string;
  children?: FileNode[];
}

interface FileExplorerProps {
  files: any[];
  activeFile: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string, type: 'file' | 'folder', name: string) => void;
  onDeleteFile: (path: string, type: 'file' | 'folder') => void;
  onRenameFile: (oldPath: string, newName: string) => void;
  onMoveFile: (oldPath: string, newPath: string) => void;
  onDuplicateFile: (path: string) => void;
  canEdit: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({ 
  files, activeFile, onSelectFile, onCreateFile, onDeleteFile, onRenameFile, onMoveFile, onDuplicateFile, canEdit 
}) => {
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['root']));
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, path: string, type: 'file' | 'folder' } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creatingIn, setCreatingIn] = useState<{ path: string, type: 'file' | 'folder' } | null>(null);
  const [draggedNode, setDraggedNode] = useState<FileNode | null>(null);

  const tree = useMemo(() => {
    const root: FileNode = { name: 'project', path: '', type: 'folder', children: [] };
    files.forEach(file => {
      const parts = file.path.split('/');
      let current = root;
      parts.forEach((part: string, index: number) => {
        if (!part) return;
        const isLast = index === parts.length - 1;
        let child = current.children?.find(c => c.name === part);
        if (!child) {
          child = { 
            name: part, 
            path: parts.slice(0, index + 1).join('/'), 
            type: isLast ? file.type : 'folder',
            language: isLast ? file.language : undefined,
            children: isLast && file.type === 'file' ? undefined : []
          };
          current.children?.push(child);
        }
        current = child;
      });
    });
    return root.children || [];
  }, [files]);

  const toggleFolder = (path: string) => {
    const newOpen = new Set(openFolders);
    if (newOpen.has(path)) newOpen.delete(path);
    else newOpen.add(path);
    setOpenFolders(newOpen);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingIn && newName.trim()) {
      onCreateFile(creatingIn.path, creatingIn.type, newName.trim());
      setCreatingIn(null);
      setNewName('');
      if (creatingIn.path) {
         const newOpen = new Set(openFolders);
         newOpen.add(creatingIn.path);
         setOpenFolders(newOpen);
      }
    }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (renamingPath && newName.trim()) {
      onRenameFile(renamingPath, newName.trim());
      setRenamingPath(null);
      setNewName('');
    }
  };

  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    if (!canEdit) return;
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, node: FileNode) => {
    e.preventDefault();
    if (!canEdit || !draggedNode || draggedNode.path === node.path || node.type !== 'folder') return;
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetNode: FileNode) => {
    e.preventDefault();
    if (!canEdit || !draggedNode || targetNode.type !== 'folder' || draggedNode.path === targetNode.path) return;
    
    // Prevent moving folder into itself or its children
    if (draggedNode.type === 'folder' && targetNode.path.startsWith(draggedNode.path + '/')) return;

    const newPath = targetNode.path ? `${targetNode.path}/${draggedNode.name}` : draggedNode.name;
    if (newPath !== draggedNode.path) {
      onMoveFile(draggedNode.path, newPath);
    }
    setDraggedNode(null);
  };

  const handleDragEnd = () => {
    setDraggedNode(null);
  };

  const renderNode = (node: FileNode, level: number) => {
    const isFolder = node.type === 'folder';
    const isOpen = openFolders.has(node.path);
    const isActive = activeFile === node.path;

    return (
      <div key={node.path}>
        <div 
          draggable={canEdit}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => isFolder ? handleDragOver(e, node) : undefined}
          onDrop={(e) => isFolder ? handleDrop(e, node) : undefined}
          onDragEnd={handleDragEnd}
          onClick={() => isFolder ? toggleFolder(node.path) : onSelectFile(node.path)}
          onContextMenu={(e) => handleContextMenu(e, node.path, node.type)}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          className={`group flex items-center gap-2 py-1 cursor-pointer hover:bg-surface-container-high transition-colors ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[16px] opacity-70">
            {isFolder ? (isOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_right') : ''}
          </span>
          <span className="material-symbols-outlined text-[18px]">
            {isFolder ? (isOpen ? 'folder_open' : 'folder') : getFileIcon(node.name)}
          </span>
          
          {renamingPath === node.path ? (
            <form onSubmit={handleRenameSubmit} className="flex-1 mr-2">
              <input autoFocus className="w-full bg-surface-container-highest border border-primary rounded px-1 text-[12px] outline-none" value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={() => setRenamingPath(null)} />
            </form>
          ) : (
            <span className="text-[13px] font-mono truncate">{node.name}</span>
          )}
        </div>

        {isFolder && isOpen && (
          <>
            {node.children?.map(child => renderNode(child, level + 1))}
            {creatingIn?.path === node.path && (
               <div style={{ paddingLeft: `${(level + 1) * 12 + 12}px` }} className="py-1 pr-2">
                 <form onSubmit={handleCreateSubmit} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] opacity-50">{creatingIn.type === 'folder' ? 'folder' : 'description'}</span>
                    <input autoFocus className="w-full bg-surface-container-highest border border-primary rounded px-1 text-[12px] outline-none" value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={() => setCreatingIn(null)} />
                 </form>
               </div>
            )}
          </>
        )}
      </div>
    );
  };

  const handleContextMenu = (e: React.MouseEvent, path: string, type: 'file' | 'folder') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, path, type });
  };

  const handleRootContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path: '', type: 'folder' });
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();
    files.forEach(file => {
      if (file.type === 'file') {
        zip.file(file.path, file.content || '');
      }
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workspace.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeFolderPath = activeFile ? activeFile.split('/').slice(0, -1).join('/') : '';

  return (
    <div 
      className="flex flex-col h-full bg-surface-container-low border-r border-outline-variant/30" 
      onClick={() => setContextMenu(null)}
      onContextMenu={handleRootContextMenu}
    >
      <div className="p-4 flex items-center justify-between border-b border-outline-variant/20">
        <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">Explorer</span>
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); setCreatingIn({ path: activeFolderPath, type: 'file' }); setNewName(''); }} className="p-1 hover:bg-surface-container rounded text-on-surface-variant"><span className="material-symbols-outlined text-[16px]">note_add</span></button>
          <button onClick={(e) => { e.stopPropagation(); setCreatingIn({ path: activeFolderPath, type: 'folder' }); setNewName(''); }} className="p-1 hover:bg-surface-container rounded text-on-surface-variant"><span className="material-symbols-outlined text-[16px]">create_new_folder</span></button>
          <button onClick={(e) => { e.stopPropagation(); handleDownloadZip(); }} className="p-1 hover:bg-surface-container rounded text-on-surface-variant" title="Download ZIP"><span className="material-symbols-outlined text-[16px]">download</span></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {creatingIn?.path === '' && (
          <div className="px-3 mb-2">
            <form onSubmit={handleCreateSubmit} className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] opacity-50">{creatingIn.type === 'folder' ? 'folder' : 'description'}</span>
              <input autoFocus className="w-full bg-surface-container-highest border border-primary rounded px-1 text-[12px] outline-none" value={newName} onChange={(e) => setNewName(e.target.value)} onBlur={() => setCreatingIn(null)} />
            </form>
          </div>
        )}
        {tree.map(node => renderNode(node, 0))}
      </div>

      {contextMenu && canEdit && (
        <div className="fixed z-[100] bg-surface-container-highest border border-outline-variant shadow-xl rounded-lg py-1 w-40 animate-fade-in" style={{ top: contextMenu.y, left: contextMenu.x }}>
          {contextMenu.path !== '' && (
            <>
              <button onClick={() => { setRenamingPath(contextMenu.path); setNewName(contextMenu.path.split('/').pop() || ''); }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-primary/20 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">edit</span> Rename</button>
              
              {contextMenu.type === 'file' && (
                <button onClick={() => onDuplicateFile(contextMenu.path)} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-primary/20 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">content_copy</span> Duplicate
                </button>
              )}

              <button onClick={() => onDeleteFile(contextMenu.path, contextMenu.type)} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-error/20 text-error flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">delete</span> Delete</button>
              {contextMenu.type === 'folder' && (
                <div className="h-px bg-outline-variant/30 my-1"></div>
              )}
            </>
          )}
          {contextMenu.type === 'folder' && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setCreatingIn({ path: contextMenu.path, type: 'file' }); setNewName(''); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-primary/20 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">note_add</span> New File</button>
              <button onClick={(e) => { e.stopPropagation(); setCreatingIn({ path: contextMenu.path, type: 'folder' }); setNewName(''); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-primary/20 flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">create_new_folder</span> New Folder</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
