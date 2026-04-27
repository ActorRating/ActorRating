import type { AdminGrowthPoint } from "@/lib/admin/getAdminData"

type GrowthChartProps = {
  data: AdminGrowthPoint[]
}

export default function GrowthChart({ data }: GrowthChartProps) {
  const maxValue = Math.max(...data.map((item) => item.count), 1)

  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Ratings Growth (Last 7 Days)</h2>
      <div className="mt-5 grid grid-cols-7 gap-3">
        {data.map((item) => {
          const height = Math.max((item.count / maxValue) * 100, item.count > 0 ? 8 : 2)
          return (
            <div key={item.date} className="flex flex-col items-center gap-2">
              <div className="text-xs text-muted-foreground">{item.count}</div>
              <div className="flex h-28 w-full items-end rounded-md bg-background/70 p-1">
                <div
                  className="w-full rounded-sm bg-primary/80"
                  style={{ height: `${height}%` }}
                  aria-label={`${item.date}: ${item.count} ratings`}
                />
              </div>
              <div className="text-xs text-muted-foreground">{item.date}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
