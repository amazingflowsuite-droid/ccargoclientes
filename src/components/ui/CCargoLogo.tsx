import React from "react";

interface CCargoLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  hideSubtitleOnMobile?: boolean;
  subtitleText?: string;
}

/**
 * Logotipo Oficial da CCargo Transportes (`/logo-ccargo.webp`)
 */
export const CCargoLogo: React.FC<CCargoLogoProps> = ({
  className = "",
  size = "md",
  showSubtitle = true,
  hideSubtitleOnMobile = false,
  subtitleText = "Prospecção",
}) => {
  const height = {
    sm: 36,
    md: 44,
    lg: 56,
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src="/logo-ccargo.webp"
        alt="CCargo Transportes"
        style={{ height }}
        className="w-auto object-contain flex-shrink-0"
      />

      {showSubtitle && (
        <div
          className={`border-l border-[#D6D3D1] pl-2.5 flex-col justify-center ${
            hideSubtitleOnMobile ? "hidden sm:flex" : "flex"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#0D9488] leading-tight">
            {subtitleText}
          </span>
          <span className="text-[10px] text-[#78716C] leading-tight">
            CRM Comercial
          </span>
        </div>
      )}
    </div>
  );
};

