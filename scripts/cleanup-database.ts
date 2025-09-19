import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()

type MergeSummary = {
	duplicateGroupsMerged: number
	reassignedPerformances: number
	charactersFixed: number
	groupLogs: string[]
}

async function mergeDuplicateMovies(): Promise<{ groupsMerged: number; reassigned: number; groupLogs: string[] }> {
	let groupsProcessed = 0
	let totalReassigned = 0
	const groupLogs: string[] = []

	// Build normalized groups: lowercased, trimmed, and single-spaced titles grouped by year
	const groups = await prisma.$queryRaw<{
		normalizedTitle: string
		year: number
		count: bigint
	}[]>`
		SELECT
			lower(trim(regexp_replace("title", '\\s+', ' ', 'g'))) AS "normalizedTitle",
			"year",
			COUNT(*)::bigint AS count
		FROM "Movie"
		GROUP BY 1, 2
		HAVING COUNT(*) > 1
	`

	for (const group of groups) {
		// Load all movies that belong to this normalized group
		const movies = await prisma.$queryRaw<{
			id: string
			title: string
			year: number
			tmdbId: number | null
		}[]>`
			SELECT "id", "title", "year", "tmdbId"
			FROM "Movie"
			WHERE lower(trim(regexp_replace("title", '\\s+', ' ', 'g'))) = ${group.normalizedTitle}
			AND "year" = ${group.year}
			ORDER BY "id" ASC
		`

		if (!movies || movies.length <= 1) continue

		// Pick main movie: prefer non-null tmdbId, else lowest id (already sorted)
		const movieWithTmdb = movies.find((m) => m.tmdbId !== null)
		const mainMovie = movieWithTmdb ?? movies[0]
		const duplicates = movies.filter((m) => m.id !== mainMovie.id)

		await prisma.$transaction(async (tx) => {
			let reassignedCountLocal = 0

			for (const dup of duplicates) {
				// Handle potential unique collisions for performances
				const collisions = await tx.performance.findMany({
					where: { movieId: dup.id },
					select: { id: true, userId: true, actorId: true },
				})

				for (const perf of collisions) {
					const exists = await tx.performance.findUnique({
						where: {
							userId_actorId_movieId: {
								userId: perf.userId,
								actorId: perf.actorId,
								movieId: mainMovie.id,
							},
						},
					})
					if (exists) {
						await tx.performance.delete({ where: { id: perf.id } })
					}
				}

				const updatePerf = await tx.performance.updateMany({
					where: { movieId: dup.id },
					data: { movieId: mainMovie.id },
				})
				reassignedCountLocal += updatePerf.count

				// Handle ratings collisions similarly (to avoid cascade deletions)
				const ratingCollisions = await tx.rating.findMany({
					where: { movieId: dup.id },
					select: { id: true, userId: true, actorId: true },
				})
				for (const rating of ratingCollisions) {
					const exists = await tx.rating.findUnique({
						where: {
							userId_actorId_movieId: {
								userId: rating.userId,
								actorId: rating.actorId,
								movieId: mainMovie.id,
							},
						},
					})
					if (exists) {
						await tx.rating.delete({ where: { id: rating.id } })
					}
				}
				await tx.rating.updateMany({ where: { movieId: dup.id }, data: { movieId: mainMovie.id } })

				await tx.movie.delete({ where: { id: dup.id } })
			}

			// Done for this group
			totalReassigned += reassignedCountLocal
		})

		groupsProcessed += 1
		const beforeCount = movies.length
		groupLogs.push(`"${mainMovie.title}" (${mainMovie.year}): merged ${beforeCount} → 1`)
	}

	return { groupsMerged: groupsProcessed, reassigned: totalReassigned, groupLogs }
}

async function fixUnknownCharacters(): Promise<number> {
	// The current schema does not define a character/role field on Performance.
	// However, the request asks to set empty/null character to "Unknown" if present.
	// We'll attempt a best-effort raw SQL update guarded by checking column existence.

	// Check column existence in Postgres catalog
	const columnExists = await prisma.$queryRaw<{ exists: boolean }[]>`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_name = 'Performance'
			  AND column_name = 'character'
		) AS exists
	`

	if (!columnExists?.[0]?.exists) {
		return 0
	}

	// Perform the update and return affected row count
	const result = await prisma.$executeRawUnsafe(
		`UPDATE "Performance" SET "character" = 'Unknown' WHERE "character" IS NULL OR trim("character") = ''`
	)
	return typeof result === "number" ? result : 0
}

async function main() {
	const summary: MergeSummary = {
		duplicateGroupsMerged: 0,
		reassignedPerformances: 0,
		charactersFixed: 0,
		groupLogs: [],
	}

	try {
		console.log("🧹 Starting database cleanup...")

		// Merge duplicates with transactional safety using normalized titles
		const { groupsMerged, reassigned, groupLogs } = await mergeDuplicateMovies()
		summary.duplicateGroupsMerged = groupsMerged
		summary.reassignedPerformances = reassigned
		summary.groupLogs = groupLogs

		// Fix character field if present
		summary.charactersFixed = await fixUnknownCharacters()

		console.log("✅ Cleanup completed.")
		console.log("\nSummary:")
		console.log(`  • Duplicate groups merged: ${summary.duplicateGroupsMerged}`)
		console.log(`  • Performances reassigned: ${summary.reassignedPerformances}`)
		console.log(`  • Characters fixed: ${summary.charactersFixed}`)
		if (summary.groupLogs.length > 0) {
			console.log("\nMerges:")
			for (const line of summary.groupLogs) {
				console.log(`  - ${line}`)
			}
		}
	} catch (error) {
		console.error("❌ Cleanup failed:", error)
		process.exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
}

main()


