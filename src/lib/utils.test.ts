import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  describe("Basic functionality", () => {
    it("should merge single class name", () => {
      const result = cn("text-red-500");
      expect(result).toBe("text-red-500");
    });

    it("should merge multiple class names", () => {
      const result = cn("text-red-500", "bg-blue-500", "p-4");
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-500");
      expect(result).toContain("p-4");
    });

    it("should handle empty strings", () => {
      const result = cn("", "text-red-500", "");
      expect(result).toBe("text-red-500");
    });

    it("should handle undefined and null", () => {
      const result = cn(undefined, "text-red-500", null);
      expect(result).toBe("text-red-500");
    });

    it("should handle no arguments", () => {
      const result = cn();
      expect(result).toBe("");
    });
  });

  describe("Conditional classes", () => {
    it("should handle boolean conditions", () => {
      const isActive = true;
      const result = cn("base", isActive && "active");
      expect(result).toContain("base");
      expect(result).toContain("active");
    });

    it("should exclude false conditions", () => {
      const isActive = false;
      const result = cn("base", isActive && "active");
      expect(result).toBe("base");
      expect(result).not.toContain("active");
    });

    it("should handle ternary operators", () => {
      const variant = "primary";
      const result = cn("base", variant === "primary" ? "bg-blue-500" : "bg-gray-500");
      expect(result).toContain("base");
      expect(result).toContain("bg-blue-500");
      expect(result).not.toContain("bg-gray-500");
    });
  });

  describe("Array inputs", () => {
    it("should handle array of class names", () => {
      const result = cn(["text-red-500", "bg-blue-500"]);
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-500");
    });

    it("should handle nested arrays", () => {
      const result = cn(["text-red-500", ["bg-blue-500", "p-4"]]);
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-500");
      expect(result).toContain("p-4");
    });
  });

  describe("Object inputs (clsx style)", () => {
    it("should handle object with boolean values", () => {
      const result = cn({
        "text-red-500": true,
        "bg-blue-500": false,
        "p-4": true,
      });
      expect(result).toContain("text-red-500");
      expect(result).not.toContain("bg-blue-500");
      expect(result).toContain("p-4");
    });

    it("should handle mixed inputs", () => {
      const result = cn("base", { active: true, disabled: false }, "extra");
      expect(result).toContain("base");
      expect(result).toContain("active");
      expect(result).not.toContain("disabled");
      expect(result).toContain("extra");
    });
  });

  describe("Tailwind merge behavior", () => {
    it("should merge conflicting Tailwind classes (last wins)", () => {
      const result = cn("p-4", "p-8");
      expect(result).toBe("p-8");
      expect(result).not.toContain("p-4");
    });

    it("should merge conflicting text sizes", () => {
      const result = cn("text-sm", "text-lg");
      expect(result).toBe("text-lg");
      expect(result).not.toContain("text-sm");
    });

    it("should merge conflicting background colors", () => {
      const result = cn("bg-red-500", "bg-blue-500");
      expect(result).toBe("bg-blue-500");
      expect(result).not.toContain("bg-red-500");
    });

    it("should keep non-conflicting classes", () => {
      const result = cn("text-red-500", "bg-blue-500", "p-4");
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-500");
      expect(result).toContain("p-4");
    });

    it("should handle responsive prefixes", () => {
      const result = cn("p-4", "md:p-8", "lg:p-12");
      expect(result).toContain("p-4");
      expect(result).toContain("md:p-8");
      expect(result).toContain("lg:p-12");
    });

    it("should merge same property with different modifiers", () => {
      const result = cn("hover:bg-red-500", "hover:bg-blue-500");
      expect(result).toBe("hover:bg-blue-500");
      expect(result).not.toContain("hover:bg-red-500");
    });
  });

  describe("Real-world use cases", () => {
    it("should work with button variant pattern", () => {
      type Variant = "primary" | "secondary";
      type Size = "sm" | "lg";

      const variant = "primary" as Variant;
      const size = "lg" as Size;
      const disabled = false;

      const result = cn(
        "inline-flex items-center justify-center",
        variant === "primary" && "bg-blue-500 text-white",
        variant === "secondary" && "bg-gray-500 text-white",
        size === "sm" && "px-2 py-1",
        size === "lg" && "px-6 py-3",
        disabled && "opacity-50 cursor-not-allowed",
      );

      expect(result).toContain("inline-flex");
      expect(result).toContain("bg-blue-500");
      expect(result).toContain("px-6");
      expect(result).not.toContain("opacity-50");
    });

    it("should work with conditional active state", () => {
      const isActive = true;
      const result = cn(
        "py-2 px-4",
        isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700",
      );

      expect(result).toContain("py-2");
      expect(result).toContain("bg-blue-500");
      expect(result).toContain("text-white");
      expect(result).not.toContain("bg-gray-200");
    });

    it("should handle dynamic class merging", () => {
      const baseClasses = "rounded border";
      const variantClasses = "bg-red-500 text-white";
      const customClasses = "shadow-lg";

      const result = cn(baseClasses, variantClasses, customClasses);

      expect(result).toContain("rounded");
      expect(result).toContain("border");
      expect(result).toContain("bg-red-500");
      expect(result).toContain("text-white");
      expect(result).toContain("shadow-lg");
    });

    it("should handle override pattern", () => {
      const defaultClasses = "px-4 py-2 bg-blue-500";
      const overrideClasses = "px-6 bg-red-500";

      const result = cn(defaultClasses, overrideClasses);

      expect(result).not.toContain("px-4");
      expect(result).toContain("px-6");
      expect(result).not.toContain("bg-blue-500");
      expect(result).toContain("bg-red-500");
      expect(result).toContain("py-2"); // Not overridden
    });
  });

  describe("Edge cases", () => {
    it("should handle very long class strings", () => {
      const longClasses = Array(100).fill("m-1").join(" ");
      const result = cn(longClasses);
      expect(result).toBe("m-1");
    });

    it("should handle special characters in non-Tailwind classes", () => {
      const result = cn("custom-class_123", "another.class");
      expect(result).toContain("custom-class_123");
      expect(result).toContain("another.class");
    });

    it("should handle whitespace variations", () => {
      const result = cn("  text-red-500  ", "  bg-blue-500  ");
      expect(result).toContain("text-red-500");
      expect(result).toContain("bg-blue-500");
    });
  });
});
