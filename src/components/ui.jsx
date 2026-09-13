import React from "react";

export const PageContainer = ({ children }) => (
  <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">{children}</div>
);

export const PageHeading = ({ title, subtitle, actions }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
    <div>
      <h1 className="text-heading-sm sm:text-heading font-medium text-charcoal tracking-tight">
        {title}
      </h1>
      {subtitle && <p className="text-body text-fog mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const Card = ({ children, className = "" }) => (
  <div className={`bg-canvas border border-ash rounded-xl ${className}`}>{children}</div>
);

export const SectionCard = ({ title, actions, children, bodyClassName = "p-4" }) => (
  <Card>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-ash">
        {title && <h2 className="text-body-lg font-medium text-charcoal">{title}</h2>}
        {actions}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </Card>
);

export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse bg-ash rounded ${className}`} />
);

export const StatTile = ({ label, value, icon: Icon, delta, loading }) => (
  <Card className="p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-caption font-medium text-fog uppercase tracking-wide">{label}</p>
        {loading ? (
          <Skeleton className="h-7 w-24 mt-2" />
        ) : (
          <p className="text-heading-sm font-semibold text-charcoal mt-1 truncate">{value}</p>
        )}
        {delta && !loading && (
          <p
            className={`text-caption font-medium mt-1 ${
              delta.direction === "up" ? "text-mint-fg" : "text-red-600"
            }`}
          >
            {delta.direction === "up" ? "↑" : "↓"} {delta.value} {delta.period}
          </p>
        )}
      </div>
      {Icon && <Icon className="text-silver text-xl shrink-0" />}
    </div>
  </Card>
);

export const EmptyState = ({ title, hint }) => (
  <div className="py-12 text-center">
    <p className="text-body font-medium text-charcoal">{title}</p>
    {hint && <p className="text-body text-fog mt-1">{hint}</p>}
  </div>
);

export const ChartFrame = ({ loading, hasData, emptyTitle, emptyHint, children }) => {
  if (loading) return <Skeleton className="h-[260px] w-full" />;
  if (!hasData) return <EmptyState title={emptyTitle} hint={emptyHint} />;
  return <div className="h-[260px]">{children}</div>;
};
