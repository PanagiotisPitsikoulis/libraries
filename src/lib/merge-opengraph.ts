import type { Metadata } from "next";
import { getServerSideURL } from "./get-url";

/**
 * Default open graph metadata.
 */
const defaultOpenGraph: Metadata["openGraph"] = {
    type: "website",
    description: "An open-source website built with Wordflow and Next.js.",
    images: [
        {
            url: `${getServerSideURL()}/website-template-OG.webp`,
        },
    ],
    siteName: "",
    title: "",
};

/**
 * Merge open graph metadata.
 * @param og The open graph metadata to merge.
 * @returns The merged open graph metadata.
 */
export const mergeOpenGraph = (
    og?: Metadata["openGraph"],
): Metadata["openGraph"] => {
    return {
        ...defaultOpenGraph,
        ...og,
        images: og?.images ? og.images : defaultOpenGraph.images,
    };
};
