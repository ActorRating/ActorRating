import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function reportGoodfellas(): Promise<void> {
	const movie = await prisma.movie.findFirst({ where: { title: 'Goodfellas', year: 1990 } })
	if (!movie) {
		console.log('Goodfellas (1990) not found')
		return
	}
	const ratings = await prisma.rating.findMany({
		where: { movieId: movie.id },
		select: { actorId: true, roleName: true },
	})
	const total = ratings.length
	const empty = ratings.filter((r) => !r.roleName || r.roleName.trim().length === 0).length
	const byActor = new Map<string, Set<string>>()
	for (const r of ratings) {
		const set = byActor.get(r.actorId) ?? new Set<string>()
		const name = (r.roleName || '').trim()
		if (name) set.add(name)
		byActor.set(r.actorId, set)
	}
	console.log('Goodfellas (1990) ratings:', total)
	console.log('Goodfellas non-empty roleName by actorId:')
	for (const [actorId, set] of byActor.entries()) {
		if (set.size > 0) console.log(`  ${actorId}: ${Array.from(set).join(', ')}`)
	}
	console.log('Goodfellas empty/NULL roleName count:', empty)
}

async function reportAnthonyHopkins(): Promise<void> {
	const actor = await prisma.actor.findFirst({ where: { name: 'Anthony Hopkins' } })
	if (!actor) {
		console.log('Anthony Hopkins not found')
		return
	}
	const ratings = await prisma.rating.findMany({
		where: { actorId: actor.id },
		select: { movieId: true, roleName: true },
	})
	const total = ratings.length
	const empty = ratings.filter((r) => !r.roleName || r.roleName.trim().length === 0).length
	const byMovie = new Map<string, Set<string>>()
	for (const r of ratings) {
		const set = byMovie.get(r.movieId) ?? new Set<string>()
		const name = (r.roleName || '').trim()
		if (name) set.add(name)
		byMovie.set(r.movieId, set)
	}
	console.log('Anthony Hopkins ratings:', total)
	console.log('Anthony Hopkins non-empty roleName by movieId:')
	for (const [movieId, set] of byMovie.entries()) {
		if (set.size > 0) console.log(`  ${movieId}: ${Array.from(set).join(', ')}`)
	}
	console.log('Anthony Hopkins empty/NULL roleName count:', empty)
}

async function main() {
	try {
		await reportGoodfellas()
		await reportAnthonyHopkins()
	} catch (e) {
		console.error(e)
		process.exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
}

main()




