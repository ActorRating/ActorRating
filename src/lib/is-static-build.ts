/**
 * True while `next build` is generating the production bundle / prerendering.
 * Use to skip Prisma and other runtime-only I/O that can hang or fail in Docker build.
 */
export function isStaticProductionBuild(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.SKIP_BUILD_TIME_DB === '1'
  )
}
