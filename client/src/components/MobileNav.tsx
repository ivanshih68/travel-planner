import { Compass, LogOut, Plus } from "lucide-react";

interface MobileNavProps {
  activeTab: "trips" | "profile";
  onTabChange: (tab: "trips" | "profile") => void;
  onAddClick: () => void;
  onLogout: () => void;
}

export function MobileNav({ activeTab, onTabChange, onAddClick, onLogout }: MobileNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex items-center py-2 px-6 shadow-lg pb-safe">
      <button 
        onClick={() => onTabChange("trips")} 
        className={`flex-1 flex flex-col items-center gap-1 transition-colors ${
          activeTab === "trips" ? "text-[oklch(0.22_0.08_220)]" : "text-gray-400"
        }`}
      >
        <Compass className="w-6 h-6" />
        <span className="text-[10px] font-bold">行程</span>
      </button>

      {/* Middle Add Button */}
      <div className="flex-1 flex justify-center">
        <button
          onClick={onAddClick}
          className="w-12 h-12 rounded-full bg-[oklch(0.62_0.12_220)] text-white flex items-center justify-center shadow-lg -translate-y-4 active:scale-90 transition-transform"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <button 
        onClick={onLogout} 
        className="flex-1 flex flex-col items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
      >
        <LogOut className="w-6 h-6" />
        <span className="text-[10px] font-bold">登出</span>
      </button>
    </nav>
  );
}
