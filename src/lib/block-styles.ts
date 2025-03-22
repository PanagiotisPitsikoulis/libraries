/**
 * Styling utilities for block-level components.
 */
import { cn } from "@/lib/utils";

/**
 * Standard padding values.
 */
export const blockPadding = "py-8";

/**
 * Block-level style configurations for sections, headings, text, and containers.
 */
export const blockStyles = {
    section: {
        base: blockPadding,
        hero: "py-16 md:py-24",
        feature: "py-16 md:py-32",
        compact: "py-4 md:py-6",
        trusted: cn(blockPadding, "-mt-8"),
    },
    heading: {
        h1: "text-4xl font-bold leading-tighter lg:text-5xl xl:text-7xl",
        h2: "text-3xl font-bold leading-tight lg:text-4xl",
        h3: "text-2xl font-bold leading-tight lg:text-2xl",
        h4: "text-xl font-bold leading-tight",
    },
    text: {
        large:
            "text-xl leading-relaxed text-muted-foreground xl:text-xl line-clamp-4",
        base: "text-lg leading-relaxed text-muted-foreground max-w-2xl",
        small: "text-base leading-normal text-muted-foreground",
    },
    container: {
        base: "container",
        sm: "container max-w-2xl",
        md: "container max-w-4xl",
        lg: "container max-w-6xl",
    },
    card: {
        base: "rounded-lg border bg-card",
        padding: {
            base: "p-6",
            large: "p-8",
        },
        hover: "hover:bg-accent/50 transition-colors",
    },
    grid: {
        base: "grid gap-6 md:gap-8",
        cols: {
            2: "md:grid-cols-2",
            3: "md:grid-cols-2 lg:grid-cols-3",
            4: "md:grid-cols-2 lg:grid-cols-4",
        },
    },
};
