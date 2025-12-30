import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useEditor } from "./useEditor";
import React from "react";

// Test wrapper component that uses the hook and renders its state
function TestHarness({
  initialMarkdown = "",
  hookRef,
}: {
  initialMarkdown?: string;
  hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null>;
}) {
  const hook = useEditor(initialMarkdown);

  // Always keep the ref updated with latest hook values
  hookRef.current = hook;

  return (
    <div data-testid="harness">
      <div data-testid="block-count">{hook.state.blocks.length}</div>
      <div data-testid="is-dirty">{String(hook.state.isDirty)}</div>
      <div data-testid="active-block">{hook.state.activeBlockId || "none"}</div>
      {hook.state.blocks.map((block, idx) => (
        <div key={block.id} data-testid={`block-${idx}`}>
          <span data-testid={`block-${idx}-type`}>{block.type}</span>
          <span data-testid={`block-${idx}-content`}>{block.content}</span>
          {block.metadata && (
            <span data-testid={`block-${idx}-metadata`}>{JSON.stringify(block.metadata)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

describe("useEditor", () => {
  describe("initialization", () => {
    it("should initialize with empty markdown", () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness hookRef={hookRef} />);

      expect(hookRef.current).not.toBeNull();
      expect(hookRef.current!.state.blocks).toHaveLength(1);
      expect(hookRef.current!.state.blocks[0].type).toBe("p");
      expect(hookRef.current!.state.blocks[0].content).toBe("");
      expect(hookRef.current!.state.isDirty).toBe(false);
    });

    it("should parse initial markdown into blocks", () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };
      const markdown = "# Hello\n\nThis is a paragraph.";

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      expect(hookRef.current).not.toBeNull();
      expect(screen.getByTestId("block-0-type")).toHaveTextContent("h1");
      expect(screen.getByTestId("block-0-content")).toHaveTextContent("Hello");
      expect(screen.getByTestId("block-1-type")).toHaveTextContent("p");
      expect(screen.getByTestId("block-1-content")).toHaveTextContent("This is a paragraph.");
    });

    it("should parse complex markdown with multiple block types", () => {
      const markdown = `# Title
## Subtitle
This is text.
- [ ] Todo item
\`\`\`javascript
const x = 1;
\`\`\`
> Quote`;

      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };
      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      expect(hookRef.current!.state.blocks).toHaveLength(6);
      expect(hookRef.current!.state.blocks[0].type).toBe("h1");
      expect(hookRef.current!.state.blocks[1].type).toBe("h2");
      expect(hookRef.current!.state.blocks[2].type).toBe("p");
      expect(hookRef.current!.state.blocks[3].type).toBe("checkbox");
      expect(hookRef.current!.state.blocks[4].type).toBe("code");
      expect(hookRef.current!.state.blocks[5].type).toBe("blockquote");
    });
  });

  describe("updateBlock", () => {
    it("should update block content", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="# Hello" hookRef={hookRef} />);

      const blockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.updateBlock(blockId, { content: "Updated" });
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks[0].content).toBe("Updated");
        expect(hookRef.current!.state.isDirty).toBe(true);
      });
    });

    it("should update block type", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="Hello" hookRef={hookRef} />);

      const blockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.updateBlock(blockId, { type: "h1" });
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks[0].type).toBe("h1");
        expect(hookRef.current!.state.isDirty).toBe(true);
      });
    });

    it("should update checkbox metadata", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="- [ ] Todo" hookRef={hookRef} />);

      const blockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.updateBlock(blockId, {
          metadata: { status: "done" },
        });
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks[0].metadata?.status).toBe("done");
      });
    });
  });

  describe("addBlock", () => {
    it("should add block at the end when afterId is null", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="# Title" hookRef={hookRef} />);

      React.act(() => {
        hookRef.current!.addBlock("p", null);
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks).toHaveLength(2);
        expect(hookRef.current!.state.blocks[1].type).toBe("p");
        expect(hookRef.current!.state.isDirty).toBe(true);
      });
    });

    it("should add block after specific block", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `# Title

Paragraph`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const firstBlockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.addBlock("h2", firstBlockId);
      });

      await waitFor(() => {
        // Check DOM is updated
        expect(screen.getByTestId("block-count")).toHaveTextContent("3");
      });

      // Then check hook ref
      expect(hookRef.current!.state.blocks).toHaveLength(3);
      expect(hookRef.current!.state.blocks[1].type).toBe("h2");
      expect(hookRef.current!.state.blocks[2].type).toBe("p");
    });

    it("should add checkbox with default metadata", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="Test" hookRef={hookRef} />);

      React.act(() => {
        hookRef.current!.addBlock("checkbox");
      });

      await waitFor(() => {
        const checkboxBlock = hookRef.current!.state.blocks.find((b) => b.type === "checkbox");
        expect(checkboxBlock?.metadata?.status).toBe("todo");
      });
    });

    it("should set new block as active", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="Test" hookRef={hookRef} />);

      React.act(() => {
        hookRef.current!.addBlock("p");
      });

      await waitFor(() => {
        const newBlock = hookRef.current!.state.blocks[hookRef.current!.state.blocks.length - 1];
        expect(hookRef.current!.state.activeBlockId).toBe(newBlock.id);
      });
    });
  });

  describe("removeBlock", () => {
    it("should remove block and focus previous", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `# Title

Paragraph

Another`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const secondBlockId = hookRef.current!.state.blocks[1].id;
      const firstBlockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.removeBlock(secondBlockId);
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks).toHaveLength(2);
        expect(hookRef.current!.state.activeBlockId).toBe(firstBlockId);
        expect(hookRef.current!.state.isDirty).toBe(true);
      });
    });

    it("should not remove if only one block remains", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="Only block" hookRef={hookRef} />);

      const blockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.removeBlock(blockId);
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks).toHaveLength(1);
      });
    });

    it("should focus first block when removing first of many", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `First

Second

Third`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const firstBlockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.removeBlock(firstBlockId);
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks).toHaveLength(2);
        expect(hookRef.current!.state.blocks[0].content).toBe("Second");
      });
    });
  });

  describe("mergeWithPrevious", () => {
    it("should merge block content with previous", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `First

Second`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const secondBlockId = hookRef.current!.state.blocks[1].id;
      const firstBlockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.mergeWithPrevious(secondBlockId);
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks).toHaveLength(1);
        expect(hookRef.current!.state.blocks[0].content).toBe("FirstSecond");
        expect(hookRef.current!.state.activeBlockId).toBe(firstBlockId);
      });
    });

    it("should not merge first block", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `First

Second`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const firstBlockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.mergeWithPrevious(firstBlockId);
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks).toHaveLength(2);
      });
    });

    it("should merge blocks with different content lengths", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `Short

This is a much longer second block`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const secondBlockId = hookRef.current!.state.blocks[1].id;

      React.act(() => {
        hookRef.current!.mergeWithPrevious(secondBlockId);
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks[0].content).toBe(
          "ShortThis is a much longer second block",
        );
      });
    });
  });

  describe("moveBlock", () => {
    it("should move block up", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `First

Second

Third`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const secondBlockId = hookRef.current!.state.blocks[1].id;

      React.act(() => {
        hookRef.current!.moveBlock(secondBlockId, "up");
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks[0].content).toBe("Second");
        expect(hookRef.current!.state.blocks[1].content).toBe("First");
        expect(hookRef.current!.state.blocks[2].content).toBe("Third");
      });
    });

    it("should move block down", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `First

Second

Third`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const firstBlockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.moveBlock(firstBlockId, "down");
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks[0].content).toBe("Second");
        expect(hookRef.current!.state.blocks[1].content).toBe("First");
      });
    });

    it("should not move first block up", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `First

Second`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const firstBlockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.moveBlock(firstBlockId, "up");
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks[0].content).toBe("First");
      });
    });

    it("should not move last block down", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `First

Second`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const lastBlockId = hookRef.current!.state.blocks[1].id;

      React.act(() => {
        hookRef.current!.moveBlock(lastBlockId, "down");
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks[1].content).toBe("Second");
      });
    });

    it("should mark state as dirty when moving", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `First

Second`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const firstBlockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.moveBlock(firstBlockId, "down");
      });

      await waitFor(() => {
        expect(hookRef.current!.state.isDirty).toBe(true);
      });
    });
  });

  describe("getMarkdown", () => {
    it("should convert blocks back to markdown", () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };
      const markdown = "# Title\n\nParagraph text.";

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const output = hookRef.current!.getMarkdown();

      expect(output).toBe(markdown);
    });

    it("should handle complex markdown conversion", () => {
      const markdown = `# Title
## Subtitle
Paragraph
- [ ] Todo
\`\`\`js
code
\`\`\`
> Quote`;

      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };
      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const output = hookRef.current!.getMarkdown();

      // blocksToMarkdown normalizes markdown with proper spacing:
      // - Headings, blockquotes, code blocks get double newlines (\n\n)
      // - List items get single newline (\n)
      // - Extra newline added after list when followed by non-list block
      // - Result is trimmed at the end
      const expected = `# Title

## Subtitle

Paragraph

- [ ] Todo

\`\`\`js
code
\`\`\`

> Quote`;

      expect(output).toBe(expected);
    });
  });

  describe("resetEditor", () => {
    it("should reset editor with new markdown", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="Original" hookRef={hookRef} />);

      React.act(() => {
        hookRef.current!.updateBlock(hookRef.current!.state.blocks[0].id, {
          content: "Modified",
        });
      });

      await waitFor(() => {
        expect(hookRef.current!.state.isDirty).toBe(true);
      });

      React.act(() => {
        hookRef.current!.resetEditor("# New Content");
      });

      await waitFor(() => {
        expect(hookRef.current!.state.blocks).toHaveLength(1);
        expect(hookRef.current!.state.blocks[0].type).toBe("h1");
        expect(hookRef.current!.state.blocks[0].content).toBe("New Content");
        expect(hookRef.current!.state.isDirty).toBe(false);
        expect(hookRef.current!.state.lastSaved).toBeInstanceOf(Date);
      });
    });

    it("should set activeBlockId to last block when focusLast is true", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="First" hookRef={hookRef} />);

      React.act(() => {
        hookRef.current!.resetEditor("First\n\nSecond\n\nThird", { focusLast: true });
      });

      await waitFor(() => {
        const lastBlockId = hookRef.current!.state.blocks[2].id;
        expect(hookRef.current!.state.activeBlockId).toBe(lastBlockId);
      });
    });

    it("should set activeBlockId to null when focusLast is false", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="First" hookRef={hookRef} />);

      React.act(() => {
        hookRef.current!.resetEditor("First\n\nSecond", { focusLast: false });
      });

      await waitFor(() => {
        expect(hookRef.current!.state.activeBlockId).toBeNull();
      });
    });
  });

  describe("setActiveBlock", () => {
    it("should set active block", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      const markdown = `First

Second`;

      render(<TestHarness initialMarkdown={markdown} hookRef={hookRef} />);

      const blockId = hookRef.current!.state.blocks[1].id;

      React.act(() => {
        hookRef.current!.setActiveBlock(blockId);
      });

      await waitFor(() => {
        expect(hookRef.current!.state.activeBlockId).toBe(blockId);
      });
    });

    it("should clear active block when set to null", async () => {
      const hookRef: React.MutableRefObject<ReturnType<typeof useEditor> | null> = {
        current: null,
      };

      render(<TestHarness initialMarkdown="Test" hookRef={hookRef} />);

      const blockId = hookRef.current!.state.blocks[0].id;

      React.act(() => {
        hookRef.current!.setActiveBlock(blockId);
      });

      await waitFor(() => {
        expect(hookRef.current!.state.activeBlockId).toBe(blockId);
      });

      React.act(() => {
        hookRef.current!.setActiveBlock(null);
      });

      await waitFor(() => {
        expect(hookRef.current!.state.activeBlockId).toBeNull();
      });
    });
  });
});
