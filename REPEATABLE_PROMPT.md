# REPEATABLE PROMPT FOR MODULE REFACTORING

Use this prompt every time you need to refactor an HTML module with standardized header/footer:

---

**Refactor the following HTML into a standardized Clinical Reference module:**

[PASTE YOUR HTML HERE]

**Module Name:** [e.g., "Apomorphine", "BPC-157", "NAD+"]

**Instructions:**
1. Replace the header with the standardized header structure (back arrow + "M" logo + module name + "Clinical Reference" subtitle)
2. Replace the footer with the standardized legal disclaimer footer
3. Normalize all colors to the Cyber-Clinical design system:
   - Background: #050505 (black), #0f0f11 (charcoal), #18181b (surface)
   - Borders: #27272a (border), rgba(59, 130, 246, 0.2) (blue border for glass panels)
   - Accents: #3b82f6 (blue), #10b981 (green), #00d4ff (neon blue), #00ffa3 (neon green)
   - Text: #e4e4e7 (main text), #a1a1aa (muted text)
4. Keep ALL existing content, structure, JavaScript functionality, and charts intact
5. Ensure Tailwind CSS, Chart.js, and Google Fonts (Inter + Rajdhani) are loaded via CDN
6. Output a single, complete .html file ready to use

**Critical Rules:**
- Do NOT change the main content structure or layout
- Do NOT modify any existing JavaScript functionality
- Do NOT remove or alter interactive elements (tabs, charts, calculators, etc.)
- Do NOT convert to React, TSX, or any framework
- ONLY modify: header, footer, and color values

**Output filename:** [module-name].html

---

# STANDARDIZED HEADER STRUCTURE
```html
<header class="flex items-center gap-4 border-b border-brand-border/50 pb-4 mb-8">
    <!-- Back Button -->
    <a href="index.html" class="text-brand-muted hover:text-brand-blue transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
    </a>
    
    <!-- Logo -->
    <div class="w-12 h-12 bg-brand-surface border border-brand-blue flex items-center justify-center rounded shadow-[0_0_10px_rgba(59,130,246,0.3)]">
        <span class="font-mono font-bold text-brand-neonGreen text-lg">M</span>
    </div>
    
    <!-- Module Title -->
    <div>
        <h1 class="font-mono text-2xl md:text-3xl font-bold tracking-wider text-white uppercase">
            [MODULE NAME]
        </h1>
        <p class="text-brand-muted text-xs tracking-[0.15em] font-mono uppercase">Clinical Reference</p>
    </div>
</header>
```

# STANDARDIZED FOOTER STRUCTURE
```html
<footer class="mt-12 pt-8 border-t border-brand-border/30">
    <!-- Legal Disclaimer -->
    <div class="bg-brand-charcoal/50 border border-brand-border rounded-lg p-6 mb-6">
        <div class="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-brand-muted flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
                <p class="text-xs text-brand-text leading-relaxed">
                    <span class="text-white font-bold">LEGAL DISCLAIMER:</span> This platform is a <span class="text-white font-semibold">clinical reference tool</span> designed to summarize available research literature and pharmacological data for educational purposes. It is <span class="text-red-400 font-bold">NOT</span> a dosing guide, prescriptive engine, or substitute for professional medical training. All protocols, calculations, and visualizations are theoretical and based on off-label observations. Licensed healthcare providers must exercise independent clinical judgment and verify all information against primary literature and local regulations.
                </p>
                <p class="text-[10px] text-brand-muted mt-3 tracking-wide uppercase">
                    Secure Clinical Environment | HIPAA Compliant | Authorized Personnel Only
                </p>
            </div>
        </div>
    </div>
    
    <!-- Copyright -->
    <div class="flex flex-col md:flex-row justify-between items-center text-[10px] text-brand-muted font-mono uppercase">
        <div>Multifactor Solutions &copy; 2024</div>
        <div class="mt-2 md:mt-0 flex items-center">
            <span class="w-2 h-2 rounded-full bg-brand-blue mr-2"></span>
            For Clinical Educational Use Only.
        </div>
    </div>
</footer>
```

# COLOR NORMALIZATION REFERENCE

Replace any colors in the HTML with these standardized values:

**Backgrounds:**
- Deep Black: `#050505` or `bg-[#050505]`
- Charcoal: `#0f0f11` or `bg-[#0f0f11]`
- Surface: `#18181b` or `bg-[#18181b]`

**Borders:**
- Subtle: `#27272a` or `border-[#27272a]`
- Blue Accent: `rgba(59, 130, 246, 0.2)` or `border-brand-blue/20`

**Text:**
- Primary: `#e4e4e7` or `text-brand-text`
- Muted: `#a1a1aa` or `text-brand-muted`
- White: `#ffffff` or `text-white`

**Accents:**
- Blue (Primary): `#3b82f6` or `text-brand-blue`
- Neon Blue: `#00d4ff` or `text-brand-neonBlue`
- Green: `#10b981` or `text-brand-green`
- Neon Green: `#00ffa3` or `text-brand-neonGreen`
- Red (Warnings): `#ef4444` or `text-red-400`

---

# EXAMPLE USAGE

**Input:**
```
**Refactor the following HTML into a standardized Clinical Reference module:**

[paste your module HTML]

**Module Name:** BPC-157
```

**Expected Output:**
A complete .html file with:
✅ Standardized header (back arrow + M logo + "BPC-157" title)
✅ Standardized footer (legal disclaimer)
✅ Normalized colors
✅ All original content preserved
✅ All interactive features working
