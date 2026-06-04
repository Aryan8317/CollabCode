export const getFileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': case 'tsx': return 'javascript';
    case 'js': case 'jsx': return 'javascript';
    case 'py': return 'terminal';
    case 'cpp': case 'c': case 'h': case 'hpp': return 'settings_ethernet';
    case 'java': case 'jar': case 'class': return 'coffee';
    case 'rs': return 'build';
    case 'go': return 'directions_run';
    case 'php': return 'language';
    case 'html': case 'htm': return 'html';
    case 'css': case 'scss': case 'sass': case 'less': return 'css';
    case 'json': return 'data_object';
    case 'md': case 'markdown': return 'markdown';
    case 'sh': case 'bash': case 'zsh': return 'terminal';
    case 'yml': case 'yaml': case 'toml': case 'ini': return 'settings';
    case 'env': return 'lock';
    case 'svg': case 'png': case 'jpg': case 'jpeg': case 'gif': case 'ico': return 'image';
    case 'txt': case 'log': return 'article';
    case 'sql': case 'sqlite': return 'database';
    case 'dockerfile': case 'dockerignore': return 'directions_boat';
    default: return 'description';
  }
};