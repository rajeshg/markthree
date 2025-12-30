import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { nanoid } from "nanoid";
import { EditorBlock, BlockType } from "@/types/editor";

const turndownService = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});
turndownService.use(gfm);

export function parseMarkdownToBlocks(markdown: string): EditorBlock[] {
  const tokens = marked.lexer(markdown);
  const blocks: EditorBlock[] = [];

  function processToken(token: any) {
    let type: BlockType = "p";
    let content = "";

    switch (token.type) {
      case "heading":
        type = `h${token.depth}` as BlockType;
        content = token.text;
        break;
      case "paragraph":
        // Check for images inside paragraphs (common for single-line images)
        if (
          token.tokens &&
          token.tokens.length === 1 &&
          token.tokens[0].type === "image"
        ) {
          const img = token.tokens[0];
          console.log(
            "[Parser] ✅ FOUND IMAGE in paragraph:",
            img.href,
            img.text,
          );
          blocks.push({
            id: nanoid(),
            type: "image",
            content: img.text,
            metadata: { src: img.href },
          });
          return;
        }
        type = "p";
        content = token.text;
        break;
      case "list":
        token.items.forEach((item: any) => {
          const text = item.text;
          // Check for custom in-progress state [.] or [/] or [-]
          const isInProgress =
            text.startsWith("[.] ") ||
            text.startsWith("[/] ") ||
            text.startsWith("[-] ");
          const isTask = item.task === true || isInProgress;

          let status = "todo";
          let cleanContent = text;

          if (item.task) {
            status = item.checked ? "done" : "todo";
            cleanContent = text.replace(/^\[[ x]\] /, "");
          } else if (isInProgress) {
            status = "in_progress";
            cleanContent = text.substring(4);
          }

          blocks.push({
            id: nanoid(),
            type: isTask ? "checkbox" : token.ordered ? "ol" : "ul",
            content: cleanContent,
            metadata: isTask ? { status } : undefined,
          });
        });
        return;
      case "code":
        type = "code";
        content = token.text;
        blocks.push({
          id: nanoid(),
          type,
          content,
          metadata: { language: token.lang },
        });
        return;
      case "hr":
        type = "hr";
        content = "";
        break;
      case "blockquote":
        console.log("[Parser] Blockquote token:", {
          text: token.text?.substring(0, 100),
          hasTokens: !!token.tokens,
          tokenCount: token.tokens?.length,
          tokens: token.tokens?.map((t: any) => ({
            type: t.type,
            text: t.text?.substring(0, 50),
          })),
        });
        type = "blockquote";
        content = token.text;
        break;
      case "image":
        type = "image";
        content = token.text; // alt text
        blocks.push({
          id: nanoid(),
          type,
          content: token.text,
          metadata: { src: token.href },
        });
        return;
      case "space":
        return;
      default:
        type = "p";
        content = token.raw;
    }

    blocks.push({
      id: nanoid(),
      type,
      content,
    });
  }

  tokens.forEach(processToken);

  if (blocks.length === 0) {
    blocks.push({ id: nanoid(), type: "p", content: "" });
  }

  return blocks;
}

export function blocksToMarkdown(blocks: EditorBlock[]): string {
  let markdown = "";

  blocks.forEach((block, index) => {
    const prevBlock = index > 0 ? blocks[index - 1] : null;
    const nextBlock = index < blocks.length - 1 ? blocks[index + 1] : null;

    // Helper to check if a block type is a list item
    const isListType = (type: BlockType) =>
      ["ul", "ol", "checkbox"].includes(type);

    switch (block.type) {
      case "h1":
        markdown += `# ${block.content}\n\n`;
        break;
      case "h2":
        markdown += `## ${block.content}\n\n`;
        break;
      case "h3":
        markdown += `### ${block.content}\n\n`;
        break;
      case "ul":
        markdown += `- ${block.content}\n`;
        break;
      case "ol":
        markdown += `1. ${block.content}\n`;
        break;
      case "checkbox": {
        const status = block.metadata?.status || "todo";
        const marker =
          status === "done" ? "[x]" : status === "in_progress" ? "[/]" : "[ ]";
        markdown += `- ${marker} ${block.content}\n`;
        break;
      }
      case "blockquote":
        markdown += `> ${block.content}\n\n`;
        break;
      case "code":
        markdown += `\`\`\`${block.metadata?.language || ""}\n${block.content}\n\`\`\`\n\n`;
        break;
      case "image":
        // Add extra newline if previous block was a list item
        if (prevBlock && isListType(prevBlock.type)) {
          markdown += "\n";
        }
        markdown += `![${block.content}](${block.metadata?.src})\n\n`;
        break;
      case "hr":
        markdown += `---\n\n`;
        break;
      default:
        markdown += `${block.content}\n\n`;
    }

    // Add extra spacing after list blocks if next block is not a list
    if (
      isListType(block.type) &&
      nextBlock &&
      !isListType(nextBlock.type) &&
      nextBlock.type !== "image"
    ) {
      markdown += "\n";
    }
  });

  return markdown.trim();
}
