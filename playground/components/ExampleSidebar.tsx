import { NavLink, ScrollArea, TextInput } from "@mantine/core";
import { useState } from "react";
import { navigate } from "../hooks/navigate.js";
import { useExampleCatalog } from "../hooks/useExampleCatalog.ts";
import type { ExampleCatalogData } from "../loaders/examples.ts";
import { routeToPath } from "../routes.ts";

interface ExampleSidebarProps {
	activeId: string | undefined;
	initialCatalog?: ExampleCatalogData | undefined;
	onClose: () => void;
}

export function ExampleSidebar({
	activeId,
	initialCatalog,
	onClose,
}: ExampleSidebarProps) {
	const [filter, setFilter] = useState("");
	const catalog = useExampleCatalog(initialCatalog);
	const categoryLabels = catalog?.categoryLabels ?? {};
	const examples = catalog?.examples ?? [];

	const filtered = filter
		? examples.filter(
				(e) =>
					e.meta.name.toLowerCase().includes(filter.toLowerCase()) ||
					e.meta.category.toLowerCase().includes(filter.toLowerCase()),
			)
		: examples;

	const categories = [...new Set(filtered.map((e) => e.meta.category))];

	return (
		<ScrollArea h="calc(100vh - 56px - 32px)">
			<TextInput
				placeholder="Filter examples..."
				size="xs"
				mb="sm"
				value={filter}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setFilter(e.currentTarget.value)
				}
			/>
			{categories.map((cat) => (
				<NavLink
					key={cat}
					label={categoryLabels[cat] ?? cat}
					defaultOpened={true}
					childrenOffset={16}
				>
					{filtered
						.filter((e) => e.meta.category === cat)
						.map((e) => (
							<NavLink
								key={e.meta.id}
								component="a"
								href={routeToPath(`examples/${e.meta.id}`)}
								label={e.meta.name}
								active={activeId === e.meta.id}
								onClick={(event) => {
									event.preventDefault();
									navigate(`examples/${e.meta.id}`);
									onClose();
								}}
							/>
						))}
				</NavLink>
			))}
		</ScrollArea>
	);
}
