import * as fs from 'fs';
import * as path from 'path';

interface ExportSummary {
  exportDate: string;
  summary: {
    totalMovies: number;
    totalActors: number;
    totalPerformances: number;
    totalRatings: number;
  };
}

function viewLatestExportSummary(): void {
  try {
    const exportsDir = path.join(__dirname, '..', 'exports');
    
    if (!fs.existsSync(exportsDir)) {
      console.log('❌ No exports directory found. Run the export script first.');
      return;
    }
    
    // Get all export files
    const files = fs.readdirSync(exportsDir)
      .filter(file => file.startsWith('actor-rating-export-') && file.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first
    
    if (files.length === 0) {
      console.log('❌ No export files found. Run the export script first.');
      return;
    }
    
    console.log('📊 Latest Export Summary');
    console.log('========================');
    
    // Show the 3 most recent exports
    const recentFiles = files.slice(0, 3);
    
    recentFiles.forEach((file, index) => {
      const filepath = path.join(exportsDir, file);
      const fileContent = fs.readFileSync(filepath, 'utf8');
      const data = JSON.parse(fileContent) as ExportSummary;
      
      const date = new Date(data.exportDate).toLocaleString();
      const fileSize = (fs.statSync(filepath).size / (1024 * 1024)).toFixed(2);
      
      console.log(`\n${index === 0 ? '🆕' : '📄'} ${file}`);
      console.log(`   📅 Export Date: ${date}`);
      console.log(`   📁 File Size: ${fileSize} MB`);
      console.log(`   📽️  Movies: ${data.summary.totalMovies.toLocaleString()}`);
      console.log(`   🎭 Actors: ${data.summary.totalActors.toLocaleString()}`);
      console.log(`   🎬 Performances: ${data.summary.totalPerformances.toLocaleString()}`);
      console.log(`   ⭐ Ratings: ${data.summary.totalRatings.toLocaleString()}`);
    });
    
    if (files.length > 3) {
      console.log(`\n... and ${files.length - 3} more export files`);
    }
    
  } catch (error) {
    console.error('❌ Error reading export summary:', error);
  }
}

// Run the summary viewer
viewLatestExportSummary(); 