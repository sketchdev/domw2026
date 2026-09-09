#!/usr/bin/env node
/**
 * Enables all jsii language targets (Python, Java, Go, C#) in package.json.
 * 
 * This script is used by the Docker build to generate packages for all four languages.
 * 
 * Usage: node scripts/enable-all-targets.js
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Read current package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Ensure jsii.targets exists
if (!packageJson.jsii) {
  packageJson.jsii = {};
}
if (!packageJson.jsii.targets) {
  packageJson.jsii.targets = {};
}

// Add Go target if not present
if (!packageJson.jsii.targets.go) {
  packageJson.jsii.targets.go = {
    moduleName: 'github.com/sketchdev/domw2026-go',
    packageName: 'domw2026cdk'
  };
  console.log('Added Go target');
}

// Add .NET target if not present
if (!packageJson.jsii.targets.dotnet) {
  packageJson.jsii.targets.dotnet = {
    namespace: 'Domw2026.Cdk',
    packageId: 'Domw2026.Cdk'
  };
  console.log('Added .NET target');
}

// Write updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('All jsii targets enabled');
