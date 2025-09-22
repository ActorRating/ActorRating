import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeTitle(s: string): string {
	return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

async function main() {
	try {
		const movies = await prisma.movie.findMany({ select: { id: true, title: true, year: true } })
		const matches = movies.filter((m) => normalizeTitle(m.title) === 'goodfellas')
		if (matches.length === 0) {
			console.log('No movies with normalized title "goodfellas" found.')
		} else {
			console.log('Movies with normalized title "goodfellas":')
			for (const m of matches) {
				console.log(`  ${m.id}  ${m.title} (${m.year})`)
			}
		}
	} catch (e) {
		console.error(e)
		process.exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
}

main()





