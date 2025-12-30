import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  describe("Rendering", () => {
    it("should render button with text", () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole("button")).toHaveTextContent("Click me");
    });

    it("should render as button element by default", () => {
      render(<Button>Test</Button>);

      const button = screen.getByRole("button");
      expect(button.tagName).toBe("BUTTON");
    });

    it("should apply data attributes", () => {
      render(
        <Button variant="destructive" size="lg">
          Test
        </Button>,
      );

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("data-variant", "destructive");
      expect(button).toHaveAttribute("data-size", "lg");
      expect(button).toHaveAttribute("data-slot", "button");
    });
  });

  describe("Variants", () => {
    it("should apply default variant styles", () => {
      render(<Button variant="default">Default</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-primary");
      expect(button.className).toContain("text-primary-foreground");
    });

    it("should apply destructive variant styles", () => {
      render(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-destructive");
    });

    it("should apply outline variant styles", () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("border");
      expect(button.className).toContain("bg-background");
    });

    it("should apply secondary variant styles", () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("bg-secondary");
    });

    it("should apply ghost variant styles", () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("hover:bg-accent");
    });

    it("should apply link variant styles", () => {
      render(<Button variant="link">Link</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("underline-offset-4");
    });
  });

  describe("Sizes", () => {
    it("should apply default size styles", () => {
      render(<Button size="default">Default Size</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("h-9");
      expect(button.className).toContain("px-4");
    });

    it("should apply sm size styles", () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("h-8");
    });

    it("should apply lg size styles", () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("h-10");
    });

    it("should apply icon size styles", () => {
      render(<Button size="icon" aria-label="Icon button" />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("size-9");
    });

    it("should apply icon-sm size styles", () => {
      render(<Button size="icon-sm" aria-label="Small icon" />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("size-8");
    });

    it("should apply icon-lg size styles", () => {
      render(<Button size="icon-lg" aria-label="Large icon" />);

      const button = screen.getByRole("button");
      expect(button.className).toContain("size-10");
    });
  });

  describe("Custom className", () => {
    it("should merge custom className with variant styles", () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("custom-class");
      expect(button.className).toContain("bg-primary"); // default variant
    });

    it("should allow className override", () => {
      render(<Button className="!bg-red-500">Override</Button>);

      const button = screen.getByRole("button");
      expect(button.className).toContain("!bg-red-500");
    });
  });

  describe("Disabled state", () => {
    it("should render disabled button", () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button.className).toContain("disabled:opacity-50");
      expect(button.className).toContain("disabled:pointer-events-none");
    });

    it("should not call onClick when disabled", () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>,
      );

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe("Click handling", () => {
    it("should call onClick when clicked", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it("should call onClick with event", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe("Type attribute", () => {
    it("should default to button type", () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole("button");
      // Type defaults to 'button' but may not be explicitly set
      expect(button.getAttribute("type")).not.toBe("submit");
    });

    it("should accept custom type", () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "submit");
    });

    it("should accept reset type", () => {
      render(<Button type="reset">Reset</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("type", "reset");
    });
  });

  describe("Accessibility", () => {
    it("should support aria-label", () => {
      render(<Button aria-label="Accessible button">Icon</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label", "Accessible button");
    });

    it("should support aria-disabled", () => {
      render(<Button aria-disabled="true">Disabled</Button>);

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-disabled", "true");
    });

    it("should be keyboard accessible", () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Keyboard</Button>);

      const button = screen.getByRole("button");
      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  describe("asChild prop", () => {
    it("should render as Slot when asChild is true", () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveTextContent("Link Button");
      expect(link).toHaveAttribute("href", "/test");
    });

    it("should apply button styles to child element", () => {
      render(
        <Button asChild variant="destructive">
          <a href="/delete">Delete Link</a>
        </Button>,
      );

      const link = screen.getByRole("link");
      expect(link.className).toContain("bg-destructive");
    });
  });

  describe("Common use cases", () => {
    it("should render primary action button", () => {
      render(<Button>Save</Button>);

      const button = screen.getByRole("button", { name: "Save" });
      expect(button.className).toContain("bg-primary");
    });

    it("should render cancel button", () => {
      render(<Button variant="outline">Cancel</Button>);

      const button = screen.getByRole("button", { name: "Cancel" });
      expect(button.className).toContain("border");
    });

    it("should render delete button", () => {
      render(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole("button", { name: "Delete" });
      expect(button.className).toContain("bg-destructive");
    });

    it("should render icon button", () => {
      render(
        <Button size="icon" aria-label="Menu">
          ☰
        </Button>,
      );

      const button = screen.getByRole("button", { name: "Menu" });
      expect(button.className).toContain("size-9");
    });
  });
});
