import { describe, it, expect } from "vitest";
import { parseMarkdownToBlocks, blocksToMarkdown } from "./parser";
import type { EditorBlock } from "@/types/editor";

describe("Markdown Parser", () => {
  describe("parseMarkdownToBlocks", () => {
    describe("Headings", () => {
      it("should parse H1 heading", () => {
        const markdown = "# Main Title";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("h1");
        expect(blocks[0].content).toBe("Main Title");
      });

      it("should parse H2 heading", () => {
        const markdown = "## Subtitle";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("h2");
        expect(blocks[0].content).toBe("Subtitle");
      });

      it("should parse H3 heading", () => {
        const markdown = "### Section";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("h3");
        expect(blocks[0].content).toBe("Section");
      });

      it("should parse multiple headings", () => {
        const markdown = "# Title\n\n## Subtitle\n\n### Section";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(3);
        expect(blocks[0].type).toBe("h1");
        expect(blocks[1].type).toBe("h2");
        expect(blocks[2].type).toBe("h3");
      });
    });

    describe("Paragraphs", () => {
      it("should parse simple paragraph", () => {
        const markdown = "This is a paragraph.";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("p");
        expect(blocks[0].content).toBe("This is a paragraph.");
      });

      it("should parse multiple paragraphs", () => {
        const markdown = "First paragraph.\n\nSecond paragraph.";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(2);
        expect(blocks[0].content).toBe("First paragraph.");
        expect(blocks[1].content).toBe("Second paragraph.");
      });

      it("should handle empty markdown", () => {
        const markdown = "";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("p");
        expect(blocks[0].content).toBe("");
      });
    });

    describe("Checkboxes", () => {
      it("should parse unchecked checkbox", () => {
        const markdown = "- [ ] Todo item";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("checkbox");
        expect(blocks[0].content).toBe("Todo item");
        expect(blocks[0].metadata?.status).toBe("todo");
      });

      it("should parse checked checkbox", () => {
        const markdown = "- [x] Done item";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("checkbox");
        expect(blocks[0].content).toBe("Done item");
        expect(blocks[0].metadata?.status).toBe("done");
      });

      it("should parse in-progress checkbox with [/]", () => {
        const markdown = "- [/] In progress";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("checkbox");
        expect(blocks[0].content).toBe("In progress");
        expect(blocks[0].metadata?.status).toBe("in_progress");
      });

      it("should parse multiple checkboxes", () => {
        const markdown = "- [ ] First\n- [x] Second\n- [/] Third";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(3);
        expect(blocks[0].metadata?.status).toBe("todo");
        expect(blocks[1].metadata?.status).toBe("done");
        expect(blocks[2].metadata?.status).toBe("in_progress");
      });
    });

    describe("Code blocks", () => {
      it("should parse code block without language", () => {
        const markdown = "```\nconst x = 1;\n```";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("code");
        expect(blocks[0].content).toBe("const x = 1;");
      });

      it("should parse code block with language", () => {
        const markdown = "```javascript\nconst x = 1;\n```";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("code");
        expect(blocks[0].content).toBe("const x = 1;");
        expect(blocks[0].metadata?.language).toBe("javascript");
      });

      it("should parse multi-line code block", () => {
        const markdown = '```python\ndef hello():\n    print("world")\n```';
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("code");
        expect(blocks[0].content).toContain("def hello()");
        expect(blocks[0].metadata?.language).toBe("python");
      });
    });

    describe("Blockquotes", () => {
      it("should parse simple blockquote", () => {
        const markdown = "> This is a quote";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("blockquote");
        expect(blocks[0].content).toContain("This is a quote");
      });

      it("should parse multi-line blockquote", () => {
        const markdown = "> Line one\n> Line two";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("blockquote");
      });
    });

    describe("Horizontal Rules", () => {
      it("should parse horizontal rule", () => {
        const markdown = "---";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(1);
        expect(blocks[0].type).toBe("hr");
        expect(blocks[0].content).toBe("");
      });
    });

    describe("Lists", () => {
      it("should parse unordered list", () => {
        const markdown = "- Item 1\n- Item 2";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(2);
        expect(blocks[0].type).toBe("ul");
        expect(blocks[0].content).toBe("Item 1");
        expect(blocks[1].type).toBe("ul");
        expect(blocks[1].content).toBe("Item 2");
      });

      it("should parse ordered list", () => {
        const markdown = "1. First\n2. Second";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks).toHaveLength(2);
        expect(blocks[0].type).toBe("ol");
        expect(blocks[1].type).toBe("ol");
      });
    });

    describe("Complex markdown", () => {
      it("should parse mixed content types", () => {
        const markdown = `# Title
Paragraph text
- [ ] Todo item
\`\`\`js
code
\`\`\`
> Quote`;

        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks.length).toBeGreaterThan(3);
        expect(blocks.some((b) => b.type === "h1")).toBe(true);
        expect(blocks.some((b) => b.type === "p")).toBe(true);
        expect(blocks.some((b) => b.type === "checkbox")).toBe(true);
        expect(blocks.some((b) => b.type === "code")).toBe(true);
        expect(blocks.some((b) => b.type === "blockquote")).toBe(true);
      });
    });

    describe("Block IDs", () => {
      it("should generate unique IDs for each block", () => {
        const markdown = "# Title\n\nParagraph\n\n## Subtitle";
        const blocks = parseMarkdownToBlocks(markdown);

        const ids = blocks.map((b) => b.id);
        const uniqueIds = new Set(ids);

        expect(uniqueIds.size).toBe(blocks.length);
      });

      it("should generate IDs with nanoid format", () => {
        const markdown = "Test";
        const blocks = parseMarkdownToBlocks(markdown);

        expect(blocks[0].id).toBeTruthy();
        expect(typeof blocks[0].id).toBe("string");
        expect(blocks[0].id.length).toBeGreaterThan(5);
      });
    });
  });

  describe("blocksToMarkdown", () => {
    describe("Headings", () => {
      it("should convert H1 block to markdown", () => {
        const blocks: EditorBlock[] = [{ id: "1", type: "h1", content: "Title" }];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("# Title");
      });

      it("should convert H2 block to markdown", () => {
        const blocks: EditorBlock[] = [{ id: "1", type: "h2", content: "Subtitle" }];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("## Subtitle");
      });

      it("should convert H3 block to markdown", () => {
        const blocks: EditorBlock[] = [{ id: "1", type: "h3", content: "Section" }];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("### Section");
      });
    });

    describe("Paragraphs", () => {
      it("should convert paragraph block to markdown", () => {
        const blocks: EditorBlock[] = [{ id: "1", type: "p", content: "Simple paragraph" }];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("Simple paragraph");
      });

      it("should separate multiple paragraphs with blank line", () => {
        const blocks: EditorBlock[] = [
          { id: "1", type: "p", content: "First" },
          { id: "2", type: "p", content: "Second" },
        ];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("First\n\nSecond");
      });
    });

    describe("Checkboxes", () => {
      it("should convert todo checkbox to markdown", () => {
        const blocks: EditorBlock[] = [
          { id: "1", type: "checkbox", content: "Todo", metadata: { status: "todo" } },
        ];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("- [ ] Todo");
      });

      it("should convert done checkbox to markdown", () => {
        const blocks: EditorBlock[] = [
          { id: "1", type: "checkbox", content: "Done", metadata: { status: "done" } },
        ];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("- [x] Done");
      });

      it("should convert in-progress checkbox to markdown", () => {
        const blocks: EditorBlock[] = [
          { id: "1", type: "checkbox", content: "Working", metadata: { status: "in_progress" } },
        ];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("- [/] Working");
      });

      it("should keep multiple checkboxes together", () => {
        const blocks: EditorBlock[] = [
          { id: "1", type: "checkbox", content: "First", metadata: { status: "todo" } },
          { id: "2", type: "checkbox", content: "Second", metadata: { status: "done" } },
        ];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("- [ ] First\n- [x] Second");
      });
    });

    describe("Code blocks", () => {
      it("should convert code block without language", () => {
        const blocks: EditorBlock[] = [{ id: "1", type: "code", content: "const x = 1;" }];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toContain("```");
        expect(markdown).toContain("const x = 1;");
      });

      it("should convert code block with language", () => {
        const blocks: EditorBlock[] = [
          { id: "1", type: "code", content: "const x = 1;", metadata: { language: "javascript" } },
        ];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toContain("```javascript");
        expect(markdown).toContain("const x = 1;");
      });
    });

    describe("Blockquotes", () => {
      it("should convert blockquote to markdown", () => {
        const blocks: EditorBlock[] = [{ id: "1", type: "blockquote", content: "Quote text" }];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("> Quote text");
      });
    });

    describe("Horizontal Rules", () => {
      it("should convert hr to markdown", () => {
        const blocks: EditorBlock[] = [{ id: "1", type: "hr", content: "" }];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("---");
      });
    });

    describe("Lists", () => {
      it("should convert unordered list to markdown", () => {
        const blocks: EditorBlock[] = [
          { id: "1", type: "ul", content: "Item 1" },
          { id: "2", type: "ul", content: "Item 2" },
        ];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("- Item 1\n- Item 2");
      });

      it("should convert ordered list to markdown", () => {
        const blocks: EditorBlock[] = [
          { id: "1", type: "ol", content: "First" },
          { id: "2", type: "ol", content: "Second" },
        ];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toBe("1. First\n1. Second");
      });
    });

    describe("Complex conversions", () => {
      it("should convert mixed content types", () => {
        const blocks: EditorBlock[] = [
          { id: "1", type: "h1", content: "Title" },
          { id: "2", type: "p", content: "Paragraph" },
          { id: "3", type: "checkbox", content: "Task", metadata: { status: "todo" } },
        ];

        const markdown = blocksToMarkdown(blocks);
        expect(markdown).toContain("# Title");
        expect(markdown).toContain("Paragraph");
        expect(markdown).toContain("- [ ] Task");
      });
    });
  });

  describe("Round-trip conversion", () => {
    it("should maintain content through parse and convert cycle", () => {
      const original = "# Title\n\nParagraph text.";
      const blocks = parseMarkdownToBlocks(original);
      const result = blocksToMarkdown(blocks);

      expect(result).toBe(original);
    });

    it("should maintain checkboxes through round trip", () => {
      const original = "- [ ] Todo\n- [x] Done";
      const blocks = parseMarkdownToBlocks(original);
      const result = blocksToMarkdown(blocks);

      // Note: [x] is preserved as [x], not [ ]
      expect(result).toContain("[ ]");
      expect(result).toContain("[x]");
    });

    it("should maintain code blocks through round trip", () => {
      const original = "```javascript\nconst x = 1;\n```";
      const blocks = parseMarkdownToBlocks(original);
      const result = blocksToMarkdown(blocks);

      expect(result).toContain("```javascript");
      expect(result).toContain("const x = 1;");
    });
  });
});
