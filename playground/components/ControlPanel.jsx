import { ColorInput, Select, Slider, Stack, Text } from "@mantine/core";

function Control({ control, value, onChange }) {
	switch (control.type) {
		case "slider":
			return (
				<div>
					<Text size="sm" fw={500} mb={4}>
						{control.label}
					</Text>
					<Slider
						value={value}
						onChange={onChange}
						min={control.min}
						max={control.max}
						step={control.step}
						marks={[
							{ value: control.min, label: String(control.min) },
							{ value: control.max, label: String(control.max) },
						]}
					/>
				</div>
			);
		case "color":
			return (
				<ColorInput
					label={control.label}
					value={value}
					onChange={onChange}
					format="hex"
				/>
			);
		case "select":
			return (
				<Select
					label={control.label}
					value={value}
					onChange={onChange}
					data={control.options}
					allowDeselect={false}
				/>
			);
		default:
			return null;
	}
}

export function ControlPanel({ controls, params, onParamChange }) {
	if (!controls || controls.length === 0) return null;

	return (
		<Stack gap="md">
			{controls.map((control) => (
				<Control
					key={control.key}
					control={control}
					value={params[control.key]}
					onChange={(val) => onParamChange(control.key, val)}
				/>
			))}
		</Stack>
	);
}
