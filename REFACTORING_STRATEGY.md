# REFACTORING STRATEGY GUIDE
## Tips for Efficiently Processing Your 20 Modules

---

## 🎯 RECOMMENDED WORKFLOW

### 1. **Batch Similar Modules Together**
Process modules in logical groups to maintain consistency:

**Group 1: Growth Hormone Axis** (CJC-1295, Ipamorelin, Tesamorelin, Sermorelin, Combo Stack)
- These likely have similar structures (dosing protocols, PK charts, cycling info)
- Refactor one, then copy the pattern to others

**Group 2: Hormone Optimization** (Testosterone, hCG, Enclomiphene, Anastrozole)
- HRT modules probably share similar sections

**Group 3: Recovery** (BPC-157, TB-500)
- Injury protocols, loading phases

**Group 4: Metabolic** (SS-31, NAD+)
- Mitochondrial/energy focus

**Group 5: Sexual Health** (PT-141, Tadalafil, etc.)
- PDE5 inhibitors and CNS modulators

---

## ⚡ EFFICIENCY TIPS

### **For Modules with Similar Structure:**

1. **Refactor the FIRST one completely** (e.g., CJC-1295)
2. **Use it as a template** for the rest of that category
3. **Only change**:
   - Module name in header
   - Specific data (doses, half-lives, protocols)
   - Unique quirks/side effects
4. **Keep consistent**:
   - Section order
   - Color scheme
   - Chart styling
   - Card layouts

### **Red Flags to Watch For:**

When you paste HTML to me, I'll check for:
- ❌ Inconsistent color values → I'll normalize them
- ❌ Missing header/footer → I'll add standardized ones
- ❌ Broken chart/script references → I'll fix CDN links
- ❌ Non-matching fonts → I'll standardize to Inter + Rajdhani
- ❌ Duplicate IDs in JavaScript → I'll make them unique

---

## 🔧 WHAT I'LL DO FOR EACH MODULE

**Automatic Changes:**
1. ✅ Replace header with standardized version (back arrow + M logo + title)
2. ✅ Replace footer with legal disclaimer
3. ✅ Normalize all colors to Cyber-Clinical palette
4. ✅ Ensure proper CDN links (Tailwind, Chart.js, Fonts)
5. ✅ Fix any glassmorphism styling inconsistencies

**What I WON'T Touch:**
- ❌ Your content (text, descriptions, clinical data)
- ❌ Your JavaScript logic (charts, calculators, tabs)
- ❌ Your layout structure (grid, sections, cards)
- ❌ Your interactive elements (buttons, forms, etc.)

---

## 📝 SIMPLE PASTE FORMAT

For each module, just paste:

```
Module: [NAME]

[PASTE YOUR HTML HERE]
```

That's it! I'll handle the rest.

---

## 🚀 SPEED TIPS

### **If you have 5+ modules with IDENTICAL structure:**

Tell me: "These 5 modules all follow the same template. Here's the first one [paste]. The others just need these data points changed: [list what's different]."

I can then generate a template and show you how to quickly swap in different data.

### **If a module is SUPER SIMPLE:**

Tell me: "This one is just a single-page reference with no interactivity."

I'll give you a minimal refactor (faster).

### **If a module is COMPLEX:**

Tell me: "This one has multiple calculators, dynamic charts, and form inputs."

I'll be extra careful to preserve all functionality.

---

## 🎨 WHEN TO CONSIDER REDESIGN

If you encounter a module that:
- Looks drastically different from others
- Has poor UX or confusing layout
- Needs major content updates

**Don't refactor it yet.** Just flag it and we can redesign it properly after the quick wins.

---

## 📊 TRACKING YOUR PROGRESS

I recommend this order:

**Phase 1: Quick Wins** (5 meds, ~30 min)
→ Start with simple, similar modules (e.g., all GHRPs)

**Phase 2: Medium Complexity** (10 meds, ~1 hour)
→ HRT and recovery modules

**Phase 3: Complex/Unique** (5 meds, ~45 min)
→ Modules with heavy interactivity or unique layouts

**Total Time: ~2-3 hours for all 20 modules**

---

## 💾 GITHUB PAGES DEPLOYMENT CHECKLIST

Once all modules are refactored:

**File Structure:**
```
/
├── index.html (landing page)
├── cjc-1295.html
├── ipamorelin.html
├── tesamorelin.html
├── sermorelin.html
├── combo-stack.html
├── testosterone.html
├── hcg.html
├── enclomiphene.html
├── anastrozole.html
├── bpc-157.html
├── tb-500.html
├── ss-31.html
├── nad.html
├── pt-141.html
├── tadalafil.html
├── (... 5 more modules)
└── README.md (optional)
```

**Deploy Steps:**
1. Create GitHub repo
2. Upload all .html files to root
3. Enable GitHub Pages in Settings
4. Done! Share the URL

---

## 🎯 READY TO START?

Just paste your first module and say:
**"Module: [NAME]"**

I'll refactor it in ~30 seconds and you can review.

If you like it, keep the meds coming! 🚀
