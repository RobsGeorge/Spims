All UI must use our design system. 
Map the Stitch tokens in design-reference/DESIGN.md into tailwind.config + CSS variables in globals.css, and into the admin-editable Theme model — never hard-code colors. 
Use shadcn/ui primitives from components/ui. 
Spacing/typography/radius come from tokens only. 
Every screen is mobile-first responsive (sidebar → drawer, tables → cards) and must work in RTL using Tailwind logical utilities (ps/pe/ms/me/start/end). 
Add tasteful hover/focus states and subtle Framer Motion. 
Do not change API routes, data fetching, or business logic — only the presentational layer.