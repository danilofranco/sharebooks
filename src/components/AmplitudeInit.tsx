 "use client";
 import { useEffect } from "react";
 import { initAmplitude } from "@/lib/analytics/client";

 export default function AmplitudeInit() {
   useEffect(() => {
     // Inicializa amplitude com NEXT_PUBLIC_AMPLITUDE_API_KEY automático
     initAmplitude().catch(() => {
       // falha silenciosa para não quebrar a aplicação
     });
   }, []);

   return null;
 }

