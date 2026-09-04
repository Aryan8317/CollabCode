import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Socket } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

interface TerminalPanelProps {
  socket: Socket | null;
  roomId: string;
  visible: boolean;
  canEdit: boolean;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({ socket, roomId, visible, canEdit }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current || !socket) return;

    if (!xtermRef.current) {
      const term = new Terminal({
        theme: {
          background: '#0b0e14',
          foreground: '#a1aab8',
          cursor: '#adc6ff',
          cursorAccent: '#0b0e14',
          selectionBackground: 'rgba(173, 198, 255, 0.3)',
        },
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 13,
        cursorBlink: true,
        disableStdin: !canEdit,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      
      term.writeln('\x1b[32m[System] Connecting to remote shell...\x1b[0m');

      // Delay initial fit slightly to ensure DOM is ready
      setTimeout(() => fitAddon.fit(), 50);

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      socket.emit('terminal-init', roomId);

      term.onData((data) => {
        if (canEdit) {
          socket.emit('terminal-input', { data });
        }
      });

      term.onResize((size) => {
        socket.emit('terminal-resize', { cols: size.cols, rows: size.rows });
      });

      const handleResize = () => {
        if (fitAddonRef.current && terminalRef.current?.offsetParent !== null) {
          fitAddonRef.current.fit();
        }
      };
      window.addEventListener('resize', handleResize);

      const onTerminalData = (data: string) => {
        term.write(data);
      };

      socket.on('terminal-data', onTerminalData);

      return () => {
        window.removeEventListener('resize', handleResize);
        socket.off('terminal-data', onTerminalData);
        term.writeln('\r\n\x1b[31m[System] Terminal disconnected.\x1b[0m');
        socket.emit('terminal-close');
        term.dispose();
        xtermRef.current = null;
      };
    }
  }, [socket, roomId]);

  // Handle visibility changes separately to refit and focus
  useEffect(() => {
    if (visible && xtermRef.current && fitAddonRef.current) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          fitAddonRef.current?.fit();
          xtermRef.current?.focus();
          xtermRef.current?.refresh(0, xtermRef.current!.rows - 1);
        }, 50);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.disableStdin = !canEdit;
    }
  }, [canEdit]);

  return (
    <div 
      ref={terminalRef} 
      onClick={() => xtermRef.current?.focus()}
      className={`w-full h-full p-2 bg-surface-container-lowest border-t border-outline-variant cursor-text ${visible ? 'block' : 'hidden'}`}
    />
  );
};

export default TerminalPanel;
