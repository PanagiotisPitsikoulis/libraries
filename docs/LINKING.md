# Local Development and Linking

## Usage

After installing globally:

```bash
# Configure environment
npx next-toolchain-config-env

# Configure database
npx next-toolchain-config-db
```

The configuration files will be stored in:
- `.next-toolchain-config/env.registry.json` - Environment configurations
- `.next-toolchain-config/db.registry.json` - Database configurations

## Development

1. Build the project:
```bash
pnpm run build
```

2. Link globally:
```bash
pnpm link --global
```

3. Test the CLI:
```bash
next-toolchain-config-env
next-toolchain-config-db
``` 