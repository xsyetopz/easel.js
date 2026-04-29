import { ColorInput, Select, Slider, Stack, Text } from "@mantine/core";
import type { ControlDefinition } from "../types/controls.ts";

interface ControlProps {
	control: ControlDefinition;
	value: string | number;
	onChange: (value: string | number) => void;
}

function Control({ control, value, onChange }: ControlProps) {
	switch (control.type) {
		case "slider":
			return (
				<div>
					<Text size="sm" fw={500} mb={4}>
						{control.label}
					</Text>
					<Slider
						value={value as number}
						onChange={onChange}
						min={control.min}
						max={control.max}
						step={control.step}
						marks={[
							{ value: control.min, label: String(control.min) },
							{ value: control.max, label: String(control.max) },
						]}
						mb="lg"
						styles={{ root: { paddingInline: 4 } }}
					/>
				</div>
			);
		case "color":
			return (
				<ColorInput
					label={control.label}
					value={value as string}
					onChange={onChange}
					format="hex"
				/>
			);
		case "select":
			return (
				<Select
					label={control.label}
					value={value as string}
					onChange={(val) => {
						if (val !== null) onChange(val);
					}}
					data={control.options}
					allowDeselect={false}
				/>
			);
		default:
			return undefined;
	}
}

interface ControlPanelProps {
	controls: ControlDefinition[] | undefined;
	params: Record<string, string | number>;
	onParamChange: (key: string, value: string | number) => void;
}

export function ControlPanel({
	controls,
	params,
	onParamChange,
}: ControlPanelProps) {
	if (!controls || controls.length === 0) return undefined;

	return (
		<Stack gap="md">
			{controls.map((control) => (
				<Control
					key={control.key}
					control={control}
					value={params[control.key] as string | number}
					onChange={(val) => onParamChange(control.key, val)}
				/>
			))}
		</Stack>
	);
}
