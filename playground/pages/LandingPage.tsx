import {
	Anchor,
	Badge,
	Button,
	Container,
	Group,
	List,
	Paper,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { landingPagesBySlug } from "../content/landingPages.ts";
import { navigate } from "../hooks/navigate.js";

interface LandingPageProps {
	slug: string;
}

export function LandingPage({ slug }: LandingPageProps) {
	const page = landingPagesBySlug[slug];

	if (!page) {
		return (
			<Container size="md" py="xl">
				<Text c="dimmed">Page not found.</Text>
			</Container>
		);
	}

	return (
		<Container size="md" py="md">
			<Stack gap="xl">
				<div>
					<Badge variant="light" mb="sm">
						{page.eyebrow}
					</Badge>
					<Title order={1}>{page.title}</Title>
					<Text c="dimmed" mt="sm" size="lg">
						{page.intro}
					</Text>
					<Group mt="md">
						{page.ctas.map((cta) => (
							<Button
								key={cta.label}
								component="a"
								href={cta.href}
								variant={cta.variant ?? "filled"}
								onClick={(event) => {
									event.preventDefault();
									navigate(cta.href);
								}}
							>
								{cta.label}
							</Button>
						))}
					</Group>
				</div>

				<Group gap="xs">
					{page.keywords.map((keyword) => (
						<Badge key={keyword} variant="outline" color="gray">
							{keyword}
						</Badge>
					))}
				</Group>

				{page.sections.map((section) => (
					<Paper key={section.title} p="lg" withBorder={true}>
						<Stack gap="sm">
							<Title order={3}>{section.title}</Title>
							{section.body.map((paragraph) => (
								<Text key={paragraph} c="dimmed">
									{paragraph}
								</Text>
							))}
							{section.bullets && (
								<List spacing="xs" size="sm">
									{section.bullets.map((bullet) => (
										<List.Item key={bullet}>{bullet}</List.Item>
									))}
								</List>
							)}
						</Stack>
					</Paper>
				))}

				<Anchor
					href="/examples"
					onClick={(event) => {
						event.preventDefault();
						navigate("/examples");
					}}
				>
					Browse all examples
				</Anchor>
			</Stack>
		</Container>
	);
}
