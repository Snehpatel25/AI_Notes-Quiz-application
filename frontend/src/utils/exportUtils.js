export const exportToMarkdown = (note) => {
    if (!note) return;

    const date = new Date(note.updatedAt).toLocaleDateString();
    const tags = note.tags ? note.tags.map(t => `#${t}`).join(' ') : '';

    // Basic HTML to Markdown conversion (very simple)
    let content = note.content || '';
    content = content.replace(/<div>/g, '\n').replace(/<\/div>/g, '');
    content = content.replace(/<br>/g, '\n');
    content = content.replace(/<b>(.*?)<\/b>/g, '**$1**');
    content = content.replace(/<i>(.*?)<\/i>/g, '*$1*');
    content = content.replace(/<u>(.*?)<\/u>/g, '__$1__');
    content = content.replace(/<[^>]*>/g, ''); // Strip remaining tags

    const markdown = `# ${note.title}
Date: ${date}
Tags: ${tags}

${content}

---
*Exported from CyberNotes*
`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
