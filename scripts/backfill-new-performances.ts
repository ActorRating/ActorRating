import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BATCH_SIZE = 100

async function main() {
	let updatedFromRatings = 0
	let setUnknown = 0

	try {
		const emptyChars = await prisma.performance.findMany({
			where: {
				OR: [
					{ character: null },
					{ character: '' },
					{ character: 'Unknown' },
				],
			},
			select: { id: true, actorId: true, movieId: true },
		})

		for (let i = 0; i < emptyChars.length; i += BATCH_SIZE) {
			const batch = emptyChars.slice(i, i + BATCH_SIZE)
			await prisma.$transaction(async (tx) => {
				for (const perf of batch) {
					const role = await tx.rating.groupBy({
						by: ['roleName'],
						where: {
							actorId: perf.actorId,
							movieId: perf.movieId,
							NOT: { roleName: null },
						},
						_count: { roleName: true },
						orderBy: { _count: { roleName: 'desc' } },
						take: 1,
					})

					const newCharacter = role.length && role[0].roleName && role[0].roleName.trim().length > 0
						? role[0].roleName!
						: 'Unknown'

					await tx.performance.update({
						where: { id: perf.id },
						data: { character: newCharacter },
					})

					if (newCharacter !== 'Unknown') updatedFromRatings += 1
					else setUnknown += 1
				}
			})
		}

		console.log('Backfill (groupBy) complete.')
		console.log(`  • Performances updated with role from ratings: ${updatedFromRatings}`)
		console.log(`  • Performances set to "Unknown": ${setUnknown}`)
	} catch (e) {
		console.error('Backfill failed:', e)
		process.exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
}

main()





