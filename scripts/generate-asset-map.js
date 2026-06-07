#!/usr/bin/env node

/**
 * Generate Asset Map Script
 *
 * Purpose: Auto-generate lib/asset-map.ts and lib/local-assets.ts
 * Scans /assets/media/ folders and creates mapping files with correct filenames
 */

const fs = require('fs');
const path = require('path');

// Folders to scan
const ASSET_FOLDERS = [
  { name: 'suhu', path: path.join(__dirname, '../assets/media/suhu') },
  { name: 'tol_thema', path: path.join(__dirname, '../assets/media/tol_thema') },
];

/**
 * Scan folder and get all media files
 */
function getMediaFiles(folderPath) {
  const files = fs.readdirSync(folderPath);
  return files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.mp4', '.mov'].includes(ext) && !file.startsWith('.');
  });
}

/**
 * Generate asset-map.ts content
 */
function generateAssetMapFile() {
  let content = `// Local Asset Mapping
// Metro bundler requires static asset paths, so we create a mapping
// This file maps API URLs to local asset references
// AUTO-GENERATED - DO NOT EDIT MANUALLY

/**
 * Asset mapping structure
 * Key: "merchantFolder/filename"
 * Value: require() reference to local asset
 */
export const ASSET_MAP: Record<string, any> = {
`;

  ASSET_FOLDERS.forEach(({ name, path: folderPath }) => {
    if (!fs.existsSync(folderPath)) {
      console.log(`⚠️  Folder not found: ${folderPath}`);
      return;
    }

    const files = getMediaFiles(folderPath);
    content += `  // ${name}\n`;

    files.forEach(filename => {
      const key = `${name}/${filename}`;
      const requirePath = `@/assets/media/${name}/${filename}`;
      // Use double quotes if filename contains single quote
      const quote = filename.includes("'") ? '"' : "'";
      content += `  ${quote}${key}${quote}: require(${quote}${requirePath}${quote}),\n`;
    });

    content += '\n';
  });

  content += `};

/**
 * Get local asset by API URL
 * @param apiUrl - Full URL from API response (e.g., "http://localhost:3000/demo-assets/suhu/file.jpg")
 * @returns Local asset reference or null
 */
export function getAssetByUrl(apiUrl: string | null): any {
  if (!apiUrl) return null;

  try {
    // Extract merchant folder and filename from API URL
    const match = apiUrl.match(/\\/demo-assets\\/([^/]+)\\/(.+)/);
    if (!match || !match[1] || !match[2]) {
      console.warn('Could not parse asset URL:', apiUrl);
      return null;
    }

    const merchantFolder = match[1];
    const filename = decodeURIComponent(match[2]);
    const key = \`\${merchantFolder}/\${filename}\`;

    const asset = ASSET_MAP[key];
    if (!asset) {
      console.warn('Asset not found in map:', key);
      return null;
    }

    return asset;
  } catch (error) {
    console.error('Error getting asset:', error);
    return null;
  }
}
`;

  return content;
}

/**
 * Generate local-assets.ts content
 */
function generateLocalAssetsFile() {
  let content = `// Local Asset Mapping for Yiiva Media
// Maps API URLs to bundled local asset URIs
// AUTO-GENERATED - DO NOT EDIT MANUALLY

/**
 * Parse API URL to extract merchant folder and filename
 */
export function parseMediaUrl(apiUrl: string | null): { merchantFolder: string; filename: string } | null {
  if (!apiUrl) return null;

  try {
    const match = apiUrl.match(/\\/demo-assets\\/([^/]+)\\/(.+)/);
    if (!match || !match[1] || !match[2]) {
      console.warn('Could not parse media URL:', apiUrl);
      return null;
    }

    const merchantFolder = match[1];
    const filename = decodeURIComponent(match[2]);
    return { merchantFolder, filename };
  } catch (error) {
    console.error('Error parsing media URL:', error);
    return null;
  }
}

/**
 * Get local asset source from API URL
 * Returns a source object compatible with expo-image and expo-video
 */
export function getLocalAsset(apiUrl: string | null): any {
  const parsed = parseMediaUrl(apiUrl);
  if (!parsed) return null;

  const { merchantFolder, filename } = parsed;

  try {
`;

  ASSET_FOLDERS.forEach(({ name }) => {
    content += `    if (merchantFolder === '${name}') {
      return get${capitalize(name)}Asset(filename);
    }
`;
  });

  content += `  } catch (error) {
    console.warn('Asset not found:', merchantFolder + '/' + filename, error);
    return null;
  }

  return null;
}

`;

  // Generate asset resolver functions for each merchant
  ASSET_FOLDERS.forEach(({ name, path: folderPath }) => {
    if (!fs.existsSync(folderPath)) return;

    const files = getMediaFiles(folderPath);
    const functionName = `get${capitalize(name)}Asset`;

    content += `/**
 * ${capitalize(name)} asset resolver
 */
function ${functionName}(filename: string): any {
  const assets: Record<string, any> = {
`;

    files.forEach(filename => {
      const requirePath = `../assets/media/${name}/${filename}`;
      // Use double quotes if filename contains single quote
      const quote = filename.includes("'") ? '"' : "'";
      content += `    ${quote}${filename}${quote}: require(${quote}${requirePath}${quote}),\n`;
    });

    content += `  };

  return assets[filename] || null;
}

`;
  });

  content += `/**
 * Check if we have a local asset for this URL
 */
export function hasLocalAsset(apiUrl: string | null): boolean {
  return getLocalAsset(apiUrl) !== null;
}
`;

  return content;
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, '');
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Generating asset mapping files...\n');

  try {
    // Generate asset-map.ts
    const assetMapContent = generateAssetMapFile();
    const assetMapPath = path.join(__dirname, '../lib/asset-map.ts');
    fs.writeFileSync(assetMapPath, assetMapContent, 'utf8');
    console.log(`✅ Generated: ${assetMapPath}`);

    // Generate local-assets.ts
    const localAssetsContent = generateLocalAssetsFile();
    const localAssetsPath = path.join(__dirname, '../lib/local-assets.ts');
    fs.writeFileSync(localAssetsPath, localAssetsContent, 'utf8');
    console.log(`✅ Generated: ${localAssetsPath}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');

    ASSET_FOLDERS.forEach(({ name, path: folderPath }) => {
      if (fs.existsSync(folderPath)) {
        const files = getMediaFiles(folderPath);
        console.log(`   ${name}: ${files.length} files`);
      }
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Asset mapping files generated successfully!\n');

  } catch (error) {
    console.error('❌ Error generating files:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
