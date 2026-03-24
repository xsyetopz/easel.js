import { NavLink, ScrollArea, TextInput } from "@mantine/core";
import { useState } from "react";
import { docCategories, docClasses } from "../docs/classes.js";
import { navigate } from "../hooks/navigate.js";

interface DocSidebarProps {
	activeId: string | undefined;
	onClose: () => void;
}

export function DocSidebar({ activeId, onClose }: DocSidebarProps) {
	const [filter, setFilter] = useState("");

	const filtered = filter
		? docClasses.filter((c) =>
				c.name.toLowerCase().includes(filter.toLowerCase()),
			)
		: docClasses;

	const categories = docCategories.filter((cat) =>
		filtered.some((c) => c.category === cat),
	);

	return (
		<ScrollArea h="calc(100vh - 56px - 32px)">
			<TextInput
				placeholder="Filter classes..."
				size="xs"
				mb="sm"
				value={filter}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setFilter(e.currentTarget.value)
				}
			/>
			{categories.map((cat) => (
				<NavLink key={cat} label={cat} defaultOpened={true} childrenOffset={16}>
					{filtered
						.filter((c) => c.category === cat)
						.map((c) => (
							<NavLink
								key={c.id}
								label={c.name}
								active={activeId === c.id}
								onClick={() => {
									navigate(`docs/${c.id}`);
									onClose();
								}}
							/>
						))}
				</NavLink>
			))}
		</ScrollArea>
	);
}
