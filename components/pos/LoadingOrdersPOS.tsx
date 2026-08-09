export default function LoadingOrdersPOS() {
    /* Skeleton while orders are streaming in */
    return <div className="space-y-3 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
            <div
                key={i}
                className="h-12 rounded-xl bg-card-light/60 animate-pulse"
                style={{ opacity: 1 - i * 0.2 }}
            />
        ))}
    </div>
}