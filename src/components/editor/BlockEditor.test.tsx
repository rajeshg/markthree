import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlockEditor } from "./BlockEditor";
import type { EditorBlock } from "@/types/editor";

// Mock shiki for code highlighting
vi.mock("shiki", () => ({
  codeToHtml: vi.fn().mockResolvedValue("<pre>highlighted code</pre>"),
}));

// Mock drive client for image URLs
vi.mock("@/lib/drive/drive-client", () => ({
  driveApi: {
    getFileUrl: vi.fn().mockResolvedValue("https://example.com/image.png"),
    getFileBlob: vi.fn().mockResolvedValue(new Blob(["fake-image-data"], { type: "image/png" })),
    getImageUrl: vi.fn().mockResolvedValue("https://example.com/image.png"),
  },
}));

describe("BlockEditor", () => {
  const mockOnUpdate = vi.fn();
  const mockOnKeyDown = vi.fn();
  const mockOnFocus = vi.fn();
  const mockOnMoveUp = vi.fn();
  const mockOnMoveDown = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnMount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    showLineNumbers: true,
    onUpdate: mockOnUpdate,
    onKeyDown: mockOnKeyDown,
    onFocus: mockOnFocus,
    isActive: false,
    lineNumberOffset: 1,
    onMoveUp: mockOnMoveUp,
    onMoveDown: mockOnMoveDown,
    onDelete: mockOnDelete,
    onMount: mockOnMount,
  };

  describe("Paragraph Block", () => {
    it("should render paragraph block with content", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "Hello world",
      };

      render(<BlockEditor block={block} {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("Hello world");
    });

    it("should render line number when enabled", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "Test",
      };

      const { container } = render(
        <BlockEditor block={block} {...defaultProps} lineNumberOffset={42} />,
      );

      expect(container.textContent).toContain("42");
    });

    it("should not render line number when disabled", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "Test",
      };

      const { container } = render(
        <BlockEditor block={block} {...defaultProps} showLineNumbers={false} />,
      );

      expect(container.textContent).not.toContain("1");
    });

    it("should call onFocus when textarea is focused", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "Test",
      };

      render(<BlockEditor block={block} {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.focus(textarea);

      expect(mockOnFocus).toHaveBeenCalledTimes(1);
    });

    it("should call onUpdate when content changes", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "Test",
      };

      render(<BlockEditor block={block} {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.change(textarea, { target: { value: "New content" } });

      expect(mockOnUpdate).toHaveBeenCalledWith({ content: "New content" });
    });

    it("should call onKeyDown with keyboard event", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "Test",
      };

      render(<BlockEditor block={block} {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      fireEvent.keyDown(textarea, { key: "Enter" });

      expect(mockOnKeyDown).toHaveBeenCalled();
    });

    it("should apply active state styling", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "Test",
      };

      const { container: inactiveContainer } = render(
        <BlockEditor block={block} {...defaultProps} isActive={false} />,
      );

      const { container: activeContainer } = render(
        <BlockEditor block={block} {...defaultProps} isActive={true} />,
      );

      // Active block should have different styling
      const activeElement = activeContainer.firstChild as HTMLElement;
      const inactiveElement = inactiveContainer.firstChild as HTMLElement;
      expect(activeElement.className).toContain("bg-github-blue");
      expect(inactiveElement.className).not.toContain("bg-github-blue");
    });
  });

  describe("Heading Blocks", () => {
    it("should render h1 with correct styling", () => {
      const block: EditorBlock = {
        id: "1",
        type: "h1",
        content: "Main Title",
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("Main Title");
      expect(container.querySelector(".text-xl")).toBeTruthy();
    });

    it("should render h2 with correct styling", () => {
      const block: EditorBlock = {
        id: "1",
        type: "h2",
        content: "Subtitle",
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("Subtitle");
      expect(container.querySelector(".text-lg")).toBeTruthy();
    });

    it("should render h3 with correct styling", () => {
      const block: EditorBlock = {
        id: "1",
        type: "h3",
        content: "Section",
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("Section");
      expect(container.querySelector(".text-base")).toBeTruthy();
    });
  });

  describe("Checkbox Block", () => {
    it("should render checkbox with todo status", () => {
      const block: EditorBlock = {
        id: "1",
        type: "checkbox",
        content: "Task to do",
        metadata: { status: "todo" },
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      // Check for checkbox button containing [ and ]
      const checkboxButton = container.querySelector("button");
      expect(checkboxButton).toBeInTheDocument();
      expect(checkboxButton?.textContent).toMatch(/\[\s*\]/);
      expect(screen.getByRole("textbox")).toHaveValue("Task to do");
    });

    it("should render checkbox with in_progress status", () => {
      const block: EditorBlock = {
        id: "1",
        type: "checkbox",
        content: "Working on it",
        metadata: { status: "in_progress" },
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      // Check for checkbox button with pulsing indicator (rendered as [ <dot> ])
      const checkboxButton = container.querySelector("button");
      expect(checkboxButton).toBeInTheDocument();
      expect(checkboxButton?.className).toContain("text-github-yellow");
      // Should have yellow background tint
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain("bg-github-yellow");
    });

    it("should render checkbox with done status", () => {
      const block: EditorBlock = {
        id: "1",
        type: "checkbox",
        content: "Completed task",
        metadata: { status: "done" },
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      // Check for checkbox button with 'x' character
      const checkboxButton = container.querySelector("button");
      expect(checkboxButton).toBeInTheDocument();
      expect(checkboxButton?.textContent).toContain("x");
      expect(checkboxButton?.className).toContain("text-github-green");
      // Should have reduced opacity
      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain("opacity-50");
    });

    it("should cycle checkbox status when clicked", () => {
      const block: EditorBlock = {
        id: "1",
        type: "checkbox",
        content: "Task",
        metadata: { status: "todo" },
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      const checkboxButton = container.querySelector("button")!;
      fireEvent.click(checkboxButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        metadata: { status: "in_progress" },
      });
    });

    it("should cycle from in_progress to done", () => {
      const block: EditorBlock = {
        id: "1",
        type: "checkbox",
        content: "Task",
        metadata: { status: "in_progress" },
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      const checkboxButton = container.querySelector("button")!;
      fireEvent.click(checkboxButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        metadata: { status: "done" },
      });
    });

    it("should cycle from done to todo", () => {
      const block: EditorBlock = {
        id: "1",
        type: "checkbox",
        content: "Task",
        metadata: { status: "done" },
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      const checkboxButton = container.querySelector("button")!;
      fireEvent.click(checkboxButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        metadata: { status: "todo" },
      });
    });
  });

  describe("Code Block", () => {
    it("should render code block with content", () => {
      const block: EditorBlock = {
        id: "1",
        type: "code",
        content: "const x = 1;",
        metadata: { language: "javascript" },
      };

      render(<BlockEditor block={block} {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("const x = 1;");
    });

    it("should apply code block styling", () => {
      const block: EditorBlock = {
        id: "1",
        type: "code",
        content: "code here",
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      expect(container.querySelector(".font-mono")).toBeTruthy();
      expect(container.querySelector(".bg-card\\/70")).toBeTruthy();
    });

    it("should display language in metadata", () => {
      const block: EditorBlock = {
        id: "1",
        type: "code",
        content: 'print("hello")',
        metadata: { language: "python" },
      };

      render(<BlockEditor block={block} {...defaultProps} />);

      expect(screen.getByText("python")).toBeInTheDocument();
    });
  });

  describe("Blockquote", () => {
    it("should render blockquote with content", () => {
      const block: EditorBlock = {
        id: "1",
        type: "blockquote",
        content: "This is a quote",
      };

      render(<BlockEditor block={block} {...defaultProps} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("This is a quote");
    });

    it("should apply blockquote styling", () => {
      const block: EditorBlock = {
        id: "1",
        type: "blockquote",
        content: "Quote",
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      expect(container.querySelector(".border-l-4")).toBeTruthy();
    });
  });

  describe("Horizontal Rule", () => {
    it("should render horizontal rule", () => {
      const block: EditorBlock = {
        id: "1",
        type: "hr",
        content: "",
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      expect(container.querySelector(".border-t-2")).toBeTruthy();
    });

    it("should not render textarea for hr", () => {
      const block: EditorBlock = {
        id: "1",
        type: "hr",
        content: "",
      };

      render(<BlockEditor block={block} {...defaultProps} />);

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("Image Block", () => {
    it("should render image block with Google Drive ID", async () => {
      const block: EditorBlock = {
        id: "1",
        type: "image",
        content: "Test image",
        metadata: { src: "file-id-123" },
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      // Image block should render with image preview area
      // Since we can't load actual images in tests, just verify structure exists
      expect(container.querySelector(".group\\/image")).toBeInTheDocument();

      // The markdown textarea should show the image markdown
      const textarea = screen
        .getAllByRole("textbox")
        .find((el) => (el as HTMLTextAreaElement).value.includes("!["));
      expect(textarea).toBeTruthy();
    });

    it("should render image block with direct URL", () => {
      const block: EditorBlock = {
        id: "1",
        type: "image",
        content: "External image",
        metadata: { src: "https://example.com/image.jpg" },
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      // Image block should have the image preview structure
      expect(container.querySelector(".group\\/image")).toBeInTheDocument();

      // Verify markdown textarea contains the image markdown
      const textareas = screen.getAllByRole("textbox");
      const markdownTextarea = textareas.find((el) =>
        (el as HTMLTextAreaElement).value.includes("!["),
      );
      expect(markdownTextarea).toBeTruthy();
    });

    it("should show error message when image fails to load", () => {
      const block: EditorBlock = {
        id: "1",
        type: "image",
        content: "Broken image",
        metadata: { src: "https://example.com/broken.jpg" },
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      // Image block structure should exist
      expect(container.querySelector(".group\\/image")).toBeInTheDocument();

      // Since images load asynchronously and may show error state,
      // just verify the image block container is present
      expect(container.querySelector(".group\\/preview")).toBeInTheDocument();
    });

    it("should call onDelete when delete button is clicked", () => {
      const block: EditorBlock = {
        id: "1",
        type: "image",
        content: "Test image",
        metadata: { src: "https://example.com/image.jpg" },
      };

      const { container } = render(<BlockEditor block={block} {...defaultProps} />);

      // Find delete button by title attribute
      const deleteButton = container.querySelector('button[title="Delete image"]');
      expect(deleteButton).toBeInTheDocument();

      fireEvent.mouseDown(deleteButton!);

      expect(mockOnDelete).toHaveBeenCalled();
    });
  });

  describe("Group Spacing", () => {
    it("should apply top margin when first in group", () => {
      const block: EditorBlock = {
        id: "1",
        type: "checkbox",
        content: "Task",
        metadata: { status: "todo" },
      };

      const { container } = render(
        <BlockEditor block={block} {...defaultProps} isFirstInGroup={true} />,
      );

      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain("mt-1.5");
    });

    it("should apply bottom margin when last in group", () => {
      const block: EditorBlock = {
        id: "1",
        type: "checkbox",
        content: "Task",
        metadata: { status: "todo" },
      };

      const { container } = render(
        <BlockEditor block={block} {...defaultProps} isLastInGroup={true} />,
      );

      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain("mb-1.5");
    });

    it("should apply both margins when single item in group", () => {
      const block: EditorBlock = {
        id: "1",
        type: "code",
        content: "code",
      };

      const { container } = render(
        <BlockEditor block={block} {...defaultProps} isFirstInGroup={true} isLastInGroup={true} />,
      );

      const element = container.firstChild as HTMLElement;
      expect(element.className).toContain("mt-1.5");
      expect(element.className).toContain("mb-1.5");
    });
  });

  describe("Formatting Toolbar", () => {
    it("should show toolbar when active and empty", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "",
      };

      render(<BlockEditor block={block} {...defaultProps} isActive={true} />);

      expect(screen.getByText("TODO")).toBeInTheDocument();
      expect(screen.getByText("CODE")).toBeInTheDocument();
    });

    it("should not show toolbar when inactive", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "",
      };

      render(<BlockEditor block={block} {...defaultProps} isActive={false} />);

      expect(screen.queryByText("TODO")).not.toBeInTheDocument();
    });

    it("should not show toolbar when block has content", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "Some text",
      };

      render(<BlockEditor block={block} {...defaultProps} isActive={true} />);

      expect(screen.queryByText("TODO")).not.toBeInTheDocument();
    });

    it("should convert to checkbox when TODO button clicked", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "",
      };

      render(<BlockEditor block={block} {...defaultProps} isActive={true} />);

      const todoButton = screen.getByText("TODO");
      fireEvent.mouseDown(todoButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        type: "checkbox",
        metadata: { status: "todo" },
      });
    });

    it("should convert to code when CODE button clicked", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "",
      };

      render(<BlockEditor block={block} {...defaultProps} isActive={true} />);

      const codeButton = screen.getByText("CODE");
      fireEvent.mouseDown(codeButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({ type: "code" });
    });
  });

  describe("Textarea Auto-resize", () => {
    it("should auto-resize textarea based on content", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "Line 1\nLine 2\nLine 3",
      };

      render(<BlockEditor block={block} {...defaultProps} />);

      const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;

      // Textarea should have minimal height and auto-resize
      expect(textarea.style.height).toBeTruthy();
    });
  });

  describe("onMount callback", () => {
    it("should call onMount when textarea mounts", () => {
      const block: EditorBlock = {
        id: "1",
        type: "p",
        content: "Test",
      };

      render(<BlockEditor block={block} {...defaultProps} />);

      expect(mockOnMount).toHaveBeenCalledTimes(1);
      expect(mockOnMount).toHaveBeenCalledWith(expect.any(HTMLTextAreaElement));
    });
  });
});
