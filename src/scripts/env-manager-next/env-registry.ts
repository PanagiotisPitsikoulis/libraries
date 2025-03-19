export interface ProjectEnvConfig {
	name: string;
	description: string;
	variables: string;
}

export const projectRegistry: Record<string, ProjectEnvConfig> = {
	example: {
		name: "Example Project",
		description: "Example project configuration",
		variables: `DATABASE_URI=postgresql://user:pass@localhost:5432/db
API_KEY=example_key
NODE_ENV=development`
	}
};
