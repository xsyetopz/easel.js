import { NavLink, ScrollArea, TextInput } from "@mantine/core";
import { useState } from "react";
import { categoryLabels, examples } from "../examples/registry.js";
import { navigate } from "../hooks/navigate.js";

interface ExampleSidebarProps {
	activeId: string | undefined;
	onClose: () => void;
}

export function ExampleSidebar({ activeId, onClose }: ExampleSidebarProps) {
	const [filter, setFilter] = useState("");

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
								label={e.meta.name}
								active={activeId === e.meta.id}
								onClick={() => {
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
