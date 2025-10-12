const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('🧹 Starting performance cleanup...')
    
    // Get initial count
    const initialCount = await prisma.performance.count()
    console.log(`📊 Initial performance count: ${initialCount}`)
    
    let totalDeleted = 0
    
    // 1. Delete performances where actor plays themselves (character contains "self")
    console.log('\n🎭 Cleaning "Self" roles...')
    const selfRolesResult = await prisma.performance.deleteMany({
      where: {
        character: { 
          contains: 'self', 
          mode: 'insensitive' 
        }
      }
    })
    console.log(`   Deleted ${selfRolesResult.count} performances with "self" roles`)
    totalDeleted += selfRolesResult.count
    
    // 2. Delete performances from documentaries
    console.log('\n📺 Cleaning documentaries...')
    const documentaryResult = await prisma.performance.deleteMany({
      where: {
        movie: { 
          title: { 
            contains: 'documentary', 
            mode: 'insensitive' 
          } 
        }
      }
    })
    console.log(`   Deleted ${documentaryResult.count} performances from documentaries`)
    totalDeleted += documentaryResult.count
    
    // 3. Delete performances from "making of" titles
    console.log('\n🎬 Cleaning "making of" titles...')
    const makingOfResult = await prisma.performance.deleteMany({
      where: {
        movie: { 
          title: { 
            contains: 'making of', 
            mode: 'insensitive' 
          } 
        }
      }
    })
    console.log(`   Deleted ${makingOfResult.count} performances from "making of" titles`)
    totalDeleted += makingOfResult.count
    
    // 4. Delete performances from "behind the scenes" titles
    console.log('\n🎥 Cleaning "behind the scenes" titles...')
    const behindScenesResult = await prisma.performance.deleteMany({
      where: {
        movie: { 
          title: { 
            contains: 'behind the scenes', 
            mode: 'insensitive' 
          } 
        }
      }
    })
    console.log(`   Deleted ${behindScenesResult.count} performances from "behind the scenes" titles`)
    totalDeleted += behindScenesResult.count
    
    // 5. Delete performances from "TV special" titles
    console.log('\n📺 Cleaning "TV special" titles...')
    const tvSpecialResult = await prisma.performance.deleteMany({
      where: {
        movie: { 
          title: { 
            contains: 'tv special', 
            mode: 'insensitive' 
          } 
        }
      }
    })
    console.log(`   Deleted ${tvSpecialResult.count} performances from "TV special" titles`)
    totalDeleted += tvSpecialResult.count
    
    // 6. Delete performances from "short" titles
    console.log('\n🎞️ Cleaning "short" titles...')
    const shortResult = await prisma.performance.deleteMany({
      where: {
        movie: { 
          title: { 
            contains: 'short', 
            mode: 'insensitive' 
          } 
        }
      }
    })
    console.log(`   Deleted ${shortResult.count} performances from "short" titles`)
    totalDeleted += shortResult.count
    
    // 7. Delete performances from future movies (year > current year)
    const currentYear = new Date().getFullYear()
    console.log(`\n🔮 Cleaning future releases (year > ${currentYear})...`)
    const futureResult = await prisma.performance.deleteMany({
      where: {
        movie: { 
          year: { 
            gt: currentYear 
          } 
        }
      }
    })
    console.log(`   Deleted ${futureResult.count} performances from future releases`)
    totalDeleted += futureResult.count
    
    // Get final count
    const finalCount = await prisma.performance.count()
    
    console.log('\n✅ Cleanup completed!')
    console.log('\n📊 Summary:')
    console.log(`   Initial performances: ${initialCount}`)
    console.log(`   Total deleted: ${totalDeleted}`)
    console.log(`   Remaining performances: ${finalCount}`)
    console.log(`   Verification: ${initialCount - totalDeleted === finalCount ? '✅ Count matches' : '❌ Count mismatch!'}`)
    
    // Additional breakdown
    console.log('\n📋 Deletion breakdown:')
    console.log(`   • "Self" roles: ${selfRolesResult.count}`)
    console.log(`   • Documentaries: ${documentaryResult.count}`)
    console.log(`   • "Making of": ${makingOfResult.count}`)
    console.log(`   • "Behind the scenes": ${behindScenesResult.count}`)
    console.log(`   • "TV special": ${tvSpecialResult.count}`)
    console.log(`   • "Short" titles: ${shortResult.count}`)
    console.log(`   • Future releases: ${futureResult.count}`)
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
