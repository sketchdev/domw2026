# jsii Target Configuration Reference

This document provides the complete jsii target configuration for the @domw2026/cdk library.

## Default Configuration (Local Builds)

By default, the `package.json` includes only **Python** and **Java** targets. This allows local builds to succeed without requiring Go or .NET compilers.

## Enabling All Targets

### Option 1: Use the enable-all-targets script

The repository includes a script that adds Go and C# targets to package.json:

```bash
node scripts/enable-all-targets.js
```

This script:
- Reads the current package.json
- Adds the Go target configuration if not present
- Adds the .NET target configuration if not present
- Writes the updated package.json

**Note:** After running this script, you'll need Go and .NET SDK installed to run `npm run package`.

### Option 2: Use Docker for full builds (recommended)

The Dockerfile automatically runs `enable-all-targets.js` before building. This is a good process for CI/CD pipelines or when you don't want to install all compilers locally.

```bash
# Build the Docker image
docker build -t domw2026-jsii-builder .

# Run the container to generate all packages
docker run --rm -v $(pwd)/dist:/app/dist domw2026-jsii-builder
```

### Option 3: Modify package.json manually

Add the Go and/or C# target blocks to the `jsii.targets` section in `package.json`. This requires having the respective compilers installed locally.

## Target Configuration Details

### Go Target

```json
"go": {
  "moduleName": "github.com/sketchdev/domw2026-go",
  "packageName": "domw2026cdk"
}
```

| Field | Value | Convention |
|-------|-------|------------|
| `moduleName` | `github.com/sketchdev/domw2026-go` | Go module path (must be valid import path) |
| `packageName` | `domw2026cdk` | Go package name (lowercase, no hyphens) |

**Usage:**
```bash
go get github.com/sketchdev/domw2026-go/domw2026cdk
```

```go
import "github.com/sketchdev/domw2026-go/domw2026cdk"
```

**Requirement:** Go compiler must be installed (`go version` should work)

### C# (.NET) Target

```json
"dotnet": {
  "namespace": "Domw2026.Cdk",
  "packageId": "Domw2026.Cdk"
}
```

| Field | Value | Convention |
|-------|-------|------------|
| `namespace` | `Domw2026.Cdk` | .NET namespace (PascalCase with dots) |
| `packageId` | `Domw2026.Cdk` | NuGet package identifier |

**Usage:**
```bash
dotnet add package Domw2026.Cdk
```

```csharp
using Domw2026.Cdk;
```

**Requirement:** .NET SDK must be installed (`dotnet --version` should work)

## Complete jsii Block Example

Below is the complete `jsii` configuration block with all four language targets enabled:

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
      },
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

## Output Directory Structure

### Local build (Python and Java only)

```
dist/
├── python/
│   └── domw2026_cdk-1.0.0-py3-none-any.whl
└── java/
    └── com/domw2026/cdk/1.0.0/
        ├── cdk-1.0.0.jar
        └── cdk-1.0.0.pom
```

### Full build (all four languages)

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
