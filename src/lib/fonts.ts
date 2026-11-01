import { DM_Sans, Lora, Montserrat, Space_Grotesk } from "next/font/google";

const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

/** Class names that define every CV font variable; applied once on <html>. */
export const cvFontVariables = [montserrat, spaceGrotesk, dmSans, lora].map((f) => f.variable).join(" ");
