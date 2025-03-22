import canUseDOM from "./canUseDom";

/**
 * Get the server-side URL.
 * @returns The server-side URL.
 */
export const getServerSideURL = () => {
    let url = process.env.NEXT_PUBLIC_SERVER_URL;

    if (!url && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }

    if (!url) {
        url = "http://localhost:3000";
    }

    return url;
};

/**
 * Get the client-side URL.
 * @returns The client-side URL.
 */
export const getClientSideURL = () => {
    if (canUseDOM) {
        const protocol = window.location.protocol;
        const domain = window.location.hostname;
        const port = window.location.port;

        return `${protocol}//${domain}${port ? `:${port}` : ""}`;
    }

    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
        return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    }

    return process.env.NEXT_PUBLIC_SERVER_URL || "";
};
