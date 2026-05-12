import DOMPurify from 'dompurify';
import { marked } from 'marked';

const MARKDOWN_SANITIZE_CONFIG = {
  ADD_TAGS: ['video', 'source'],
  ADD_ATTR: ['autoplay', 'controls', 'muted', 'playsinline', 'src', 'type']
};

export const renderMarkdown = (content) =>
  DOMPurify.sanitize(marked.parse(content || ''), MARKDOWN_SANITIZE_CONFIG);
