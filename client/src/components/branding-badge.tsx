import { Badge } from "@/components/ui/badge";
import clinoLogoPath from "@assets/clino-logo.png";

export function BrandingBadge() {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <a 
        href="https://www.clinohealthinnovation.com/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="focus:outline-none"
        aria-label="Visit Clino Health Innovation website"
        data-testid="link-clino-badge"
      >
        <Badge 
          variant="secondary" 
          className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg text-gray-600 px-6 py-3 rounded-full text-base font-medium hover:bg-white/95 transition-all duration-200 cursor-pointer"
        >
          <span className="text-gray-500 mr-4">Powered by</span>
          <img 
            src={clinoLogoPath} 
            alt="Clino Health" 
            className="h-8 w-auto object-contain"
          />
        </Badge>
      </a>
    </div>
  );
}