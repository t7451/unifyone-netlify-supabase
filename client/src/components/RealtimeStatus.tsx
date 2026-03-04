import { isRealtimeEnabled } from "@/lib/supabaseRealtime";
import { Wifi, WifiOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Small indicator shown in the dashboard header to communicate
 * whether Supabase Realtime is active.
 */
export function RealtimeStatus() {
  if (isRealtimeEnabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 cursor-default">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">Live</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-[#0F172A] border-white/10 text-white text-xs">
          Supabase Realtime connected — orders and inventory update live
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 cursor-default">
          <WifiOff className="w-3 h-3" />
          <span className="hidden sm:inline">Polling</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-[#0F172A] border-white/10 text-white text-xs max-w-[220px]">
        Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to enable live updates
      </TooltipContent>
    </Tooltip>
  );
}
