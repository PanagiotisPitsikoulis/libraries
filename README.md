# NextToolchain 🛠️

A comprehensive toolkit for Next.js developers that bundles essential UI components, React hooks, database management utilities, and developer tools to streamline your workflow.

## 🌟 Why NextToolchain?

### The Current Development Experience is Fragmented 💔

Building modern Next.js applications involves juggling dozens of tools:

- **Scattered Utilities**: Developers waste time finding, configuring, and maintaining various development tools
- **Inconsistent DX**: Different projects use different approaches for common tasks like DB management
- **Configuration Hell**: Hours lost setting up the same tools and scripts for each new project
- **Reinventing the Wheel**: Teams repeatedly build the same utility components and helper functions
- **UI Component Overload**: Countless hours spent customizing and extending basic UI components

### Our Solution 🚀

NextToolchain unifies these essential tools into a single, cohesive package:

- **Extensive UI Component Library**: Over 60 ready-to-use React components including both shadcn-style basics and advanced interactive elements
- **Motion & Animation Components**: Beautiful, performant animations with sensible defaults
- **Database Tools**: Complete PostgreSQL database management utilities
- **Utility Functions**: Common Next.js helpers for metadata, OpenGraph, and error handling
- **Custom React Hooks**: Practical hooks for everyday development challenges
- **TypeScript Excellence**: Everything is fully typed for maximum developer confidence

## 📦 Installation

```bash
# Using npm
npm install next-toolchain

# Using yarn
yarn add next-toolchain

# Using pnpm
pnpm add next-toolchain

# Using bun
bun add next-toolchain
```

## 🔧 Core Features

### Rich UI Component Library 🎨

Over 60 high-quality React components for building beautiful interfaces:

**Basic Components**
- Button, Input, Select, Checkbox, etc.
- Accordion, Tabs, Card, Dialog, etc.
- Table, Form, Navigation, etc.

**Advanced Interactive Components**
- MotionCarousel - Smooth, touch-enabled carousel
- MaskedDiv - Create unique masking effects for images
- Spotlight - Create spotlight hover effects
- Tilt - 3D tilting effect on hover
- Magnetic - Magnetic attraction effects
- ImageComparison - Before/after image slider
- And many more...

```jsx
import { MotionCarousel, Card, Button } from 'next-toolchain/components';

export function ProductShowcase() {
  return (
    <Card>
      <MotionCarousel>
        {/* Your carousel items */}
      </MotionCarousel>
      <Button>View Details</Button>
    </Card>
  );
}
```

### Database Management 🗄️

Powerful PostgreSQL utilities that make database operations simple:

```bash
# Set up a fresh database with all proper configurations
npx next-toolchain db setup-fresh

# Run migrations
npx next-toolchain db migrate

# Reverse migrations
npx next-toolchain db migrate-reverse
```

**Features:**
- One-command setup of properly configured databases
- Automatic user permissions and connection limits
- Database schema, tables, views, triggers, and functions management
- Built-in timeouts and performance settings
- Works with both local and cloud databases
- Comprehensive database tools like cloning, connection management, and constraint validation

### React Hooks 🪝

Practical hooks to solve common development challenges:

```jsx
import { 
  useClickOutside, 
  useDebounce, 
  useMediaQuery,
  useMounted,
  useMobile
} from 'next-toolchain/hooks';

export function SearchComponent() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const isMobile = useMobile();
  
  // Use the debounced value for API calls
  useEffect(() => {
    if (debouncedSearch) {
      // Search API call here
    }
  }, [debouncedSearch]);
  
  return (
    <div>
      <input 
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={isMobile ? "Search" : "Enter search term..."}
      />
    </div>
  );
}
```

### Utility Functions 🔧

Helper functions for common Next.js development tasks:

```jsx
import { 
  generateMeta, 
  mergeOpenGraph, 
  formatSlug,
  generateTOC
} from 'next-toolchain/lib';

// Generate SEO metadata
export function generateMetadata({ params }) {
  return generateMeta({
    title: "Product Page",
    description: "View our latest products",
    slug: params.slug
  });
}

// Generate table of contents from markdown
const toc = generateTOC(markdownContent);
```

## 📋 Usage Examples

### Complete UI with Advanced Components

```tsx
import { 
  Card, 
  MaskedDiv, 
  BorderTrail, 
  InView,
  SpinningText
} from 'next-toolchain/components';

export function FeatureShowcase() {
  return (
    <InView animation="fade-in">
      <Card className="relative overflow-hidden">
        <BorderTrail className="absolute inset-0" />
        <div className="p-6">
          <SpinningText text="SPECIAL OFFER" className="mb-4" />
          <h2>Premium Package</h2>
          <p>Get access to all features with our premium package.</p>
          <MaskedDiv maskType="type-2">
            <img src="/images/premium.jpg" alt="Premium package" />
          </MaskedDiv>
        </div>
      </Card>
    </InView>
  );
}
```

### Database Setup and Management

```typescript
// scripts/setup-db.ts
import { setupFreshDb, testConnection } from 'next-toolchain/db';

async function main() {
  // Create fresh database
  await setupFreshDb();
  
  // Test connection
  const isConnected = await testConnection();
  
  if (isConnected) {
    console.log('✅ Database ready for development!');
  } else {
    console.error('❌ Database connection failed');
  }
}

main().catch(console.error);
```

## 📖 Documentation

### Database Utilities

Our PostgreSQL utilities provide an easy way to manage your database:

**Configuration:**
Set these environment variables or use a `.env` file:
- `CLOUD_DB_NAME` - Database name
- `CLOUD_DB_USER` - Database user for application
- `APP_PASS` - Password for application user
- `DB_MAX_CONNECTIONS` - Maximum allowed connections

**Available Functions:**
- `setupFreshDb()` - Creates a fresh database with proper configuration
- `testConnection()` - Tests database connectivity
- `setTimeouts()` - Configures optimal database timeouts
- `getConnectionString()` - Returns a formatted connection string
- `cloneDb()` - Creates a copy of an existing database
- `listDbs()` - Lists all available databases
- `dropDb()` - Deletes a database
- Plus tools for tables, views, constraints, and more

### UI Component Props

#### MotionCarousel

A smooth, animated carousel with touch support and customizable navigation.

**Props:**
- `initialIndex`: number - Starting slide index (default: 0)
- `index`: number - Controlled index value
- `onIndexChange`: (index: number) => void - Callback when index changes
- `disableDrag`: boolean - Disables touch/drag functionality
- `className`: string - Additional CSS classes

#### MaskedDiv

Create unique shape masks for images and content.

**Props:**
- `maskType`: "type-1" | "type-2" | "type-3" | "type-4" - Different mask shapes
- `size`: number - Scale factor for the mask (default: 1)
- `backgroundColor`: string - Background color behind the mask
- `className`: string - Additional CSS classes
- `children`: ReactElement<HTMLImageElement | HTMLVideoElement> - Image or video element

## 🔧 Requirements

- Node.js 18 or later
- Next.js 13.4 or later (App Router support)
- PostgreSQL (for database utilities)
