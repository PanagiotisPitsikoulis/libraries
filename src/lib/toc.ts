// @ts-nocheck
import { toc } from "mdast-util-toc";
import { remark } from "remark";
import { visit } from "unist-util-visit";

const textTypes = ["text", "emphasis", "strong", "inlineCode"];

/**
 * Flatten a node.
 * @param node The node to flatten.
 * @returns The flattened node.
 */
function flattenNode(node) {
    const p = [];
    visit(node, (node) => {
        if (!textTypes.includes(node.type)) return;
        p.push(node.value);
    });
    return p.join("");
}

/**
 * Item interface.
 */
interface Item {
    title: string;
    url: string;
    items?: Item[];
}

/**
 * Items interface.
 */
interface Items {
    items?: Item[];
}

/**
 * Get items.
 * @param node The node to get items from.
 * @param current The current items.
 * @returns The items.
 */
function getItems(node, current): Items {
    if (!node) {
        return {};
    }

    if (node.type === "paragraph") {
        visit(node, (item) => {
            if (item.type === "link") {
                current.url = item.url;
                current.title = flattenNode(node);
            }

            if (item.type === "text") {
                current.title = flattenNode(node);
            }
        });

        return current;
    }

    if (node.type === "list") {
        current.items = node.children.map((i) => getItems(i, {}));

        return current;
    }
    if (node.type === "listItem") {
        const heading = getItems(node.children[0], {});

        if (node.children.length > 1) {
            getItems(node.children[1], heading);
        }

        return heading;
    }

    return {};
}

/**
 * Get table of contents.
 * @param node The node to get table of contents from.
 * @param file The file to get table of contents from.
 * @returns The table of contents.
 */
const getToc = () => (node, file) => {
    const table = toc(node);
    file.data = getItems(table.map, {});
};

export type TableOfContents = Items;

export async function getTableOfContents(
    content: string,
): Promise<TableOfContents> {
    const result = await remark().use(getToc).process(content);

    return result.data;
}
