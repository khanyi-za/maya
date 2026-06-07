#!/usr/bin/env node

/**
 * Fix Filenames Script
 *
 * Purpose: Rename files in specific asset folders by replacing spaces with underscores
 * Folders: /assets/media/suhu/ and /assets/media/tol_thema/
 *
 * Operation: For each file, if filename contains space " ", replace with underscore "_"
 */

const fs = require('fs');
const path = require('path');

// Define target folders
const FOLDERS = [
  path.join(__dirname, '../assets/media/suhu'),
  path.join(__dirname, '../assets/media/tol_thema'),
];

/**
 * Rename files in a folder by replacing spaces with underscores
 */
function renameFilesInFolder(folderPath) {
  console.log(`\n📁 Processing folder: ${folderPath}`);

  // Check if folder exists
  if (!fs.existsSync(folderPath)) {
    console.log(`❌ Folder does not exist: ${folderPath}`);
    return;
  }

  // Read all files in the folder
  const files = fs.readdirSync(folderPath);
  console.log(`   Found ${files.length} items\n`);

  let renamedCount = 0;
  let skippedCount = 0;

  files.forEach((filename) => {
    const filePath = path.join(folderPath, filename);

    // Skip if not a file (e.g., subdirectories)
    if (!fs.statSync(filePath).isFile()) {
      console.log(`⏭️  Skipping (not a file): ${filename}`);
      skippedCount++;
      return;
    }

    // Check if filename contains spaces
    if (!filename.includes(' ')) {
      console.log(`✓  No changes needed: ${filename}`);
      skippedCount++;
      return;
    }

    // Create new filename by replacing spaces with underscores
    const newFilename = filename.replace(/ /g, '_');
    const newFilePath = path.join(folderPath, newFilename);

    // Check if target filename already exists
    if (fs.existsSync(newFilePath)) {
      console.log(`⚠️  Cannot rename (target exists): ${filename} → ${newFilename}`);
      skippedCount++;
      return;
    }

    // Perform the rename
    try {
      fs.renameSync(filePath, newFilePath);
      console.log(`✅ Renamed: "${filename}" → "${newFilename}"`);
      renamedCount++;
    } catch (error) {
      console.log(`❌ Error renaming "${filename}": ${error.message}`);
      skippedCount++;
    }
  });

  console.log(`\n📊 Summary for ${path.basename(folderPath)}:`);
  console.log(`   ✅ Renamed: ${renamedCount}`);
  console.log(`   ⏭️  Skipped: ${skippedCount}`);
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting filename fix script...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  FOLDERS.forEach((folder) => {
    renameFilesInFolder(folder);
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Script completed!');
}

// Run the script
main();
