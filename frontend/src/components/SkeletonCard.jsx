/* ─── Skeleton building blocks ─── */
const Pulse = ({ className = '', style = {} }) => (
  <div className={`bg-[#1e1e1e] rounded-lg animate-pulse ${className}`} style={style} />
);

/* Card-shaped skeleton matching GameCard dimensions */
export const SkeletonCard = ({ isGrid = false }) => (
  <div className={isGrid ? 'w-full' : 'flex-shrink-0'} style={isGrid ? {} : { width: 'clamp(130px, 16vw, 185px)' }}>
    <Pulse className="aspect-[2/3] rounded-lg" />
    <div className="mt-4 px-0.5 space-y-2">
      <Pulse className="h-2.5 w-16" />
      <Pulse className="h-3.5 w-full" />
    </div>
  </div>
);

/* Hero banner skeleton */
export const SkeletonHero = () => (
  <div className="rounded-xl overflow-hidden mt-8 sm:mt-10">
    <Pulse style={{ aspectRatio: '16/7' }} className="rounded-xl" />
  </div>
);

/* Chart section skeleton */
export const SkeletonChart = () => (
  <Pulse className="rounded-2xl border border-[#222] h-[380px] sm:h-[420px]" />
);

/* Surge row skeleton */
export const SkeletonSurgeRow = () => (
  <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3 sm:p-4 border border-[#222]">
    <Pulse className="w-12 h-16 sm:w-14 sm:h-[72px] rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Pulse className="h-3.5 w-3/4" />
      <Pulse className="h-2.5 w-1/3" />
      <Pulse className="h-3 w-1/2" />
    </div>
    <div className="space-y-2 text-right">
      <Pulse className="h-4 w-16 ml-auto" />
      <Pulse className="h-2.5 w-12 ml-auto" />
    </div>
  </div>
);

/* Platform analytics card skeleton */
export const SkeletonPlatformCard = () => (
  <Pulse className="rounded-2xl border border-[#222] h-[220px]" />
);

/* Full-page details skeleton */
export const SkeletonGameDetails = () => (
  <div className="min-h-screen bg-[#0d0d0d]">
    {/* Hero skeleton */}
    <div className="relative overflow-hidden" style={{ minHeight: '420px' }}>
      <Pulse className="absolute inset-0 h-[420px] sm:h-[480px] rounded-none" />
      <div className="relative z-10 container-wide pt-20 pb-8">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
          <Pulse className="w-[180px] sm:w-[200px] lg:w-[220px] aspect-[2/3] rounded-xl mx-auto sm:mx-0" />
          <div className="flex-1 space-y-4 pt-4">
            <div className="flex gap-2">
              <Pulse className="h-5 w-14 rounded-full" />
              <Pulse className="h-5 w-16 rounded-full" />
              <Pulse className="h-5 w-12 rounded-full" />
            </div>
            <Pulse className="h-10 w-3/4" />
            <Pulse className="h-4 w-1/2" />
            <div className="flex gap-4 mt-4">
              <Pulse className="h-12 w-24 rounded-xl" />
              <Pulse className="h-12 w-36 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Content skeletons */}
    <div className="container-wide pb-16" style={{ paddingTop: '48px' }}>
      <Pulse className="rounded-2xl border border-[#222] h-24" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ marginTop: '60px' }}>
        <Pulse className="lg:col-span-2 rounded-2xl border border-[#222] h-[380px]" />
        <Pulse className="rounded-2xl border border-[#222] h-[380px]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ marginTop: '60px' }}>
        <SkeletonPlatformCard />
        <SkeletonPlatformCard />
        <SkeletonPlatformCard />
      </div>
    </div>
  </div>
);

export default SkeletonCard;
