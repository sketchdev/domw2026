# @domw2026/cdk

AWS CDK constructs for hosting static JavaScript sites, built for the DevOps Midwest 2026 conference.

This library provides a reusable CDK construct (`StaticSiteConstruct`) that provisions AWS infrastructure for hosting static websites. It supports two deployment modes:

- **SPA Mode** - For single-page applications (React, Vue, Angular) where client-side routing handles all paths
- **Static HTML Mode** - For pre-rendered sites (Next.js static export) where each route corresponds to a physical HTML file

## jsii Multi-Language Support

This library uses [jsii](https://aws.github.io/jsii/) to enable consumption from multiple programming languages. jsii (JavaScript Interoperability Interface) is an AWS-developed compiler that allows TypeScript libraries to be published and consumed in Python, Java, Go, and C# - all from a single TypeScript codebase.

**Benefits of jsii integration:**

- Write once in TypeScript, distribute to four languages automatically
- Maintain type safety across all target languages
- Keep documentation, types, and behavior consistent
- Simplify maintenance with a single source of truth

## Alternative: Projen for Project Management

[Projen](https://projen.io/) is a project configuration generator created by the AWS CDK team that can simplify jsii library development. Instead of manually maintaining configuration files, you define your project programmatically and Projen generates all the boilerplate.

**What Projen provides:**
- Pre-configured jsii settings via `AwsCdkConstructLibrary` project type
- Automated GitHub Actions workflows for multi-language publishing
- Consistent configuration across package.json, tsconfig.json, and jsii settings
- Built-in support for testing, linting, and versioning

**Example `.projenrc.ts`:**

```typescript
import { awscdk } from 'projen';

const project = new awscdk.AwsCdkConstructLibrary({
  name: '@domw2026/cdk',
  author: 'DevOps Midwest',
  repositoryUrl: 'https://github.com/sketchdev/domw2026.git',
  cdkVersion: '2.268.0',
  
  publishToPypi: {
    distName: 'domw2026-cdk',
    module: 'domw2026_cdk',
  },
  publishToMaven: {
    javaPackage: 'com.domw2026.cdk',
    mavenGroupId: 'com.domw2026',
    mavenArtifactId: 'cdk',
  },
});

project.synth();
```

**Resources:**
- [Projen Website](https://projen.io/)
- [Projen Documentation](https://projen.io/docs/introduction/)
- [GitHub Repository](https://github.com/projen/projen)
- [AwsCdkConstructLibrary API](https://projen.io/docs/api/awscdk#awscdkconstructlibrary-)

This project does not use Projen (configuration is managed manually), but Projen is worth considering for new jsii libraries or when you want automated release workflows.

## Quick Start

### TypeScript / JavaScript

```bash
npm install @domw2026/cdk
```

```typescript
import { StaticSiteConstruct } from '@domw2026/cdk';

const site = new StaticSiteConstruct(this, 'MySite', {
  domainName: 'www.example.com',
  hostedZone: myHostedZone,
  isSinglePageApp: true,
});
```

### Python

```bash
pip install domw2026-cdk
```

```python
from domw2026_cdk import StaticSiteConstruct

site = StaticSiteConstruct(self, "MySite",
    domain_name="www.example.com",
    hosted_zone=my_hosted_zone,
    is_single_page_app=True
)
```

### Java

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>com.domw2026</groupId>
    <artifactId>cdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

```java
import com.domw2026.cdk.StaticSiteConstruct;
import com.domw2026.cdk.StaticSiteConstructProps;

StaticSiteConstruct site = new StaticSiteConstruct(this, "MySite",
    StaticSiteConstructProps.builder()
        .domainName("www.example.com")
        .hostedZone(myHostedZone)
        .isSinglePageApp(true)
        .build());
```

### Go

```bash
go get github.com/sketchdev/domw2026-go/domw2026cdk
```

```go
import "github.com/sketchdev/domw2026-go/domw2026cdk"

site := domw2026cdk.NewStaticSiteConstruct(scope, jsii.String("MySite"), &domw2026cdk.StaticSiteConstructProps{
    DomainName:     jsii.String("www.example.com"),
    HostedZone:     myHostedZone,
    IsSinglePageApp: jsii.Bool(true),
})
```

### C# (.NET)

```bash
dotnet add package Domw2026.Cdk
```

```csharp
using Domw2026.Cdk;

var site = new StaticSiteConstruct(this, "MySite", new StaticSiteConstructProps
{
    DomainName = "www.example.com",
    HostedZone = myHostedZone,
    IsSinglePageApp = true
});
```

## Configuration Reference

### package.json jsii Block

The `jsii` configuration in `package.json` controls how jsii compiles and packages the library:

```json
{
  "jsii": {
    "outdir": "dist",
    "versionFormat": "short",
    "excludeTypescript": ["test/**/*.ts"],
    "tsc": {
      "outDir": "lib",
      "rootDir": "src"
    },
    "targets": {
      "python": {
        "distName": "domw2026-cdk",
        "module": "domw2026_cdk"
      },
      "java": {
        "package": "com.domw2026.cdk",
        "maven": {
          "groupId": "com.domw2026",
          "artifactId": "cdk"
        }
      }
    }
  }
}
```

| Field | Value | Purpose |
|-------|-------|---------|
| `outdir` | `"dist"` | Directory for generated language packages |
| `versionFormat` | `"short"` | Uses simple version numbers in the `.jsii` assembly for cleaner diffs |
| `excludeTypescript` | `["test/**/*.ts"]` | Excludes test files from jsii compilation |
| `tsc.outDir` | `"lib"` | JavaScript output directory |
| `tsc.rootDir` | `"src"` | TypeScript source directory |
| `targets.python` | Active | Python wheel configuration |
| `targets.java` | Active | Java JAR and Maven configuration |

### tsconfig.json Requirements

jsii requires specific TypeScript settings for compatibility:

```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "strict": true,
    "esModuleInterop": true
  }
}
```

| Setting | Required | Reason |
|---------|----------|--------|
| `declaration` | `true` | jsii requires type definitions for the assembly |
| `declarationMap` | `true` | Enables source mapping for debugging |
| `strict` | `true` | jsii enforces strict TypeScript for type safety across languages |
| `esModuleInterop` | `true` | Required for proper module interoperability |

### Target Language Settings

#### Python Target (local builds)

| Field | Value | Convention |
|-------|-------|------------|
| `distName` | `domw2026-cdk` | PyPI package name (hyphens allowed) |
| `module` | `domw2026_cdk` | Python import name (underscores required) |

#### Java Target (local builds)

| Field | Value | Convention |
|-------|-------|------------|
| `package` | `com.domw2026.cdk` | Java package (reverse domain) |
| `maven.groupId` | `com.domw2026` | Maven group identifier |
| `maven.artifactId` | `cdk` | Maven artifact identifier |

#### Go Target (Docker builds)

| Field | Value | Convention |
|-------|-------|------------|
| `moduleName` | `github.com/sketchdev/domw2026-go` | Go module path |
| `packageName` | `domw2026cdk` | Go package name (lowercase) |

#### C# Target (Docker builds)

| Field | Value | Convention |
|-------|-------|------------|
| `namespace` | `Domw2026.Cdk` | .NET namespace (PascalCase) |
| `packageId` | `Domw2026.Cdk` | NuGet package identifier |

### Enabling Go and C# Targets Locally

By default, Go and C# targets are not included in `package.json` (for this demo project) allowing local builds without requiring those compilers. The Docker build automatically enables them via `scripts/enable-all-targets.js`.

To enable them locally, either run the script or manually add these blocks to the `jsii.targets` section:

```bash
# Enable all targets using the script
node scripts/enable-all-targets.js
```

Or manually add to package.json:

```json
{
  "jsii": {
    "targets": {
      "go": {
        "moduleName": "github.com/sketchdev/domw2026-go",
        "packageName": "domw2026cdk"
      },
      "dotnet": {
        "namespace": "Domw2026.Cdk",
        "packageId": "Domw2026.Cdk"
      }
    }
  }
}
```

**Requirements:**
- Go target requires Go compiler (`go version` should work)
- C# target requires .NET SDK (`dotnet --version` should work)
- Java target requires JDK and Maven (`java --version` and `mvn --version` should work)
- Python target requires Python runtime (`python --version` should work)

See [docs/jsii-all-targets.md](docs/jsii-all-targets.md) for the complete configuration reference.

## Build Commands

### Compilation

```bash
npm run build
```

This invokes `jsii` to:
- Compile TypeScript source files in `src/` to JavaScript in `lib/`
- Generate type definition files (`.d.ts`) in `lib/`
- Create the `.jsii` assembly manifest in the project root

### Package Generation

```bash
npm run package
```

This invokes `jsii-pacmak` to generate language-specific packages in the `dist/` directory. By default (local builds), this produces Python and Java packages only.

### Testing and Linting

```bash
npm test       # Run Jest tests
npm run lint   # Run ESLint
```

## Docker-Based Build

The repository includes a Dockerfile that provides a complete build environment with all language compilers pre-installed. This is the quickest way to generate packages for all four target languages.

The Docker build automatically enables Go and C# targets by running `scripts/enable-all-targets.js` before building.

### Build the Docker Image

```bash
docker build -t domw2026-jsii-builder .
```

### Generate All Packages

```bash
docker run --rm -v $(pwd)/dist:/app/dist domw2026-jsii-builder
```

This:
1. Enables Go and C# targets in package.json
2. Runs `npm run build` (jsii compilation)
3. Runs `npm run package` (jsii-pacmak)
4. Outputs all four language packages to the mounted `dist/` directory

### Interactive Shell for Debugging

```bash
docker run --rm -it -v $(pwd):/app domw2026-jsii-builder /bin/bash
```

### Docker Image Components

| Component | Version | Purpose |
|-----------|---------|---------|
| Base Image | `node:20-bookworm` | Debian 12 with Node.js 20 LTS |
| Python | 3.11+ (system) | Python wheel generation |
| Java | OpenJDK 17 | Java JAR generation |
| Maven | 3.8+ (system) | Maven repository format |
| Go | 1.19+ (system) | Go module generation |
| .NET SDK | 8.0 | NuGet package generation |

## Output Structure

### Local Build (Python and Java)

```
dist/
├── python/
│   └── domw2026_cdk-1.0.0-py3-none-any.whl
└── java/
    └── com/domw2026/cdk/1.0.0/
        ├── cdk-1.0.0.jar
        └── cdk-1.0.0.pom
```

### Docker Build (All Four Languages)

```
dist/
├── python/
│   └── domw2026_cdk-1.0.0-py3-none-any.whl
├── java/
│   └── com/domw2026/cdk/1.0.0/
│       ├── cdk-1.0.0.jar
│       └── cdk-1.0.0.pom
├── go/
│   └── domw2026cdk/
│       ├── go.mod
│       └── *.go
└── dotnet/
    └── Domw2026.Cdk.1.0.0.nupkg
```

## TypeScript Compatibility

jsii enforces restrictions on TypeScript to ensure code can be represented in all target languages. The following TypeScript features are NOT supported:

| Feature | Example | Why Not Supported |
|---------|---------|-------------------|
| Mapped types | `Pick<T, K>`, `Omit<T, K>` | Cannot be represented in statically-typed languages |
| Conditional types | `T extends U ? X : Y` | No equivalent in Java/Go/C# |
| Index signatures | `[key: string]: T` | Conflicts with class property models |
| Type aliases | `type Foo = string` | De-sugared at compile time, not visible to other languages |
| Soft-reserved words | `namespace`, `object` | Reserved in some target languages |

### Compatible Patterns

The following patterns work well with jsii:

- Class exports with constructors
- Interface exports with readonly properties
- Exported functions
- Enums
- Abstract classes
- Inheritance from CDK constructs

## Troubleshooting Build Errors

**Error: `jsii: command not found`**

Install jsii dependencies:
```bash
npm install
```

**Error: `JSII5000: Interface uses an index signature`**

Remove index signatures from interfaces. Use a Map or Record type exported from a compatible library instead.

**Error: `JSII2000: "author" is required`**

Add the required `author` field to `package.json`:
```json
{
  "author": {
    "name": "Your Name",
    "organization": true
  }
}
```
