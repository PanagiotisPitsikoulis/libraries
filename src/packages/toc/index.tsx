"use client";

import * as React from "react";

import { ArrowUp } from "lucide-react";
import { Button } from "../../components/ui/button";
import canUseDOM from "../../lib/canUseDom";
import type { TableOfContents as TableOfContentsType } from "../../lib/toc";
import { cn, encodeId } from "../../lib/utils";
import { useMounted } from "../hooks/use-mounted";

interface TocProps {
	toc: TableOfContentsType;
}

export function TableOfContents({ toc }: TocProps) {
	const itemIds = React.useMemo(
		() =>
			toc.items
				? toc.items
						.flatMap((item) => [item.url, item?.items?.map((item) => item.url)])
						.flat()
						.filter(Boolean)
						.map((id) => id?.split("#")[1])
						.map((id) => id && encodeId(id))
				: [],
		[toc],
	);
	const activeHeading = useActiveItem(itemIds);
	const mounted = useMounted();

	if (!toc?.items) {
		return null;
	}

	return mounted ? (
		<div className="space-y-1">
			<Button
				variant="ghost"
				size="icon"
				onClick={() => {
					if (!canUseDOM) return;
					window.scrollTo({ top: 0, behavior: "smooth" });
				}}
			>
				<ArrowUp className="h-2 w-2" />
				<span className="sr-only">Back to top</span>
			</Button>
			<Tree tree={toc} activeItem={activeHeading} />
		</div>
	) : null;
}

export function useActiveItem(itemIds: (string | undefined)[]) {
	const [activeId, setActiveId] = React.useState<string>("");

	React.useEffect(() => {
		if (!itemIds?.length) return;

		const observer = new IntersectionObserver(
			(entries) => {
				// Get all entries that are currently intersecting
				const visibleEntries = entries.filter((entry) => entry.isIntersecting);

				// If we have visible entries, update the active ID to the first one
				if (visibleEntries.length > 0) {
					// Sort by Y position to get the topmost visible heading
					const sortedEntries = visibleEntries.sort((a, b) => {
						const aRect = a.boundingClientRect;
						const bRect = b.boundingClientRect;
						return aRect.top - bRect.top;
					});

					const firstEntry = sortedEntries[0];
					if (firstEntry?.target.id) {
						setActiveId(firstEntry.target.id);
					}
				} else {
					// If no entries are visible, find the last heading that's above the viewport
					const entry = entries.reduce(
						(nearest, entry) => {
							if (entry.boundingClientRect.top <= 0) {
								if (
									!nearest ||
									nearest.boundingClientRect.top <= entry.boundingClientRect.top
								) {
									return entry;
								}
							}
							return nearest;
						},
						null as IntersectionObserverEntry | null,
					);

					if (entry?.target.id) {
						setActiveId(entry.target.id);
					}
				}
			},
			{
				// Start observing slightly before the element enters the viewport
				rootMargin: "-20% 0px -35% 0px",
				threshold: [0, 1],
			},
		);

		// Function to check active heading
		const checkActiveHeading = () => {
			const elements = itemIds
				.map((id) => (id ? document.getElementById(id) : null))
				.filter((el): el is HTMLElement => el !== null);

			if (elements.length === 0) return;

			const windowHeight = window.innerHeight;
			let activeElement = elements[0];
			let minDistance = Number.POSITIVE_INFINITY;

			for (const element of elements) {
				const rect = element.getBoundingClientRect();
				const distance = Math.abs(rect.top - windowHeight * 0.3);
				if (distance < minDistance) {
					minDistance = distance;
					activeElement = element;
				}
			}

			if (activeElement?.id) {
				setActiveId(activeElement.id);
			}
		};

		// Observe all section headings
		for (const id of itemIds) {
			if (!id) continue;
			const element = document.getElementById(id);
			if (element) {
				observer.observe(element);
			}
		}

		// Add scroll event listener
		window.addEventListener("scroll", checkActiveHeading, { passive: true });

		// Set initial active heading after a short delay to ensure content is rendered
		setTimeout(checkActiveHeading, 500);

		return () => {
			observer.disconnect();
			window.removeEventListener("scroll", checkActiveHeading);
		};
	}, [itemIds]);

	return activeId;
}

interface TreeProps {
	tree: TableOfContentsType;
	level?: number;
	activeItem?: string | null;
}

function Tree({ tree, level = 1, activeItem }: TreeProps) {
	return tree?.items?.length && level < 3 ? (
		<ul className={cn("m-0 list-none", { "pl-4": level !== 1 })}>
			{tree.items.map((item, index) => {
				return (
					<li key={index} className={cn("mt-0 pt-2")}>
						<a
							href={item.url}
							className={cn(
								"inline-block no-underline text-sm ",
								encodeId(item.url) === `${activeItem}`
									? "font-medium text-primary"
									: "text-muted-foreground",
							)}
						>
							{item.title}
						</a>
						{item.items?.length ? (
							<Tree tree={item} level={level + 1} activeItem={activeItem} />
						) : null}
					</li>
				);
			})}
		</ul>
	) : null;
}
