import { marked } from 'marked';

const markdown = `![Screenshot 2025-12-29 at 6.19.56 PM.png](17Df65r3KrJOx4a0DAEk0puPOcFK5eVvN)`;

const tokens = marked.lexer(markdown);
console.log(JSON.stringify(tokens, null, 2));
