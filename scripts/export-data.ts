import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

interface ExportData {
  exportDate: string;
  movies: any[];
  actors: any[];
  performances: any[];
  summary: {
    totalMovies: number;
    totalActors: number;
    totalPerformances: number;
    totalRatings: number;
  };
}

async function exportData(): Promise<void> {
  try {
    console.log('🚀 Starting database export...');
    
    // Fetch all data from the database
    console.log('📽️  Fetching movies...');
    const movies = await prisma.movie.findMany({
      orderBy: { title: 'asc' }
    });
    
    console.log('🎭 Fetching actors...');
    const actors = await prisma.actor.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log('🎬 Fetching performances...');
    const performances = await prisma.performance.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        actor: {
          select: {
            id: true,
            name: true
          }
        },
        movie: {
          select: {
            id: true,
            title: true,
            year: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('⭐ Fetching ratings...');
    const ratings = await prisma.rating.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        actor: {
          select: {
            id: true,
            name: true
          }
        },
        movie: {
          select: {
            id: true,
            title: true,
            year: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Create the export data structure
    const exportData: ExportData = {
      exportDate: new Date().toISOString(),
      movies,
      actors,
      performances,
      summary: {
        totalMovies: movies.length,
        totalActors: actors.length,
        totalPerformances: performances.length,
        totalRatings: ratings.length
      }
    };
    
    // Create exports directory if it doesn't exist
    const exportsDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `actor-rating-export-${timestamp}.json`;
    const filepath = path.join(exportsDir, filename);
    
    // Write the data to file
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    
    console.log('✅ Export completed successfully!');
    console.log(`📁 File saved to: ${filepath}`);
    console.log('\n📊 Export Summary:');
    console.log(`   Movies: ${exportData.summary.totalMovies}`);
    console.log(`   Actors: ${exportData.summary.totalActors}`);
    console.log(`   Performances: ${exportData.summary.totalPerformances}`);
    console.log(`   Ratings: ${exportData.summary.totalRatings}`);
    
    // Also create a ratings-only export if there are ratings
    if (ratings.length > 0) {
      const ratingsFilename = `actor-rating-ratings-${timestamp}.json`;
      const ratingsFilepath = path.join(exportsDir, ratingsFilename);
      
      const ratingsExport = {
        exportDate: new Date().toISOString(),
        ratings,
        summary: {
          totalRatings: ratings.length
        }
      };
      
      fs.writeFileSync(ratingsFilepath, JSON.stringify(ratingsExport, null, 2));
      console.log(`📊 Ratings export saved to: ${ratingsFilepath}`);
    }
    
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the export
exportData().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
}); 