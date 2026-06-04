export const defineMonacoThemes = (monaco: any) => {
  monaco.editor.defineTheme('one-dark-pro', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { background: '282c34', token: '' },
      { foreground: 'abb2bf', token: 'identifier' },
      { foreground: '61afef', token: 'type' },
      { foreground: 'c678dd', token: 'string' },
      { foreground: '98c379', token: 'string.quote' },
      { foreground: 'e06c75', token: 'keyword' },
      { foreground: '56b6c2', token: 'number' },
      { foreground: 'd19a66', token: 'comment' },
    ],
    colors: {
      'editor.background': '#282c34',
      'editor.foreground': '#abb2bf',
      'editorLineNumber.foreground': '#495162',
      'editorCursor.foreground': '#528bff',
      'editorIndentGuide.background': '#3b4048',
    }
  });

  monaco.editor.defineTheme('solarized-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { background: '002b36', token: '' },
      { foreground: '93a1a1', token: 'identifier' },
      { foreground: '268bd2', token: 'type' },
      { foreground: '2aa198', token: 'string' },
      { foreground: '859900', token: 'keyword' },
      { foreground: 'd33682', token: 'number' },
      { foreground: '586e75', token: 'comment' },
    ],
    colors: {
      'editor.background': '#002b36',
      'editor.foreground': '#839496',
      'editorLineNumber.foreground': '#586e75',
      'editorCursor.foreground': '#d33682',
      'editorIndentGuide.background': '#073642',
    }
  });
};
