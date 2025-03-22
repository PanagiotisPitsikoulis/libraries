import type { Metadata } from "next";

import { getServerSideURL } from "./get-url";
import { mergeOpenGraph } from "./merge-opengraph";

export const getImageURL = (
    image?: any,
) => {
    const serverUrl = getServerSideURL();

    let url = `${serverUrl}/website-template-OG.webp`;

    if (image && typeof image === "object" && "url" in image) {
        const ogUrl = image.sizes?.og?.url;

        url = ogUrl ? serverUrl + ogUrl : serverUrl + image.url;
    }

    return url;
};

export const generateMeta = async (args: {
    doc: any;
}): Promise<Metadata> => {
    const { doc } = args;

    const ogImage = getImageURL(doc?.meta?.image);

    const title = doc?.meta?.title || "Page";

    return {
        description: doc?.meta?.description,
        openGraph: mergeOpenGraph({
            description: doc?.meta?.description || "",
            images: ogImage
                ? [
                    {
                        url: ogImage,
                    },
                ]
                : undefined,
            title,
            url: Array.isArray(doc?.slug) ? doc?.slug.join("/") : "/",
        }),
        title,
    };
};
