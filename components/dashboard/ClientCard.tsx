import { clsx } from "clsx"
import type { Client } from "~lib/types"
import { Card } from "~components/ui/Card"
import { DealStatusBadge } from "~components/ui/Badge"
import { ExternalLink, FileSpreadsheet } from "lucide-react"

interface ClientCardProps {
  client: Client
  className?: string
}

function formatCurrency(value?: number, currency = "USD"): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value)
}

export function ClientCard({ client, className }: ClientCardProps) {
  const spreadsheetUrl = client.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${client.spreadsheetId}`
    : null

  return (
    <Card
      hover={!!spreadsheetUrl}
      padding="md"
      className={clsx("animate-slide-up", className)}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: client info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-lpe-navy truncate">
              {client.name}
            </h3>
            <DealStatusBadge status={client.dealStatus} />
          </div>

          <p className="text-xs text-lpe-gray-dark truncate">{client.industry}</p>

          {client.estimatedValue != null && (
            <p className="mt-1.5 text-sm font-bold text-lpe-orange">
              {formatCurrency(client.estimatedValue, client.currency)}
            </p>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Spreadsheet"
              className="
                p-1.5 rounded-lg text-lpe-navy/60 hover:text-lpe-navy
                hover:bg-lpe-gray transition-colors duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lpe-orange
              "
            >
              <FileSpreadsheet size={15} />
            </a>
          )}
        </div>
      </div>

      {spreadsheetUrl && (
        <div className="mt-2.5 pt-2.5 border-t border-lpe-border flex items-center gap-1">
          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-lpe-blue hover:underline truncate"
          >
            <ExternalLink size={11} className="shrink-0" />
            <span className="truncate">Open in Google Sheets</span>
          </a>
          <span className="ml-auto text-[10px] text-lpe-gray-dark/50 shrink-0">
            {client.lastUpdated}
          </span>
        </div>
      )}
    </Card>
  )
}
