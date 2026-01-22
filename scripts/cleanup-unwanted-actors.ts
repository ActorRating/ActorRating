import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Actors to remove from the database
const ACTORS_TO_REMOVE = [
  // Directors (Not Actors)
  "Christopher Nolan",
  "Michael Bay",
  "Tinto Brass",
  
  // Adult Performers (Reputational Risk)
  "Angela White",
  "Angelica Hart",
  "Dyessa Garcia",
  "AJ Raval",
  "Candy Veloso",
  "Jonica Lazo",
  "Chase Infiniti",
  "Azi Acosta",
  "Christine Bermas",
  "Jenn Rosa",
  "Apple Dy",
  "Shiena Yu",
  "Lucy Pinder", // glamour model
  
  // Ultra-Niche Japanese Actors/Voice Actors
  "Ai Kayano",
  "Asami Kanno",
  "Asuka Saito",
  "Aya Asahina",
  "Aya Yonekura",
  "Ayaka Miyoshi",
  "Ayame Misaki",
  "Chikako Aoyama",
  "Kaori Asô",
  "Mieko Harada",
  "Moemi Katayama",
  "Nao Saejima",
  "Rei Akasaka",
  "Rieko Miura",
  "Rika",
  "Saori Hayami",
  "Sora Amamiya",
  "Takehito Koyasu",
  "Yuria Hidaka",
  "Yuriko Yoshitaka",
  
  // Ultra-Niche Korean Actors
  "Baek Se-ri",
  "Cha Woo-min",
  "Han Seo-ah",
  "Han Seok-bong",
  "Han Yi-seul",
  "Hee-jeong",
  "Joo Ah",
  "Kang Eun-hye",
  "Kim Do-hee",
  "Kim Hee-jeong",
  "Kim Soo-ji",
  "Kim Sun-young",
  "Min Do-yoon",
  "Sung Yeon",
  "Tae Hee",
  "Yeon Woo",
  "Yoo Ji-hyun",
  "Yoon Yool",
  
  // Ultra-Niche Chinese Actors (without international crossover)
  "Bai Lu",
  "Chen Jianbin",
  "Chen Zheyuan",
  "Cheng Qingsong",
  "Ding Yuxi",
  "Fan Shiqi",
  "Fang Li",
  "Li Naiwen",
  "Li Peien",
  "Song Jia",
  "Song Yi",
  "Tian Xuning",
  "Wang Xingchen",
  "Xiao Shunyao",
  "Xiao Zhan",
  "Yang Mi",
  "Yu Menglong",
  "Zhang Li",
  "Zhao Lusi",
  "Zhou Shen",
  
  // Turkish actors (to be added later in a more focused way)
  "Büşra Develi",
  "Çağatay Ulusoy",
  "Ceren Benderlioğlu",
  "Hande Erçel",
  
  // Minor/Questionable Actors
  "Addison Rae", // TikToker with minimal filmography
  "Aliya Raymundo",
  "Abigail McGibbon",
  "Amalia Williamson",
  "Christopher Curry",
  "Dearbháille McKinney",
  "Emily Alatalo",
  "Hugo Eric Louis van Lawick",
  "Joey Morgan",
  "Joe Anders",
  "Joe Renton",
  "Joshua J. Parker",
  "Katrina Dovey",
  "Lakhder Boukhers",
  "Lakshya Lalwani",
  "Malachi Barton", // Child actor, Disney Channel
  "Megan Skiendiel",
  "Niamh McCormack",
  "Nikos Papadopoulos",
  "Paisley Cadorath",
  "Rafah Damrongchaitham",
  "Rishab Shetty",
  "Rosl Mayr",
  "S.S. Kanchi",
  "Shane Kerwin",
  "Shōji Sakai",
  "Sydney Topliffe",
  "Truman Hanks", // Tom Hanks' son with minimal credits
  "White Sugar",
  "Xavier Smalls",
  
  // Voice Actors Only (no live action)
  "Frank Welker",
  "Kevin Michael Richardson",
  
  // Additional Philippine adult content performers
  "Andrea Brillantes",
  "Alicia Falcó"
];

async function removeActor(actorName: string): Promise<boolean> {
  try {
    const actor = await prisma.actor.findFirst({
      where: { name: actorName }
    });
    
    if (!actor) {
      console.log(`  ⏭️  Actor not found (already removed): ${actorName}`);
      return false;
    }
    
    // Check if actor has any ratings or performances
    const ratingsCount = await prisma.rating.count({
      where: { actorId: actor.id }
    });
    
    const performancesCount = await prisma.performance.count({
      where: { actorId: actor.id }
    });
    
    // Delete the actor (cascade will handle related records)
    await prisma.actor.delete({
      where: { id: actor.id }
    });
    
    console.log(`  ✅ Removed: ${actorName} (${ratingsCount} ratings, ${performancesCount} performances deleted)`);
    return true;
  } catch (error) {
    console.error(`  ❌ Error removing ${actorName}:`, error);
    return false;
  }
}

async function main() {
  console.log('🧹 Starting Database Cleanup');
  console.log(`📋 Actors to remove: ${ACTORS_TO_REMOVE.length}\n`);
  
  const currentCount = await prisma.actor.count();
  console.log(`📊 Current actor count: ${currentCount}\n`);
  
  let removedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < ACTORS_TO_REMOVE.length; i++) {
    const actorName = ACTORS_TO_REMOVE[i];
    
    console.log(`[${i + 1}/${ACTORS_TO_REMOVE.length}] ${actorName}`);
    
    try {
      const removed = await removeActor(actorName);
      if (removed) {
        removedCount++;
      } else {
        notFoundCount++;
      }
    } catch (error) {
      console.error(`  💥 Fatal error removing ${actorName}:`, error);
      errorCount++;
    }
    
    // Progress update every 20 actors
    if ((i + 1) % 20 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${ACTORS_TO_REMOVE.length} processed`);
      console.log(`   ✅ Removed: ${removedCount} | ⏭️  Not found: ${notFoundCount} | ❌ Errors: ${errorCount}\n`);
    }
  }
  
  const finalCount = await prisma.actor.count();
  
  console.log('\n\n🎉 Cleanup Complete!');
  console.log(`📊 Stats:`);
  console.log(`   ✅ Actors removed: ${removedCount}`);
  console.log(`   ⏭️  Actors not found: ${notFoundCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`\n📈 Database:`);
  console.log(`   Before: ${currentCount} actors`);
  console.log(`   After: ${finalCount} actors`);
  console.log(`   Change: ${finalCount - currentCount} (${currentCount > finalCount ? '-' : '+'}${Math.abs(currentCount - finalCount)})`);
}

main()
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
