import React from "react";

interface CCargoLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  subtitleText?: string;
}

/**
 * Logotipo Oficial Vetorial da CCargo Transportes
 * Reconstrução fiel em SVG de alta definição (fundo 100% transparente)
 * baseada na marca oficial enviada (emblema hexagonal vermelho com 'C' branco + tipografia Cargo Transportes).
 */
export const CCargoLogo: React.FC<CCargoLogoProps> = ({
  className = "",
  size = "md",
  showSubtitle = true,
  subtitleText = "Prospecção",
}) => {
  const dimensions = {
    sm: { width: 135, height: 38 },
    md: { width: 160, height: 44 },
    lg: { width: 200, height: 56 },
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 260 76"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="CCargo Transportes"
        className="flex-shrink-0"
      >
        {/* Emblema Hexagonal Arredondado Vermelho CCargo */}
        <path
          d="M27.5 4.5C31.2 2.3 35.8 2.3 39.5 4.5L60.2 16.5C63.9 18.7 66.2 22.6 66.2 26.9V50.9C66.2 55.2 63.9 59.1 60.2 61.3L39.5 73.3C35.8 75.5 31.2 75.5 27.5 73.3L6.8 61.3C3.1 59.1 0.8 55.2 0.8 50.9V26.9C0.8 22.6 3.1 18.7 6.8 16.5L27.5 4.5Z"
          fill="#C81E1E"
        />
        {/* Brilho sutil interno da borda do hexágono */}
        <path
          d="M28.5 7.5C31.6 5.7 35.4 5.7 38.5 7.5L57.2 18.3C60.3 20.1 62.2 23.4 62.2 27V48.8C62.2 52.4 60.3 55.7 57.2 57.5L38.5 68.3C35.4 70.1 31.6 70.1 28.5 68.3L9.8 57.5C6.7 55.7 4.8 52.4 4.8 48.8V27C4.8 23.4 6.7 20.1 9.8 18.3L28.5 7.5Z"
          stroke="#EF4444"
          strokeWidth="1.2"
          strokeOpacity="0.45"
        />
        {/* Letra 'C' Branca Estilizada Speed/Cargo no Centro do Hexágono */}
        <path
          d="M49.5 25.5H28.2C22.8 25.5 19.2 28.8 18.1 34.1L16.4 42.5C15.3 47.8 18.2 51.5 23.6 51.5H45.8L47.8 42.2H27.8C25.8 42.2 24.8 41.1 25.2 39.1L25.9 35.8C26.3 33.8 27.6 32.8 29.6 32.8H48.0L49.5 25.5Z"
          fill="#FFFFFF"
        />

        {/* Tipografia 'Cargo' em Preto Itálico Pesado */}
        <text
          x="74"
          y="49"
          fill="#111827"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="43"
          letterSpacing="-1.5"
        >
          Cargo
        </text>

        {/* Subtítulo 'Transportes' alinhado sob Cargo */}
        <text
          x="78"
          y="67"
          fill="#4B5563"
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          fontWeight="600"
          fontStyle="italic"
          fontSize="14.5"
          letterSpacing="2.5"
        >
          Transportes
        </text>
      </svg>

      {showSubtitle && (
        <div className="border-l border-[#D6D3D1] pl-2.5 flex flex-col justify-center">
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

